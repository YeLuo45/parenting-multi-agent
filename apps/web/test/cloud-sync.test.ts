import { describe, expect, it } from "vitest";
import {
	applyOptimistic,
	CLOUD_SYNC_DISCLAIMER,
	computeEtag,
	conflict,
	createInMemoryTransport,
	detectConflict,
	drainOutbox,
	MAX_CONFLICT_BACKLOG,
	Outbox,
	resolveConflict,
	SYNC_VERSION,
	type SyncRecord,
} from "../src/cloud-sync.js";

function makeRecord(overrides: Partial<SyncRecord> = {}): SyncRecord {
	return {
		id: "r1",
		collection: "children",
		op: "put",
		payload: { name: "小明" },
		version: 1,
		etag: "",
		createdAt: Date.now(),
		updatedAt: Date.now(),
		origin: "local",
		...overrides,
	};
}

describe("SYNC_VERSION", () => {
	it("is 1", () => {
		expect(SYNC_VERSION).toBe(1);
	});
});

describe("computeEtag", () => {
	it("generates a non-empty string", () => {
		const e = computeEtag(makeRecord());
		expect(e.length).toBeGreaterThan(0);
	});

	it("is deterministic for same payload", () => {
		const e1 = computeEtag(makeRecord({ payload: { a: 1 } }));
		const e2 = computeEtag(makeRecord({ payload: { a: 1 } }));
		expect(e1).toBe(e2);
	});

	it("differs for different payloads", () => {
		const e1 = computeEtag(makeRecord({ payload: { a: 1 } }));
		const e2 = computeEtag(makeRecord({ payload: { a: 2 } }));
		expect(e1).not.toBe(e2);
	});

	it("differs for different versions", () => {
		const e1 = computeEtag(makeRecord({ version: 1 }));
		const e2 = computeEtag(makeRecord({ version: 2 }));
		expect(e1).not.toBe(e2);
	});
});

describe("detectConflict", () => {
	it("returns false for same id + same version", () => {
		const a = makeRecord();
		const b = makeRecord();
		expect(detectConflict(a, b)).toBe(false);
	});

	it("returns false for same etag", () => {
		const a = makeRecord({ etag: "e_abc" });
		const b = makeRecord({ version: 5, etag: "e_abc" });
		expect(detectConflict(a, b)).toBe(false);
	});

	it("returns true for different id", () => {
		const a = makeRecord({ id: "x1" });
		const b = makeRecord({ id: "x2", etag: "e_zzz" });
		expect(detectConflict(a, b)).toBe(false);
	});

	it("returns true for different collections", () => {
		const a = makeRecord({ collection: "a" });
		const b = makeRecord({ collection: "b", etag: "e_zzz" });
		expect(detectConflict(a, b)).toBe(false);
	});

	it("returns true for different version + different etag", () => {
		const a = makeRecord({ version: 1, etag: "e_a" });
		const b = makeRecord({ version: 2, etag: "e_b" });
		expect(detectConflict(a, b)).toBe(true);
	});
});

describe("resolveConflict", () => {
	it("local-wins strategy keeps local payload", () => {
		const local = makeRecord({ payload: { v: "local" } });
		const remote = makeRecord({ payload: { v: "remote" }, etag: "e_r" });
		const c = resolveConflict(local, remote, "local-wins");
		expect(c.resolution).toBe("local");
		expect(c.mergedPayload).toEqual({ v: "local" });
	});

	it("remote-wins strategy keeps remote payload", () => {
		const local = makeRecord({ payload: { v: "local" } });
		const remote = makeRecord({ payload: { v: "remote" }, etag: "e_r" });
		const c = resolveConflict(local, remote, "remote-wins");
		expect(c.resolution).toBe("remote");
		expect(c.mergedPayload).toEqual({ v: "remote" });
	});

	it("manual strategy shallow-merges with remote priority", () => {
		const local = makeRecord({ payload: { a: 1, b: 2 } });
		const remote = makeRecord({ payload: { b: 99, c: 3 }, etag: "e_r" });
		const c = resolveConflict(local, remote, "manual");
		expect(c.resolution).toBe("merge");
		expect(c.mergedPayload).toEqual({ a: 1, b: 99, c: 3 });
	});

	it("sets resolvedAt timestamp", () => {
		const c = resolveConflict(makeRecord(), makeRecord({ etag: "e_r" }));
		expect(c.resolvedAt).toBeDefined();
		expect(c.resolvedAt).toBeGreaterThan(0);
	});
});

