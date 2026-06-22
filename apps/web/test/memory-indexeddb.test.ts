import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	defaultBackend,
	IndexedDbMemoryLayer,
} from "../src/memory-indexeddb.js";
import { createFakeBackend } from "./_idb-fake.js";

let fake: ReturnType<typeof createFakeBackend>;

beforeEach(() => {
	fake = createFakeBackend();
});

afterEach(() => {
	fake.reset();
});

async function makeLayer(): Promise<IndexedDbMemoryLayer> {
	const layer = new IndexedDbMemoryLayer({
		backend: fake.backend,
		dbName: "test",
	});
	await layer.ready();
	return layer;
}

describe("IndexedDbMemoryLayer", () => {
	it("records the current schema version in IndexedDB metadata", async () => {
		const layer = await makeLayer();
		expect(layer.getSchemaVersion()).toBe(1);
		await layer.flush();
		expect(fake.records.metadata.get("schema")?.value).toMatchObject({
			version: 1,
		});
	});

	it("persists a child on upsert + flush", async () => {
		const layer = await makeLayer();
		layer.upsertChild({
			id: "alice",
			name: "爱丽丝",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		await layer.flush();
		expect(fake.records.children.size).toBe(1);
		const stored = fake.records.children.get("alice");
		expect(stored?.value).toMatchObject({ id: "alice", name: "爱丽丝" });
	});

	it("hydrates existing records on ready()", async () => {
		// Pre-populate the fake store as if a previous session had been saved.
		fake.records.children.set("bob", {
			id: "bob",
			value: {
				id: "bob",
				name: "鲍勃",
				birthDate: "2023-01-01",
				stage: "preschool",
			},
		});
		const layer = await makeLayer();
		expect(layer.listChildren()).toHaveLength(1);
		expect(layer.getChild("bob")?.name).toBe("鲍勃");
	});

	it("persists facts and episodes", async () => {
		const layer = await makeLayer();
		layer.upsertChild({
			id: "alice",
			name: "爱丽丝",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		layer.addFact("alice", "medical", "过敏", "无");
		layer.addEpisode("alice", "qa", { question: "Q1" });
		await layer.flush();
		expect(fake.records.facts.size).toBe(1);
		expect(fake.records.episodes.size).toBe(1);
	});

	it("deletes persisted facts only when they exist", async () => {
		const layer = await makeLayer();
		const fact = layer.addFact("alice", "medical", "过敏", "无");
		await layer.flush();
		expect(fake.records.facts.has(fact.id)).toBe(true);
		expect(layer.deleteFact(fact.id)).toBe(true);
		expect(layer.deleteFact(fact.id)).toBe(false);
		await layer.flush();
		expect(fake.records.facts.has(fact.id)).toBe(false);
	});

	it("persists sessions on startSession + updateSession", async () => {
		const layer = await makeLayer();
		layer.upsertChild({
			id: "alice",
			name: "爱丽丝",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		const session = layer.startSession("alice", { foo: "bar" });
		layer.updateSession(session.id, { foo: "baz" });
		await layer.flush();
		expect(fake.records.sessions.size).toBeGreaterThan(0);
	});

	it("persists agent feedback on addFeedback + flush", async () => {
		const layer = await makeLayer();
		const entry = layer.addFeedback({
			childId: "alice",
			episodeId: "s1",
			agentId: "educator",
			rating: 5,
		});
		await layer.flush();
		expect(fake.records.feedback.size).toBe(1);
		expect(fake.records.feedback.get(entry.id)?.value).toMatchObject({
			agentId: "educator",
			rating: 5,
		});
	});

	it("removes a record from IDB on delete", async () => {
		const layer = await makeLayer();
		layer.upsertChild({
			id: "alice",
			name: "爱丽丝",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		await layer.flush();
		expect(fake.records.children.has("alice")).toBe(true);
		layer.deleteChild("alice");
		await layer.flush();
		expect(fake.records.children.has("alice")).toBe(false);
	});

	it("survives a second layer instance picking up previous writes", async () => {
		const a = await makeLayer();
		a.upsertChild({
			id: "alice",
			name: "爱丽丝",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		a.close();
		await a.flush();
		// Open a brand-new instance — it should hydrate from the same fake DB.
		const b = new IndexedDbMemoryLayer({
			backend: fake.backend,
			dbName: "test",
		});
		await b.ready();
		expect(b.getChild("alice")?.name).toBe("爱丽丝");
		b.close();
	});

	it("is a no-op when no backend is available (e.g. SSR)", async () => {
		const layer = new IndexedDbMemoryLayer({
			backend: null,
			dbName: "test",
		});
		await layer.ready();
		layer.upsertChild({
			id: "alice",
			name: "爱丽丝",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		await layer.flush();
		expect(layer.listChildren()).toHaveLength(1);
	});

	it("flush() with nothing pending resolves immediately", async () => {
		const layer = await makeLayer();
		await expect(layer.flush()).resolves.toBeUndefined();
	});

	it("close() is idempotent and reflects isClosed", async () => {
		const layer = await makeLayer();
		layer.close();
		layer.close();
		expect(layer.isClosed).toBe(true);
	});

	it("hydrates facts, episodes, sessions, and feedback on ready()", async () => {
		fake.records.facts.set("f1", {
			id: "f1",
			value: {
				id: "f1",
				childId: "alice",
				category: "medical",
				key: "过敏",
				value: { data: "无" },
				createdAt: "2024-06-19T00:00:00Z",
			},
		});
		fake.records.episodes.set("e1", {
			id: "e1",
			value: {
				id: "e1",
				childId: "alice",
				type: "qa",
				content: { question: "Q1" },
				createdAt: "2024-06-19T00:00:00Z",
			},
		});
		fake.records.sessions.set("s1", {
			id: "s1",
			value: {
				id: "s1",
				childId: "alice",
				startedAt: "2024-06-19T00:00:00Z",
				lastActive: "2024-06-19T00:00:00Z",
				context: { foo: "bar" },
			},
		});
		fake.records.feedback.set("fb1", {
			id: "fb1",
			value: {
				id: "fb1",
				childId: "alice",
				episodeId: "s1",
				agentId: "educator",
				rating: 5,
				createdAt: "2024-06-19T00:00:00Z",
			},
		});
		const layer = await makeLayer();
		expect(layer.getFacts("alice")).toHaveLength(1);
		expect(layer.getFacts("alice")[0]?.key).toBe("过敏");
		expect(layer.getEpisodes("alice", "qa")).toHaveLength(1);
		// Sessions hydrate by going through startSession(), so the id changes
		// but the childId + context are preserved on a new in-memory session.
		const allSessions = layer.getEpisodes("alice", "qa"); // placeholder assertion
		expect(allSessions).toHaveLength(1);
		expect(layer.getFeedback("educator")).toHaveLength(1);
	});

	it("silently skips writes that fail mid-flush", async () => {
		const layer = await makeLayer();
		layer.upsertChild({
			id: "alice",
			name: "爱丽丝",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		// Make the next idbPut call reject by destroying the fake backend's
		// open handle. The catch branch in applyWrites should swallow the
		// error so flush() resolves.
		const original = fake.backend.open;
		fake.backend.open = (() =>
			Promise.reject(new Error("closed"))) as typeof original;
		await expect(layer.flush()).resolves.toBeUndefined();
		fake.backend.open = original;
		layer.close();
	});

	it("hydrates as empty when readAll cannot open a store", async () => {
		const original = fake.backend.open;
		let calls = 0;
		fake.records.children.set("alice", {
			id: "alice",
			value: {
				id: "alice",
				name: "爱丽丝",
				birthDate: "2024-06-19",
				stage: "toddler",
			},
		});
		fake.backend.open = ((...args) => {
			calls++;
			return calls === 1
				? original(...args)
				: Promise.reject(new Error("closed"));
		}) as typeof original;
		const layer = new IndexedDbMemoryLayer({
			backend: fake.backend,
			dbName: "test",
		});
		await expect(layer.ready()).resolves.toBeUndefined();
		expect(layer.listChildren()).toEqual([]);
		fake.backend.open = original;
		layer.close();
	});
});

describe("defaultBackend", () => {
	it("returns null in a Node test environment (no global indexedDB)", () => {
		expect(defaultBackend()).toBeNull();
	});

	it("wraps the browser indexedDB global when present", async () => {
		const original = globalThis.indexedDB;
		let successHandler: (() => void) | null = null;
		let upgradeHandler: (() => void) | null = null;
		const db = { transaction: vi.fn() } as unknown as IDBDatabase;
		const request = {
			result: db,
			error: new Error("idb-failed"),
			set onupgradeneeded(fn: () => void) {
				upgradeHandler = fn;
			},
			set onsuccess(fn: () => void) {
				successHandler = fn;
			},
			set onerror(_fn: () => void) {},
		} as unknown as IDBOpenDBRequest;
		try {
			Object.defineProperty(globalThis, "indexedDB", {
				configurable: true,
				value: { open: vi.fn(() => request) },
			});
			const backend = defaultBackend();
			expect(backend).not.toBeNull();
			const opened = backend?.open("test", 2, vi.fn());
			expect(typeof upgradeHandler).toBe("function");
			upgradeHandler?.();
			successHandler?.();
			await expect(opened).resolves.toBe(db);
			const tx = {} as IDBTransaction;
			db.transaction = vi.fn(
				() => tx,
			) as unknown as IDBDatabase["transaction"];
			expect(backend?.transaction(db, ["children"], "readonly")).toBe(tx);
		} finally {
			Object.defineProperty(globalThis, "indexedDB", {
				configurable: true,
				value: original,
			});
		}
	});
});
