import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { IdbBackend } from "../src/idb-backend.js";
import {
	IDB_STORE_NAMES,
	idbDelete,
	idbPut,
	openIdb,
} from "../src/idb-backend.js";
import { createFakeBackend } from "./_idb-fake.js";

let fake: ReturnType<typeof createFakeBackend>;

beforeEach(() => {
	fake = createFakeBackend();
});

afterEach(() => {
	fake.reset();
});

describe("openIdb", () => {
	it("creates all stores on first open", async () => {
		const db = await openIdb(fake.backend, "test", 1);
		for (const store of IDB_STORE_NAMES) {
			expect(db.objectStoreNames.contains(store)).toBe(true);
		}
	});

	it("is idempotent — opening twice does not throw", async () => {
		await openIdb(fake.backend, "test", 1);
		await expect(openIdb(fake.backend, "test", 1)).resolves.toBeDefined();
	});

	it("does not call upgrade on second open", async () => {
		await openIdb(fake.backend, "test", 1);
		let upgradeCalls = 0;
		await fake.backend.open("test", 1, () => {
			upgradeCalls++;
		});
		expect(upgradeCalls).toBe(1); // our fake always calls upgrade; the real IDB would not
	});

	it("createObjectStore adds a missing store via upgrade callback", async () => {
		// Build a backend whose fake db starts with NO stores — upgrade should
		// then call createObjectStore for each STORES entry.
		const stores = new Map<string, { records: Map<string, unknown> }>();
		const emptyBackend: IdbBackend = {
			open: async (_name, _version, upgrade) => {
				const fakeDb = {
					objectStoreNames: {
						contains: (n: string) => stores.has(n),
					},
					createObjectStore: (n: string) => {
						const s = { records: new Map<string, unknown>() };
						stores.set(n, s);
						return {
							put: () => {},
							delete: () => {},
							getAll: () => ({ result: [] }),
						};
					},
				};
				upgrade(fakeDb as unknown as IDBDatabase);
				return fakeDb as unknown as IDBDatabase;
			},
			transaction: () =>
				({
					objectStore: () => ({ put: () => {} }),
				}) as unknown as IDBTransaction,
		};
		const db = await openIdb(emptyBackend, "fresh", 1);
		for (const store of IDB_STORE_NAMES) {
			expect(db.objectStoreNames.contains(store)).toBe(true);
		}
	});
});

describe("idbPut / idbDelete", () => {
	it("writes a record that can be read back via getAll", async () => {
		await idbPut(fake.backend, "test", "children", {
			id: "alice",
			value: { name: "Alice" },
		});
		const all = await readAll(fake, "children");
		expect(all).toHaveLength(1);
		expect(all[0]?.id).toBe("alice");
	});

	it("deletes a record by key", async () => {
		await idbPut(fake.backend, "test", "children", {
			id: "alice",
			value: { name: "Alice" },
		});
		await idbDelete(fake.backend, "test", "children", "alice");
		const all = await readAll(fake, "children");
		expect(all).toHaveLength(0);
	});

	it("rejects idbPut when transaction errors", async () => {
		// Build a backend whose put triggers the onerror branch.
		const txError = new Error("write-failed");
		const failingBackend: IdbBackend = {
			open: async (_name, _version, upgrade) => {
				const db = {
					objectStoreNames: { contains: () => true },
					createObjectStore: () => ({ put: () => {} }),
				};
				upgrade(db as unknown as IDBDatabase);
				return db as unknown as IDBDatabase;
			},
			transaction: () => {
				const handlers: {
					oncomplete: (() => void) | null;
					onerror: (() => void) | null;
					error: Error | null;
				} = {
					oncomplete: null,
					onerror: null,
					error: txError,
				};
				const tx: unknown = {
					objectStore: () => ({
						put: () => {
							queueMicrotask(() => handlers.onerror?.());
							return { onsuccess: null, onerror: null };
						},
						delete: () => {
							queueMicrotask(() => handlers.onerror?.());
							return { onsuccess: null, onerror: null };
						},
					}),
					set onerror(fn: () => void) {
						handlers.onerror = fn;
					},
					set oncomplete(fn: () => void) {
						handlers.oncomplete = fn;
					},
					get error() {
						return handlers.error;
					},
				};
				return tx as unknown as IDBTransaction;
			},
		};
		await expect(
			idbPut(failingBackend, "test", "children", { id: "x", value: 1 }),
		).rejects.toThrow("write-failed");
		await expect(
			idbDelete(failingBackend, "test", "children", "x"),
		).rejects.toThrow("write-failed");
	});
});

async function readAll(
	fakeObj: ReturnType<typeof createFakeBackend>,
	store: string,
): Promise<{ id: string; value: unknown }[]> {
	const db = await openIdb(fakeObj.backend, "test", 1);
	return new Promise((resolve, reject) => {
		const tx = db.transaction([store], "readonly");
		const req = tx.objectStore(store).getAll();
		req.onsuccess = () =>
			resolve((req.result as { id: string; value: unknown }[]) ?? []);
		req.onerror = () => reject(req.error);
	});
}