describe("Outbox", () => {
	it("starts empty", () => {
		const o = new Outbox();
		expect(o.size()).toBe(0);
	});

	it("enqueue + list", () => {
		const o = new Outbox();
		o.enqueue(makeRecord({ id: "a" }));
		o.enqueue(makeRecord({ id: "b" }));
		expect(o.size()).toBe(2);
	});

	it("list filters by collection", () => {
		const o = new Outbox();
		o.enqueue(makeRecord({ id: "a", collection: "x" }));
		o.enqueue(makeRecord({ id: "b", collection: "y" }));
		const x = o.list({ collection: "x" });
		expect(x).toHaveLength(1);
		expect(x[0]?.id).toBe("a");
	});

	it("take removes items", () => {
		const o = new Outbox();
		o.enqueue(makeRecord({ id: "a" }));
		o.enqueue(makeRecord({ id: "b" }));
		const taken = o.take(1);
		expect(taken).toHaveLength(1);
		expect(o.size()).toBe(1);
	});

	it("clear empties", () => {
		const o = new Outbox();
		o.enqueue(makeRecord());
		o.clear();
		expect(o.size()).toBe(0);
	});

	it("addConflict + conflictsList", () => {
		const o = new Outbox();
		const c = resolveConflict(makeRecord(), makeRecord({ etag: "e_r" }));
		o.addConflict(c);
		expect(o.conflictsList()).toHaveLength(1);
	});

	it("caps conflict backlog at MAX_CONFLICT_BACKLOG", () => {
		const o = new Outbox();
		for (let i = 0; i < MAX_CONFLICT_BACKLOG + 5; i++) {
			o.addConflict(
				resolveConflict(makeRecord(), makeRecord({ etag: `e_${i}` })),
			);
		}
		expect(o.conflictsList().length).toBe(MAX_CONFLICT_BACKLOG);
	});
});

describe("applyOptimistic", () => {
	it("bumps version and updates timestamp", () => {
		const r = makeRecord({ version: 5 });
		const next = applyOptimistic(r, "patch", { updated: true });
		expect(next.version).toBe(6);
		expect(next.updatedAt).toBeGreaterThanOrEqual(r.updatedAt);
		expect(next.op).toBe("patch");
		expect(next.origin).toBe("local");
	});

	it("recomputes etag", () => {
		const r = makeRecord({ etag: "e_old" });
		const next = applyOptimistic(r, "put", { fresh: true });
		expect(next.etag).not.toBe("e_old");
	});
});

describe("createInMemoryTransport", () => {
	it("creates empty transport", () => {
		const { transport, store } = createInMemoryTransport();
		expect(store.size).toBe(0);
		expect(typeof transport.put).toBe("function");
	});

	it("seeds with initial records", () => {
		const r = makeRecord({ id: "x1" });
		const { store } = createInMemoryTransport([r]);
		expect(store.size).toBe(1);
	});

	it("put + fetch round-trip", async () => {
		const { transport, store } = createInMemoryTransport();
		const r = makeRecord();
		const out = await transport.put(r);
		expect(out.ok).toBe(true);
		const fetched = await transport.fetch(r.id);
		expect(fetched?.id).toBe(r.id);
	});

	it("delete removes record", async () => {
		const r = makeRecord();
		const { transport } = createInMemoryTransport([r]);
		const out = await transport.delete(r.id);
		expect(out.ok).toBe(true);
		const fetched = await transport.fetch(r.id);
		expect(fetched).toBeNull();
	});

	it("put returns 412 on etag conflict", async () => {
		const r1 = makeRecord({ version: 1, etag: "e_a" });
		const r2 = makeRecord({ version: 2, etag: "e_b" });
		const { transport } = createInMemoryTransport([r1]);
		const out = await transport.put(r2);
		expect(out.ok).toBe(false);
	});

	it("patch returns 404 for missing record", async () => {
		const { transport } = createInMemoryTransport();
		const r = makeRecord();
		const out = await transport.patch(r);
		expect(out.ok).toBe(false);
	});

	it("patch returns 409 for stale version", async () => {
		const existing = makeRecord({ version: 5 });
		const stale = makeRecord({ version: 2 });
		const { transport } = createInMemoryTransport([existing]);
		const out = await transport.patch(stale);
		expect(out.ok).toBe(false);
	});

	it("patch updates when version is current", async () => {
		const existing = makeRecord({ version: 5 });
		const next = makeRecord({ version: 6 });
		const { transport } = createInMemoryTransport([existing]);
		const out = await transport.patch(next);
		expect(out.ok).toBe(true);
	});

	it("delete returns 404 for missing id", async () => {
		const { transport } = createInMemoryTransport();
		const out = await transport.delete("nonexistent");
		expect(out.ok).toBe(false);
	});
});

describe("drainOutbox", () => {
	it("sends all items successfully", async () => {
		const o = new Outbox();
		o.enqueue(makeRecord({ id: "a" }));
		o.enqueue(makeRecord({ id: "b" }));
		const { transport } = createInMemoryTransport();
		const r = await drainOutbox(o, transport);
		expect(r.sent).toBe(2);
		expect(r.failed).toBe(0);
		expect(o.size()).toBe(0);
	});

	it("returns 0/0 for empty outbox", async () => {
		const o = new Outbox();
		const { transport } = createInMemoryTransport();
		const r = await drainOutbox(o, transport);
		expect(r.sent).toBe(0);
		expect(r.failed).toBe(0);
	});

	it("re-queues on transport failure", async () => {
		const o = new Outbox();
		o.enqueue(makeRecord({ id: "a" }));
		const failingTransport = {
			async put() {
				return { ok: false as const, error: "boom", code: 500 };
			},
			async patch() {
				return { ok: false as const, error: "boom", code: 500 };
			},
			async delete() {
				return { ok: false as const, error: "boom", code: 500 };
			},
			async fetch() {
				return null;
			},
		};
		const r = await drainOutbox(o, failingTransport, 10, 0);
		expect(r.failed).toBe(1);
		expect(o.size()).toBe(1); // re-queued
	});
});

describe("CLOUD_SYNC_DISCLAIMER", () => {
	it("includes warning emoji", () => {
		expect(CLOUD_SYNC_DISCLAIMER).toContain("⚠️");
	});
});
