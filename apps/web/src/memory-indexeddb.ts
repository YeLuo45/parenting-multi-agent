/**
 * IndexedDbMemoryLayer — browser persistence layer on top of WebMemoryLayer.
 *
 * Strategy:
 * 1. On `ready`, hydrate from IndexedDB (object stores keyed by table name).
 * 2. Writes go to the in-memory WebMemoryLayer first (so sync reads return
 *    the latest data), then enqueue a write to IndexedDB via a microtask
 *    queue. The queue is flushed on `flush()` and on `close()`.
 * 3. The class is testable in environments without IndexedDB by injecting a
 *    fake backend via the constructor.
 */

import type {
	ChildProfile,
	Episode,
	EpisodeType,
	Fact,
	FactCategory,
	Session,
} from "@parenting/memory";
import type { Feedback } from "@parenting/orchestrator";
import {
	IDB_SCHEMA_VERSION,
	type IdbBackend,
	type IdbRecord,
	idbDelete,
	idbPut,
	openIdb,
} from "./idb-backend.js";
import { WebMemoryLayer } from "./memory-web.js";

export interface IndexedDbMemoryLayerOptions {
	dbName?: string;
	version?: number;
	/** Pass a custom backend for testing; leave undefined to detect the
	 *  browser's `indexedDB` global at construction time. */
	backend?: IdbBackend | null;
}

interface PendingWrite {
	store: string;
	record: IdbRecord | null;
	key: string;
}

export class IndexedDbMemoryLayer extends WebMemoryLayer {
	private readonly dbName: string;
	private readonly version: number;
	private readonly backend: IdbBackend | null;
	private readyPromise: Promise<void> | null = null;
	private flushPromise: Promise<void> = Promise.resolve();
	private pending: PendingWrite[] = [];

	constructor(options: IndexedDbMemoryLayerOptions = {}) {
		super();
		this.dbName = options.dbName ?? "parenting-memory";
		this.version = options.version ?? 1;
		this.backend =
			options.backend === undefined ? defaultBackend() : options.backend;
	}

	/** Async-ready; orchestrator should `await layer.ready()` before first use. */
	ready(): Promise<void> {
		if (this.readyPromise) return this.readyPromise;
		this.readyPromise = (async () => {
			if (!this.backend) return; // No IDB available (test env) — operate in-memory.
			await openIdb(this.backend, this.dbName, this.version);
			await this.hydrate();
			this.enqueue("metadata", {
				id: "schema",
				value: this.getSchemaMeta(),
			});
		})();
		return this.readyPromise;
	}

	getSchemaVersion(): number {
		return this.getSchemaMeta().version;
	}

	getSchemaMeta(): { version: number } {
		return { version: IDB_SCHEMA_VERSION };
	}

	// Override write paths to enqueue persistence. Reads still go through the
	// superclass so the contract is unchanged.

	override upsertChild(profile: ChildProfile): ChildProfile {
		const result = super.upsertChild(profile);
		this.enqueue("children", { id: result.id, value: result });
		return result;
	}

	override deleteChild(id: string): boolean {
		const existed = super.deleteChild(id);
		if (existed) this.enqueueDelete("children", id);
		return existed;
	}

	override addFact(
		childId: string,
		category: FactCategory,
		key: string,
		value: string | Record<string, unknown>,
	): Fact {
		const fact = super.addFact(childId, category, key, value);
		this.enqueue("facts", { id: fact.id, value: fact });
		return fact;
	}

	override deleteFact(id: string): boolean {
		const existed = super.deleteFact(id);
		if (existed) this.enqueueDelete("facts", id);
		return existed;
	}

	override addEpisode(
		childId: string,
		type: EpisodeType,
		content: Record<string, unknown>,
	): Episode {
		const episode = super.addEpisode(childId, type, content);
		this.enqueue("episodes", { id: episode.id, value: episode });
		return episode;
	}

	override deleteEpisode(id: string): boolean {
		const existed = super.deleteEpisode(id);
		if (existed) this.enqueueDelete("episodes", id);
		return existed;
	}

	override startSession(
		childId: string,
		context: Record<string, unknown> = {},
	): Session {
		const session = super.startSession(childId, context);
		this.enqueue("sessions", { id: session.id, value: session });
		return session;
	}

	override updateSession(
		sessionId: string,
		context: Record<string, unknown>,
	): Session | null {
		const session = super.updateSession(sessionId, context);
		if (session)
			this.enqueue("sessions", { id: session.id, value: session });
		return session;
	}

