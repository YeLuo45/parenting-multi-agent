import { describe, expect, it } from "vitest";
import {
	cacpQueue as _capQueue,
	appendEntry,
	buildOutboxEntry,
	capQueue,
	computeStatus,
	dedupeByKey,
	markFailure,
	mergeBidirectional,
	parseOutbox,
	removeEntry,
	type SyncOp,
	type SyncOutboxEntry,
	serializeOutbox,
	syncQueue,
} from "../src/sync-queue.js";

function entry(
	id: string,
	key: string,
	op: SyncOp = "put",
	value: unknown = "x",
	ts = 0,
): SyncOutboxEntry {
	return { id, key, value, op, ts, attempts: 0 };
}

describe("appendEntry", () => {
	it("appends to queue", () => {
		const q = appendEntry([], entry("1", "a"));
		expect(q).toHaveLength(1);
	});
	it("preserves existing entries", () => {
		const q = appendEntry([entry("1", "a")], entry("2", "b"));
		expect(q).toHaveLength(2);
		expect(q[0]?.id).toBe("1");
		expect(q[1]?.id).toBe("2");
	});
	it("returns a new array (no mutation)", () => {
		const orig = [entry("1", "a")];
		const next = appendEntry(orig, entry("2", "b"));
		expect(orig).toHaveLength(1);
		expect(next).not.toBe(orig);
	});
});

describe("removeEntry", () => {
	it("removes by id", () => {
		const q = removeEntry([entry("1", "a"), entry("2", "b")], "1");
		expect(q).toHaveLength(1);
		expect(q[0]?.id).toBe("2");
	});
	it("no-op when id not found", () => {
		const orig = [entry("1", "a")];
		expect(removeEntry(orig, "missing")).toEqual(orig);
	});
});

describe("markFailure", () => {
	it("increments attempts", () => {
		const q = markFailure([entry("1", "a")], "1", "boom");
		expect(q[0]?.attempts).toBe(1);
		expect(q[0]?.lastError).toBe("boom");
	});
	it("does not touch other entries", () => {
		const q = markFailure([entry("1", "a"), entry("2", "b")], "1", "err");
		expect(q[0]?.attempts).toBe(1);
		expect(q[1]?.attempts).toBe(0);
	});
});

describe("computeStatus", () => {
	it("empty queue + null lastSync", () => {
		const s = computeStatus([], null);
		expect(s.pending).toBe(0);
		expect(s.inFlight).toBe(0);
		expect(s.lastSyncAt).toBeNull();
		expect(s.failed).toBe(0);
	});
	it("counts failed entries", () => {
		const q: SyncOutboxEntry[] = [
			{
				id: "1",
				key: "a",
				value: 1,
				op: "put",
				ts: 0,
				attempts: 1,
				lastError: "x",
			},
			{ id: "2", key: "b", value: 2, op: "put", ts: 0, attempts: 0 },
		];
		const s = computeStatus(q, 1000);
		expect(s.pending).toBe(2);
		expect(s.failed).toBe(1);
		expect(s.lastSyncAt).toBe(1000);
	});
	it("respects inFlightCount parameter", () => {
		const s = computeStatus([entry("1", "a")], 0, 5);
		expect(s.inFlight).toBe(5);
	});
});

describe("syncQueue", () => {
	it("drains successful entries", async () => {
		const q = [entry("1", "a"), entry("2", "b")];
		const sink = async () => ({ ok: true });
		const r = await syncQueue(q, sink, 1234);
		expect(r.queue).toHaveLength(0);
		expect(r.lastSyncAt).toBe(1234);
		expect(r.succeeded).toBe(2);
	});

	it("keeps failing entries with attempts incremented", async () => {
		const q = [entry("1", "a")];
		const sink = async () => ({ ok: false, error: "fail" });
		const r = await syncQueue(q, sink);
		expect(r.queue).toHaveLength(1);
		expect(r.queue[0]?.attempts).toBe(1);
		expect(r.queue[0]?.lastError).toBe("fail");
		expect(r.succeeded).toBe(0);
		expect(r.lastSyncAt).toBe(0);
	});

	it("mixed ok/fail partial drain", async () => {
		const q = [entry("1", "a"), entry("2", "b"), entry("3", "c")];
		let i = 0;
		const sink = async () => {
			i++;
			return i === 2 ? { ok: false, error: "boom" } : { ok: true };
		};
		const r = await syncQueue(q, sink, 5000);
		expect(r.succeeded).toBe(2);
		expect(r.queue).toHaveLength(1);
		expect(r.queue[0]?.id).toBe("2");
		expect(r.queue[0]?.attempts).toBe(1);
		expect(r.lastSyncAt).toBe(5000);
	});

	it("uses default error message", async () => {
		const q = [entry("1", "a")];
		const sink = async () => ({ ok: false });
		const r = await syncQueue(q, sink);
		expect(r.queue[0]?.lastError).toBe("unknown error");
	});

	it("processes entries in input order", async () => {
		const q = [entry("1", "a"), entry("2", "b"), entry("3", "c")];
		const seen: string[] = [];
		await syncQueue(q, async (e) => {
			seen.push(e.id);
			return { ok: true };
		});
		expect(seen).toEqual(["1", "2", "3"]);
	});
});

