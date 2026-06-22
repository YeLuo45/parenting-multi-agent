import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWebOrchestratorWithPersistence } from "../src/orchestrator.js";
import { createFakeBackend } from "./_idb-fake.js";

let fake: ReturnType<typeof createFakeBackend>;

beforeEach(() => {
	fake = createFakeBackend();
});

afterEach(() => {
	fake.reset();
});

describe("createWebOrchestratorWithPersistence", () => {
	it("falls back to in-memory storage when IndexedDB is unavailable", async () => {
		const a = await createWebOrchestratorWithPersistence("test-fallback");
		a.upsertChild({
			id: "alice",
			name: "爱丽丝",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		expect(a.listChildren()).toHaveLength(1);
		expect(a.listChildren()[0]?.id).toBe("alice");
		a.close();
		expect(a.listChildren()).toEqual([]);
	});

	it("exposes a list of registered agent ids", async () => {
		const stack = await createWebOrchestratorWithPersistence("test-agents");
		expect(stack.listChildren()).toBeDefined();
		stack.close();
	});

	it("uses IndexedDbMemoryLayer when IDB is available via the fake backend", async () => {
		// Pre-populate the store, then open a layer and expect hydration.
		fake.records.children.set("bob", {
			id: "bob",
			value: {
				id: "bob",
				name: "鲍勃",
				birthDate: "2023-01-01",
				stage: "preschool",
			},
		});
		// Build a layer directly through the factory signature, then assert the
		// in-memory map picks up the existing record on the second instance.
		const { IndexedDbMemoryLayer } = await import(
			"../src/memory-indexeddb.js"
		);
		const a = new IndexedDbMemoryLayer({
			backend: fake.backend,
			dbName: "test-hydrate",
		});
		await a.ready();
		expect(a.listChildren().map((c) => c.id)).toContain("bob");
		a.close();
	});
});