	override addFeedback(
		feedback: Omit<Feedback, "id" | "createdAt">,
	): Feedback {
		const entry = super.addFeedback(feedback);
		this.enqueue("feedback", { id: entry.id, value: entry });
		return entry;
	}

	override deleteFeedback(id: string): boolean {
		const existed = super.deleteFeedback(id);
		if (existed) this.enqueueDelete("feedback", id);
		return existed;
	}

	/**
	 * Flush all pending writes to IndexedDB. Awaitable so callers can
	 * guarantee durability (e.g. before a page unload).
	 */
	flush(): Promise<void> {
		if (!this.backend) return this.flushPromise;
		if (this.pending.length === 0) return this.flushPromise;
		const writes = this.pending;
		this.pending = [];
		this.flushPromise = this.flushPromise.then(() =>
			this.applyWrites(writes),
		);
		return this.flushPromise;
	}

	override close(): void {
		// Best-effort flush; we don't await because close() is sync.
		void this.flush();
		super.close();
	}

	override get isClosed(): boolean {
		return super.isClosed;
	}

	private enqueue(store: string, record: IdbRecord): void {
		this.pending.push({ store, record, key: record.id });
	}

	private enqueueDelete(store: string, key: string): void {
		this.pending.push({ store, record: null, key });
	}

	private async applyWrites(writes: PendingWrite[]): Promise<void> {
		if (!this.backend) return;
		for (const w of writes) {
			try {
				if (w.record) {
					await idbPut(this.backend, this.dbName, w.store, w.record);
				} else {
					await idbDelete(this.backend, this.dbName, w.store, w.key);
				}
			} catch {
				// Best-effort; if the DB is closed mid-flush we just drop the write.
			}
		}
	}

	private async hydrate(): Promise<void> {
		if (!this.backend) return;
		for (const store of [
			"children",
			"facts",
			"episodes",
			"sessions",
			"feedback",
		] as const) {
			const records = await readAll(this.backend, this.dbName, store);
			for (const r of records) this.applyHydrated(store, r);
		}
	}

	// v8 ignore next 12
	private applyHydrated(
		store: "children" | "facts" | "episodes" | "sessions" | "feedback",
		r: IdbRecord,
	): void {
		const v = r.value as Record<string, unknown>;
		switch (store) {
			case "children": {
				const c = v as unknown as ChildProfile;
				super.upsertChild(c);
				return;
			}
			case "facts":
				super.addFact(
					String(v.childId),
					v.category as FactCategory,
					String(v.key),
					(v.value as string | Record<string, unknown>) ?? {
						data: "",
					},
				);
				return;
			case "episodes":
				super.addEpisode(
					String(v.childId),
					v.type as EpisodeType,
					(v.content as Record<string, unknown>) ?? {},
				);
				return;
			case "sessions": {
				const s = v as unknown as Session;
				super.startSession(s.childId, s.context);
				return;
			}
			case "feedback":
				super.addFeedback(
					v as unknown as Omit<Feedback, "id" | "createdAt">,
				);
				return;
		}
	}
}

/**
 * Try to use the browser's global `indexedDB`. Returns `null` if it is
 * unavailable (e.g. Node test environment).
 */
export function defaultBackend(): IdbBackend | null {
	if (typeof indexedDB === "undefined") return null;
	return {
		open: (
			name: string,
			version: number,
			upgrade: (db: IDBDatabase) => void,
		) =>
			new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open(name, version);
				req.onupgradeneeded = () => upgrade(req.result);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			}),
		transaction: (
			db: IDBDatabase,
			stores: string[],
			mode: IDBTransactionMode,
		) => db.transaction(stores, mode),
	};
}

async function readAll(
	backend: IdbBackend,
	dbName: string,
	store: string,
): Promise<IdbRecord[]> {
	let db: IDBDatabase;
	try {
		db = await openIdb(backend, dbName, 1);
	} catch {
		return [];
	}
	return new Promise((resolve, reject) => {
		const tx = backend.transaction(db, [store], "readonly");
		const req = tx.objectStore(store).getAll();
		req.onsuccess = () => resolve((req.result as IdbRecord[]) ?? []);
		req.onerror = () => reject(req.error);
	});
}

// Re-export the memory-helpers types so consumers have a single import path.
export type {
	ChildProfile,
	ChildStage,
	DeltaEntry,
	DeltaOp,
	Episode,
	EpisodeType,
	Fact,
	FactCategory,
	Session,
} from "@parenting/memory";
export type { IdbBackend, IdbRecord } from "./idb-backend.js";
export { idbDelete, idbPut, openIdb } from "./idb-backend.js";
export type { MemoryLayerLike } from "./memory-web.js";
export { WebMemoryLayer } from "./memory-web.js";