describe("mergeBidirectional", () => {
	it("local-wins on conflict", () => {
		const out = mergeBidirectional(
			{ k: "local" },
			{ k: "remote" },
			"local-wins",
		);
		expect(out.k).toBe("local");
	});

	it("remote-wins on conflict", () => {
		const out = mergeBidirectional(
			{ k: "local" },
			{ k: "remote" },
			"remote-wins",
		);
		expect(out.k).toBe("remote");
	});

	it("newer-wins uses timestamp map", () => {
		const out = mergeBidirectional(
			{ k: "local" },
			{ k: "remote" },
			"newer-wins",
			{ k: { local: 100, remote: 200 } },
		);
		expect(out.k).toBe("remote");
	});

	it("newer-wins local when local is later", () => {
		const out = mergeBidirectional(
			{ k: "local" },
			{ k: "remote" },
			"newer-wins",
			{ k: { local: 200, remote: 100 } },
		);
		expect(out.k).toBe("local");
	});

	it("newer-wins falls back to local when timestamps missing", () => {
		const out = mergeBidirectional(
			{ k: "local" },
			{ k: "remote" },
			"newer-wins",
		);
		expect(out.k).toBe("local");
	});

	it("local-only keys preserved", () => {
		const out = mergeBidirectional({ k1: "L" }, {}, "local-wins");
		expect(out.k1).toBe("L");
	});

	it("remote-only keys preserved", () => {
		const out = mergeBidirectional({}, { k2: "R" }, "remote-wins");
		expect(out.k2).toBe("R");
	});

	it("local-only + remote-only merged", () => {
		const out = mergeBidirectional({ k1: "L" }, { k2: "R" }, "local-wins");
		expect(out).toEqual({ k1: "L", k2: "R" });
	});

	it("newer-wins equal timestamps → local", () => {
		const out = mergeBidirectional(
			{ k: "local" },
			{ k: "remote" },
			"newer-wins",
			{ k: { local: 100, remote: 100 } },
		);
		expect(out.k).toBe("local");
	});
});

describe("buildOutboxEntry", () => {
	it("produces zero-attempt entry", () => {
		const e = buildOutboxEntry("id1", "key1", { v: 1 }, "put", 100);
		expect(e.attempts).toBe(0);
		expect(e.ts).toBe(100);
		expect(e.id).toBe("id1");
		expect(e.key).toBe("key1");
		expect(e.value).toEqual({ v: 1 });
	});

	it("uses current time when omitted", () => {
		const before = Date.now();
		const e = buildOutboxEntry("x", "k", null, "delete");
		const after = Date.now();
		expect(e.ts).toBeGreaterThanOrEqual(before);
		expect(e.ts).toBeLessThanOrEqual(after);
	});
});

describe("serializeOutbox / parseOutbox", () => {
	it("round-trips", () => {
		const q: SyncOutboxEntry[] = [
			{
				id: "1",
				key: "k1",
				value: { nested: true },
				op: "put",
				ts: 100,
				attempts: 0,
			},
			{
				id: "2",
				key: "k2",
				value: null,
				op: "delete",
				ts: 200,
				attempts: 1,
				lastError: "boom",
			},
		];
		const json = serializeOutbox(q);
		const back = parseOutbox(json);
		expect(back).toEqual(q);
	});

	it("coerces unserializable values to strings", () => {
		const circular: Record<string, unknown> = { x: 1 };
		circular["self"] = circular;
		const json = serializeOutbox([
			{
				id: "1",
				key: "k1",
				value: circular,
				op: "put",
				ts: 100,
				attempts: 0,
			},
		]);
		expect(json).toContain("[object Object]");
	});

	it("returns empty array on invalid JSON", () => {
		expect(parseOutbox("not json")).toEqual([]);
	});

	it("returns empty array on non-array JSON", () => {
		expect(parseOutbox('{"a":1}')).toEqual([]);
	});

	it("skips invalid entries", () => {
		const json = JSON.stringify([
			{ id: "1", key: "k", value: 1, op: "put", ts: 100, attempts: 0 },
			{ id: "2" }, // missing fields
			{ id: "3", key: "k3", value: 3, op: "INVALID", ts: 100 }, // bad op
			null,
		]);
		const back = parseOutbox(json);
		expect(back).toHaveLength(1);
		expect(back[0]?.id).toBe("1");
	});

	it("defaults attempts to 0 when missing", () => {
		const json = JSON.stringify([
			{ id: "1", key: "k", value: 1, op: "put", ts: 100 }, // no attempts
		]);
		const back = parseOutbox(json);
		expect(back[0]?.attempts).toBe(0);
	});
});

describe("dedupeByKey", () => {
	it("keeps latest ts per key", () => {
		const q = [
			entry("1", "a", "put", 1, 100),
			entry("2", "a", "put", 2, 200),
			entry("3", "b", "put", 3, 150),
		];
		const deduped = dedupeByKey(q);
		expect(deduped).toHaveLength(2);
		const a = deduped.find((e) => e.key === "a");
		expect(a?.ts).toBe(200);
	});

	it("sorts by ts ascending", () => {
		const q = [
			entry("1", "b", "put", 1, 200),
			entry("2", "a", "put", 1, 100),
		];
		const deduped = dedupeByKey(q);
		expect(deduped[0]?.key).toBe("a");
		expect(deduped[1]?.key).toBe("b");
	});
});

describe("capQueue", () => {
	it("keeps all when under cap", () => {
		const q = [entry("1", "a"), entry("2", "b")];
		expect(capQueue(q, 10)).toHaveLength(2);
	});
	it("truncates to most recent N", () => {
		const q = [
			entry("1", "a", "put", 1, 100),
			entry("2", "b", "put", 1, 200),
			entry("3", "c", "put", 1, 300),
		];
		const capped = capQueue(q, 2);
		expect(capped).toHaveLength(2);
		expect(capped[0]?.id).toBe("2");
		expect(capped[1]?.id).toBe("3");
	});
	it("handles empty queue", () => {
		expect(capQueue([], 5)).toEqual([]);
	});
});

describe("cacpQueue typo import guard", () => {
	it("throws if undefined", () => {
		expect(() =>
			(_capQueue as unknown as () => void)([entry("1", "a")], 5),
		).toThrow();
	});
});
