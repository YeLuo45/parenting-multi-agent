/**
 * Cloud sync — peer-to-peer / cloud-push layer abstraction.
 *
 * Direction U5: Cloud Sync (Supabase/Firestore-style abstraction).
 *
 * Pure functions: queue, conflict resolution, ETag, optimistic updates.
 * No actual network call (caller passes transport).
 */

export type SyncOp = "put" | "patch" | "delete";

export interface SyncRecord {
	id: string;
	collection: string;
	op: SyncOp;
	payload: unknown;
	version: number;
	etag: string;
	createdAt: number;
	updatedAt: number;
	origin: "local" | "remote";
}

export interface ConflictRecord {
	id: string;
	collection: string;
	local: SyncRecord;
	remote: SyncRecord;
	resolution: "local" | "remote" | "merge";
	resolvedAt?: number;
	mergedPayload?: unknown;
}

export type TransportResult =
	| { ok: true; remote: SyncRecord }
	| { ok: false; error: string; code: number };

export interface Transport {
	put(rec: SyncRecord): Promise<TransportResult>;
	patch(rec: SyncRecord): Promise<TransportResult>;
	delete(id: string): Promise<TransportResult>;
	fetch(id: string): Promise<SyncRecord | null>;
}

export const SYNC_VERSION = 1;
export const MAX_CONFLICT_BACKLOG = 100;

/** Compute an ETag for a record payload. */
export function computeEtag(record: SyncRecord): string {
	const data = JSON.stringify({
		id: record.id,
		collection: record.collection,
		op: record.op,
		payload: record.payload,
		version: record.version,
	});
	// Simple hash; production should use crypto
	let h = 0;
	for (let i = 0; i < data.length; i++) {
		h = (h << 5) - h + data.charCodeAt(i);
		h |= 0;
	}
	return `e_${Math.abs(h).toString(36)}`;
}

/** Detect a conflict between two records (same id, different version). */
export function detectConflict(local: SyncRecord, remote: SyncRecord): boolean {
	if (local.id !== remote.id) return false;
	if (local.collection !== remote.collection) return false;
	// Same version = no conflict
	if (local.version === remote.version) return false;
	// Same etag = no conflict (content-identical despite version diff)
	if (local.etag === remote.etag) return false;
	return true;
}

/** Resolve a conflict (last-write-wins by default). */
export function resolveConflict(
	local: SyncRecord,
	remote: SyncRecord,
	strategy: "local-wins" | "remote-wins" | "manual" = "remote-wins",
): ConflictRecord {
	let resolution: ConflictRecord["resolution"];
	let mergedPayload: unknown = remote.payload;
	if (strategy === "local-wins") {
		resolution = "local";
		mergedPayload = local.payload;
	} else if (strategy === "remote-wins") {
		resolution = "remote";
		mergedPayload = remote.payload;
	} else {
		resolution = "merge";
		// Shallow merge: prefer remote keys, fall back to local
		mergedPayload = {
			...(local.payload as Record<string, unknown>),
			...(remote.payload as Record<string, unknown>),
		};
	}
	return {
		id: local.id,
		collection: local.collection,
		local,
		remote,
		resolution,
		resolvedAt: Date.now(),
		mergedPayload,
	};
}

/** Outbox queue — local pending writes awaiting transport. */
export class Outbox {
	private items: SyncRecord[] = [];
	private conflicts: ConflictRecord[] = [];

	enqueue(rec: SyncRecord): void {
		this.items.push(rec);
	}

	list(filter?: { collection?: string }): SyncRecord[] {
		if (!filter) return [...this.items];
		return this.items.filter((r) => r.collection === filter.collection);
	}

	take(n: number): SyncRecord[] {
		return this.items.splice(0, n);
	}

	size(): number {
		return this.items.length;
	}

	clear(): void {
		this.items = [];
	}

	addConflict(c: ConflictRecord): void {
		this.conflicts.push(c);
		if (this.conflicts.length > MAX_CONFLICT_BACKLOG) {
			this.conflicts.shift();
		}
	}

	conflictsList(): readonly ConflictRecord[] {
		return [...this.conflicts];
	}
}

/** Apply optimistic update to a record (local copy + version bump). */
export function applyOptimistic(
	rec: SyncRecord,
	op: SyncOp,
	payload: unknown,
): SyncRecord {
	const next: SyncRecord = {
		...rec,
		op,
		payload,
		version: rec.version + 1,
		updatedAt: Date.now(),
		origin: "local",
	};
	next.etag = computeEtag(next);
	return next;
}

/** Drain the outbox via transport, with retries on failure. */
export async function drainOutbox(
	outbox: Outbox,
	transport: Transport,
	batchSize = 10,
	maxRetries = 2,
): Promise<{ sent: number; failed: number; conflicts: number }> {
	let sent = 0;
	let failed = 0;
	let conflicts = 0;
	const batch = outbox.take(batchSize);
	for (const rec of batch) {
		let attempts = 0;
		let success = false;
		while (attempts <= maxRetries && !success) {
			attempts++;
			let r: TransportResult | undefined;
			if (rec.op === "put") r = await transport.put(rec);
			else if (rec.op === "patch") r = await transport.patch(rec);
			else r = await transport.delete(rec.id);
			if (r?.ok) {
				// Check for conflict
				const remote = await transport.fetch(rec.id);
				if (remote && detectConflict(rec, remote)) {
					const c = resolveConflict(rec, remote, "remote-wins");
					outbox.addConflict(c);
					conflicts++;
				}
				sent++;
				success = true;
			} else {
				if (attempts > maxRetries) failed++;
			}
		}
		if (!success) {
			// Re-queue for next attempt
			outbox.enqueue(rec);
		}
	}
	return { sent, failed, conflicts };
}

/** Create an in-memory transport for testing. */
export function createInMemoryTransport(initial: SyncRecord[] = []): {
	transport: Transport;
	store: Map<string, SyncRecord>;
} {
	const store = new Map<string, SyncRecord>();
	for (const r of initial) store.set(`${r.collection}:${r.id}`, r);
	const transport: Transport = {
		async put(rec) {
			const existing = store.get(`${rec.collection}:${rec.id}`);
			if (existing && detectConflict(existing, rec)) {
				return { ok: false, error: "etag mismatch", code: 412 };
			}
			store.set(`${rec.collection}:${rec.id}`, rec);
			return { ok: true, remote: rec };
		},
		async patch(rec) {
			const existing = store.get(`${rec.collection}:${rec.id}`);
			if (!existing) {
				return { ok: false, error: "not found", code: 404 };
			}
			if (existing.version > rec.version) {
				return { ok: false, error: "stale", code: 409 };
			}
			store.set(`${rec.collection}:${rec.id}`, rec);
			return { ok: true, remote: rec };
		},
		async delete(id) {
			const key = Array.from(store.keys()).find((k) =>
				k.endsWith(`:${id}`),
			);
			if (!key) return { ok: false, error: "not found", code: 404 };
			store.delete(key);
			return {
				ok: true,
				remote: {
					...Array.from(store.values())[0]!,
					id,
					op: "delete" as const,
				},
			};
		},
		async fetch(id) {
			for (const r of store.values()) {
				if (r.id === id) return r;
			}
			return null;
		},
	};
	return { transport, store };
}

export const CLOUD_SYNC_DISCLAIMER =
	"⚠️ 云同步需要服务端支持（Supabase/Firestore/S3）。本模块提供客户端抽象。";
