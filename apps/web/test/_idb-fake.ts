/**
 * In-memory fake of the IndexedDB API. Implements just enough surface for
 * `IndexedDbMemoryLayer` + the IDB helpers to run inside a Node test env.
 */

import type { IdbBackend, IdbRecord } from "../src/idb-backend.js";

interface FakeStore {
	records: Map<string, IdbRecord>;
}

class FakeObjectStore {
	constructor(private store: FakeStore) {}

	put(record: IdbRecord): {
		onsuccess: ((ev?: unknown) => void) | null;
		onerror: ((ev?: unknown) => void) | null;
	} {
		this.store.records.set(record.id, record);
		const handlers: {
			onsuccess: ((ev?: unknown) => void) | null;
			onerror: ((ev?: unknown) => void) | null;
		} = {
			onsuccess: null,
			onerror: null,
		};
		queueMicrotask(() => handlers.onsuccess?.());
		return handlers;
	}

	delete(key: string): {
		onsuccess: ((ev?: unknown) => void) | null;
		onerror: ((ev?: unknown) => void) | null;
	} {
		this.store.records.delete(key);
		const handlers: {
			onsuccess: ((ev?: unknown) => void) | null;
			onerror: ((ev?: unknown) => void) | null;
		} = {
			onsuccess: null,
			onerror: null,
		};
		queueMicrotask(() => handlers.onsuccess?.());
		return handlers;
	}

	getAll(): {
		onsuccess: ((ev?: unknown) => void) | null;
		onerror: ((ev?: unknown) => void) | null;
		result: IdbRecord[];
	} {
		const result = Array.from(this.store.records.values());
		const handlers: {
			onsuccess: ((ev?: unknown) => void) | null;
			onerror: ((ev?: unknown) => void) | null;
			result: IdbRecord[];
		} = {
			onsuccess: null,
			onerror: null,
			result,
		};
		queueMicrotask(() => handlers.onsuccess?.());
		return handlers;
	}
}

class FakeTransaction {
	readonly oncomplete: ((ev?: unknown) => void) | null = null;
	readonly onerror: ((ev?: unknown) => void) | null = null;
	constructor(public objectStore: (name: string) => FakeObjectStore) {
		queueMicrotask(() => {
			// @ts-expect-error: simple callback hook
			this.oncomplete?.();
		});
	}
}

class FakeDatabase {
	readonly objectStoreNames = {
		contains: (name: string) => this.stores.has(name),
	};
	constructor(private stores: Map<string, FakeStore>) {}
	createObjectStore(name: string): FakeObjectStore {
		const s: FakeStore = { records: new Map<string, IdbRecord>() };
		this.stores.set(name, s);
		return new FakeObjectStore(s);
	}
	transaction(_stores: string[]): FakeTransaction {
		return new FakeTransaction((name) => {
			const store = this.stores.get(name);
			if (!store) throw new Error(`Missing fake IDB store: ${name}`);
			return new FakeObjectStore(store);
		});
	}
}

type FakeRecordMaps = {
	children: Map<string, IdbRecord>;
	facts: Map<string, IdbRecord>;
	episodes: Map<string, IdbRecord>;
	sessions: Map<string, IdbRecord>;
	feedback: Map<string, IdbRecord>;
	metadata: Map<string, IdbRecord>;
};

/** Build a fresh fake backend (per-test) with all stores pre-created. */
export function createFakeBackend(): {
	backend: IdbBackend;
	records: FakeRecordMaps;
	reset: () => void;
} {
	const records: FakeRecordMaps = {
		children: new Map<string, IdbRecord>(),
		facts: new Map<string, IdbRecord>(),
		episodes: new Map<string, IdbRecord>(),
		sessions: new Map<string, IdbRecord>(),
		feedback: new Map<string, IdbRecord>(),
		metadata: new Map<string, IdbRecord>(),
	};
	const storeLookup: Record<keyof typeof records, FakeStore | undefined> = {
		children: undefined,
		facts: undefined,
		episodes: undefined,
		sessions: undefined,
		feedback: undefined,
		metadata: undefined,
	};
	const stores = new Map<string, FakeStore>();
	const ensureStore = (name: keyof typeof records): FakeStore => {
		if (storeLookup[name]) return storeLookup[name] as FakeStore;
		const fakeStore: FakeStore = { records: records[name] };
		storeLookup[name] = fakeStore;
		stores.set(name, fakeStore);
		return fakeStore;
	};
	for (const name of [
		"children",
		"facts",
		"episodes",
		"sessions",
		"feedback",
		"metadata",
	] as const) {
		ensureStore(name);
	}
	const backend: IdbBackend = {
		open: async (_name, _version, upgrade) => {
			const db = new FakeDatabase(stores);
			upgrade(db as unknown as IDBDatabase);
			return db as unknown as IDBDatabase;
		},
		transaction: (db, storeNames) =>
			(db as unknown as FakeDatabase).transaction(
				storeNames,
			) as unknown as IDBTransaction,
	};
	return {
		backend,
		records,
		reset: () => {
			records.children.clear();
			records.facts.clear();
			records.episodes.clear();
			records.sessions.clear();
			records.feedback.clear();
			records.metadata.clear();
		},
	};
}
