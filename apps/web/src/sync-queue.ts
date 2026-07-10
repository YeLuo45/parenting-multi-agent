/**
 * Cross-device sync queue — outbox + retry + lastSyncAt for parenting data.
 *
 * Direction F: bidirectional IDB ↔ localStorage sync layer with a queue
 * that tracks pending writes and replay-on-startup semantics.
 *
 * Design:
 * - SyncOutboxEntry: queued write {id, key, value, op, ts, attempts}
 * - SyncStatus: { lastSyncAt, pending, inFlight, failed }
 * - syncQueue(queue, sink): drains queue via async sink callback,
 *   increments attempts on failure, removes on success.
 * - mergeBidirectional(local, remote, conflictResolution): LWW / manual
 * - buildOutboxEntry / parseOutboxEntry: serialization helpers
 */

export type SyncOp = "put" | "delete";

export interface SyncOutboxEntry {
	id: string;
	key: string;
	value: unknown;
	op: SyncOp;
	ts: number;
	attempts: number;
	lastError?: string;
}

export interface SyncStatus {
	lastSyncAt: number | null;
	pending: number;
	inFlight: number;
	failed: number;
}

export type ConflictResolution = "local-wins" | "remote-wins" | "newer-wins";

export interface SinkResult {
	ok: boolean;
	error?: string;
}

/**
 * Add an entry to the queue (immutable append).
 */
export function appendEntry(
	queue: readonly SyncOutboxEntry[],
	entry: SyncOutboxEntry,
): SyncOutboxEntry[] {
	return [...queue, entry];
}

/**
 * Remove a successfully-applied entry by id.
 */
export function removeEntry(
	queue: readonly SyncOutboxEntry[],
	id: string,
): SyncOutboxEntry[] {
	return queue.filter((e) => e.id !== id);
}

/**
 * Increment attempts on a failed entry, recording the error.
 */
export function markFailure(
	queue: readonly SyncOutboxEntry[],
	id: string,
	error: string,
): SyncOutboxEntry[] {
	return queue.map((e) =>
		e.id === id ? { ...e, attempts: e.attempts + 1, lastError: error } : e,
	);
}

/**
 * Compute current sync status from queue + last sync timestamp.
 */
export function computeStatus(
	queue: readonly SyncOutboxEntry[],
	lastSyncAt: number | null,
	inFlightCount = 0,
): SyncStatus {
	return {
		lastSyncAt,
		pending: queue.length,
		inFlight: inFlightCount,
		failed: queue.filter((e) => e.attempts > 0 && e.lastError).length,
	};
}

/**
 * Drain the outbox by calling sink for each entry.
 * - On ok=true, entry is removed.
 * - On ok=false, attempts is incremented with the error message.
 *
 * Returns the new queue + lastSyncAt (updated to now if any succeeded).
 */
export async function syncQueue(
	queue: readonly SyncOutboxEntry[],
	sink: (entry: SyncOutboxEntry) => Promise<SinkResult>,
	now: number = Date.now(),
): Promise<{
	queue: SyncOutboxEntry[];
	lastSyncAt: number;
	succeeded: number;
}> {
	let next: SyncOutboxEntry[] = [...queue];
	let lastSyncAt: number | null = null;
	let succeeded = 0;
	for (const entry of next) {
		const r = await sink(entry);
		if (r.ok) {
			next = removeEntry(next, entry.id);
			lastSyncAt = now;
			succeeded += 1;
		} else {
			next = markFailure(next, entry.id, r.error ?? "unknown error");
		}
	}
	return { queue: next, lastSyncAt: lastSyncAt ?? 0, succeeded };
}

/**
 * Merge two key-value stores (local + remote) using the chosen conflict
 * resolution. Returns the merged object.
 *
 * - local-wins: keys in local override remote
 * - remote-wins: keys in remote override local
 * - newer-wins: requires both stores to carry timestamps; later wins
 */
export function mergeBidirectional<L, R>(
	local: Record<string, L>,
	remote: Record<string, R>,
	resolution: ConflictResolution,
	timestamps?: Record<string, { local: number; remote: number }>,
): Record<string, L | R> {
	const out: Record<string, L | R> = {};
	const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
	for (const k of allKeys) {
		const inLocal = k in local;
		const inRemote = k in remote;
		if (inLocal && !inRemote) {
			out[k] = local[k]!;
		} else if (!inLocal && inRemote) {
			out[k] = remote[k]!;
		} else {
			// both present
			if (resolution === "local-wins") {
				out[k] = local[k]!;
			} else if (resolution === "remote-wins") {
				out[k] = remote[k]!;
			} else {
				// newer-wins
				const ts = timestamps?.[k];
				if (!ts) {
					// fallback to local-wins when no timestamp info
					out[k] = local[k]!;
				} else if (ts.local >= ts.remote) {
					out[k] = local[k]!;
				} else {
					out[k] = remote[k]!;
				}
			}
		}
	}
	return out;
}

/**
 * Build an outbox entry from a key/value/op triple.
 */
export function buildOutboxEntry(
	id: string,
	key: string,
	value: unknown,
	op: SyncOp,
	now: number = Date.now(),
): SyncOutboxEntry {
	return { id, key, value, op, ts: now, attempts: 0 };
}

/**
 * Serialize an outbox to JSON-safe form. Errors are coerced to strings.
 */
export function serializeOutbox(queue: readonly SyncOutboxEntry[]): string {
	return JSON.stringify(
		queue.map((e) => ({
			id: e.id,
			key: e.key,
			value: safeSerialize(e.value),
			op: e.op,
			ts: e.ts,
			attempts: e.attempts,
			lastError: e.lastError,
		})),
	);
}

/**
 * Parse a previously-serialized outbox. Tolerant: skips invalid entries.
 */
export function parseOutbox(json: string): SyncOutboxEntry[] {
	try {
		const arr = JSON.parse(json);
		if (!Array.isArray(arr)) return [];
		const out: SyncOutboxEntry[] = [];
		for (const item of arr) {
			if (
				item &&
				typeof item.id === "string" &&
				typeof item.key === "string" &&
				(item.op === "put" || item.op === "delete") &&
				typeof item.ts === "number"
			) {
				out.push({
					id: item.id,
					key: item.key,
					value: item.value,
					op: item.op,
					ts: item.ts,
					attempts:
						typeof item.attempts === "number" ? item.attempts : 0,
					lastError:
						typeof item.lastError === "string"
							? item.lastError
							: undefined,
				});
			}
		}
		return out;
	} catch {
		return [];
	}
}

function safeSerialize(v: unknown): unknown {
	try {
		return JSON.parse(JSON.stringify(v));
	} catch {
		return String(v);
	}
}

/**
 * Deduplicate pending entries with same key — keep latest ts.
 */
export function dedupeByKey(
	queue: readonly SyncOutboxEntry[],
): SyncOutboxEntry[] {
	const byKey = new Map<string, SyncOutboxEntry>();
	for (const e of queue) {
		const prev = byKey.get(e.key);
		if (!prev || e.ts > prev.ts) {
			byKey.set(e.key, e);
		}
	}
	return Array.from(byKey.values()).sort((a, b) => a.ts - b.ts);
}

/**
 * Cap a queue to the most-recent N entries.
 */
export function capQueue(
	queue: readonly SyncOutboxEntry[],
	maxSize: number,
): SyncOutboxEntry[] {
	if (queue.length <= maxSize) return [...queue];
	return queue.slice(queue.length - maxSize);
}
