/**
 * Tiny IndexedDB abstraction so the IndexedDbMemoryLayer can be tested
 * without a real browser IDB implementation.
 *
 * Public surface:
 * - `IdbBackend`: pluggable open/transaction API. The default backend
 *   delegates to the global `indexedDB`. Tests can pass an in-memory mock.
 * - `openIdb`: opens (and lazily creates) a database at `name`/`version`.
 * - `idbPut` / `idbDelete`: best-effort put/delete helpers.
 */

export interface IdbRecord {
	id: string;
	value: unknown;
}

export const IDB_SCHEMA_VERSION = 1;

export interface IdbBackend {
	open(
		name: string,
		version: number,
		upgrade: (db: IDBDatabase) => void,
	): Promise<IDBDatabase>;
	transaction(
		db: IDBDatabase,
		stores: string[],
		mode: IDBTransactionMode,
	): IDBTransaction;
}

const STORES = [
	"children",
	"facts",
	"episodes",
	"sessions",
	"feedback",
	"metadata",
] as const;

/** Open or create the database. Idempotent. */
export async function openIdb(
	backend: IdbBackend,
	name: string,
	version: number,
): Promise<IDBDatabase> {
	return backend.open(name, version, (db) => {
		for (const store of STORES) {
			if (!db.objectStoreNames.contains(store)) {
				db.createObjectStore(store, { keyPath: "id" });
			}
		}
	});
}

export async function idbPut(
	backend: IdbBackend,
	name: string,
	store: string,
	record: IdbRecord,
): Promise<void> {
	const db = await openIdb(backend, name, 1);
	await new Promise<void>((resolve, reject) => {
		const tx = backend.transaction(db, [store], "readwrite");
		tx.objectStore(store).put(record);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function idbDelete(
	backend: IdbBackend,
	name: string,
	store: string,
	key: string,
): Promise<void> {
	const db = await openIdb(backend, name, 1);
	await new Promise<void>((resolve, reject) => {
		const tx = backend.transaction(db, [store], "readwrite");
		tx.objectStore(store).delete(key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export const IDB_STORE_NAMES = STORES;
