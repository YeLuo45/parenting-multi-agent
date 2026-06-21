/**
 * Tests for multi-device sync protocol.
 */
import { describe, expect, it } from "vitest";
import {
	SyncEngine,
	buildPushResult,
	findRowDelta,
	fullSync,
	highestId,
	lwwResolve,
	mergeDeltas,
	selectDeltasSince,
	selectUnsyncedDeltas,
	type DeltaEntry,
} from "../src/index.js";

function makeDelta(overrides: Partial<DeltaEntry> & Pick<DeltaEntry, "id">): DeltaEntry {
	return {
		id: overrides.id,
		tableName: overrides.tableName ?? "children",
		rowId: overrides.rowId ?? "row-1",
		op: overrides.op ?? "upsert",
		payload: overrides.payload ?? {},
		syncedAt: overrides.syncedAt ?? null,
		createdAt: overrides.createdAt ?? "2026-06-20T00:00:00.000Z",
	};
}

describe("selectDeltasSince", () => {
	it("returns deltas with id > sinceId", () => {
		const deltas = [
			makeDelta({ id: 1 }),
			makeDelta({ id: 2 }),
			makeDelta({ id: 3 }),
		];
		expect(selectDeltasSince(deltas, 1)).toHaveLength(2);
		expect(selectDeltasSince(deltas, 1).map((d) => d.id)).toEqual([2, 3]);
	});

	it("returns empty when sinceId >= max", () => {
		const deltas = [makeDelta({ id: 1 }), makeDelta({ id: 2 })];
		expect(selectDeltasSince(deltas, 2)).toEqual([]);
		expect(selectDeltasSince(deltas, 5)).toEqual([]);
	});

	it("returns all deltas when sinceId is 0", () => {
		const deltas = [makeDelta({ id: 1 }), makeDelta({ id: 2 })];
		expect(selectDeltasSince(deltas, 0)).toHaveLength(2);
	});

	it("returns empty for empty list", () => {
		expect(selectDeltasSince([], 0)).toEqual([]);
	});
});

describe("selectUnsyncedDeltas", () => {
	it("returns only deltas with syncedAt === null", () => {
		const deltas = [
			makeDelta({ id: 1, syncedAt: null }),
			makeDelta({ id: 2, syncedAt: "2026-06-20T01:00:00Z" }),
			makeDelta({ id: 3, syncedAt: null }),
		];
		expect(selectUnsyncedDeltas(deltas).map((d) => d.id)).toEqual([1, 3]);
	});

	it("returns empty when all synced", () => {
		const deltas = [
			makeDelta({ id: 1, syncedAt: "t1" }),
			makeDelta({ id: 2, syncedAt: "t2" }),
		];
		expect(selectUnsyncedDeltas(deltas)).toEqual([]);
	});
});

describe("highestId", () => {
	it("returns max id", () => {
		expect(highestId([makeDelta({ id: 1 }), makeDelta({ id: 5 }), makeDelta({ id: 3 })])).toBe(5);
	});

	it("returns 0 for empty list", () => {
		expect(highestId([])).toBe(0);
	});

	it("handles single element", () => {
		expect(highestId([makeDelta({ id: 42 })])).toBe(42);
	});
});

describe("lwwResolve", () => {
	it("remote wins when remote.createdAt is later", () => {
		const local = makeDelta({ id: 1, createdAt: "2026-06-20T00:00:00Z", payload: { v: "local" } });
		const remote = makeDelta({ id: 2, createdAt: "2026-06-20T01:00:00Z", payload: { v: "remote" } });
		expect(lwwResolve(local, remote)).toBe(remote);
	});

	it("local wins when local.createdAt is later", () => {
		const local = makeDelta({ id: 1, createdAt: "2026-06-20T02:00:00Z", payload: { v: "local" } });
		const remote = makeDelta({ id: 2, createdAt: "2026-06-20T01:00:00Z", payload: { v: "remote" } });
		expect(lwwResolve(local, remote)).toBe(local);
	});

	it("higher id wins when timestamps are equal", () => {
		const local = makeDelta({ id: 1, createdAt: "t", payload: { v: "local" } });
		const remote = makeDelta({ id: 2, createdAt: "t", payload: { v: "remote" } });
		expect(lwwResolve(local, remote)).toBe(remote);
	});

	it("lower id wins when timestamps are equal and remote id is lower", () => {
		const local = makeDelta({ id: 2, createdAt: "t", payload: { v: "local" } });
		const remote = makeDelta({ id: 1, createdAt: "t", payload: { v: "remote" } });
		expect(lwwResolve(local, remote)).toBe(local);
	});
});

describe("findRowDelta", () => {
	const deltas = [
		makeDelta({ id: 1, tableName: "children", rowId: "alice" }),
		makeDelta({ id: 2, tableName: "facts", rowId: "fact-1" }),
		makeDelta({ id: 3, tableName: "children", rowId: "bob" }),
		makeDelta({ id: 4, tableName: "children", rowId: "alice" }), // newer version of alice
	];

	it("finds the latest delta for a row", () => {
		const found = findRowDelta(deltas, "children", "alice");
		expect(found?.id).toBe(4);
	});

	it("returns null when row not found", () => {
		expect(findRowDelta(deltas, "children", "ghost")).toBeNull();
		expect(findRowDelta(deltas, "sessions", "alice")).toBeNull();
	});

	it("returns null for empty list", () => {
		expect(findRowDelta([], "children", "alice")).toBeNull();
	});
});

describe("mergeDeltas", () => {
	it("appends new remote deltas", () => {
		const local = [makeDelta({ id: 1, rowId: "row-1" })];
		const remote = [makeDelta({ id: 2, rowId: "row-2" })];
		const { merged, result } = mergeDeltas(local, remote);
		expect(result.applied).toBe(1);
		expect(result.conflicts).toBe(0);
		expect(merged.map((d) => d.id)).toEqual([1, 2]);
	});

	it("does not mutate input arrays", () => {
		const local = [makeDelta({ id: 1, rowId: "row-1" })];
		const remote = [makeDelta({ id: 2, rowId: "row-2" })];
		const localCopy = [...local];
		const remoteCopy = [...remote];
		mergeDeltas(local, remote);
		expect(local).toEqual(localCopy);
		expect(remote).toEqual(remoteCopy);
	});

	it("resolves conflict with remote winning when remote is newer", () => {
		const local = [
			makeDelta({
				id: 1,
				tableName: "children",
				rowId: "alice",
				createdAt: "2026-06-20T00:00:00Z",
				payload: { name: "Alice" },
			}),
		];
		const remote = [
			makeDelta({
				id: 2,
				tableName: "children",
				rowId: "alice",
				createdAt: "2026-06-20T01:00:00Z",
				payload: { name: "Alicia" },
			}),
		];
		const { merged, result } = mergeDeltas(local, remote);
		expect(result.applied).toBe(0);
		expect(result.conflicts).toBe(1);
		expect(merged[0].payload).toEqual({ name: "Alicia" });
	});

	it("handles different rows at same id (rare)", () => {
		const local = [makeDelta({ id: 1, tableName: "children", rowId: "alice" })];
		const remote = [makeDelta({ id: 1, tableName: "facts", rowId: "fact-1" })];
		const { result } = mergeDeltas(local, remote);
		expect(result.applied).toBe(1);
	});

	it("sorts merged by id", () => {
		const local = [makeDelta({ id: 3, rowId: "row-3" })];
		const remote = [
			makeDelta({ id: 1, rowId: "row-1" }),
			makeDelta({ id: 2, rowId: "row-2" }),
		];
		const { merged } = mergeDeltas(local, remote);
		expect(merged.map((d) => d.id)).toEqual([1, 2, 3]);
	});

	it("returns correct newHighWater", () => {
		const local = [makeDelta({ id: 5, rowId: "row-5" })];
		const remote = [makeDelta({ id: 10, rowId: "row-10" })];
		const { result } = mergeDeltas(local, remote);
		expect(result.newHighWater).toBe(10);
	});
});

describe("buildPushResult", () => {
	it("returns deltas since remoteLastSyncedId", () => {
		const local = [
			makeDelta({ id: 1 }),
			makeDelta({ id: 2 }),
			makeDelta({ id: 3 }),
		];
		const result = buildPushResult(local, 1);
		expect(result.deltas.map((d) => d.id)).toEqual([2, 3]);
		expect(result.count).toBe(2);
		expect(result.highWater).toBe(3);
	});

	it("returns empty when remote is caught up", () => {
		const local = [makeDelta({ id: 1 })];
		const result = buildPushResult(local, 1);
		expect(result.deltas).toEqual([]);
		expect(result.count).toBe(0);
		expect(result.highWater).toBe(0);
	});

	it("returns all deltas when since=0", () => {
		const local = [makeDelta({ id: 1 }), makeDelta({ id: 2 })];
		const result = buildPushResult(local, 0);
		expect(result.count).toBe(2);
	});
});

describe("SyncEngine", () => {
	it("creates fresh state for new device", () => {
		const engine = new SyncEngine();
		const state = engine.getDeviceState("device-a");
		expect(state.deviceId).toBe("device-a");
		expect(state.lastSyncedDeltaId).toBe(0);
	});

	it("returns existing state for same device", () => {
		const engine = new SyncEngine();
		const first = engine.getDeviceState("device-a");
		first.lastSyncedDeltaId = 42;
		const second = engine.getDeviceState("device-a");
		expect(second.lastSyncedDeltaId).toBe(42);
	});

	it("push advances lastSyncedDeltaId", () => {
		const engine = new SyncEngine();
		const local = [makeDelta({ id: 1 }), makeDelta({ id: 2 })];
		const result = engine.push(local, "device-a");
		expect(result.count).toBe(2);
		expect(engine.getDeviceState("device-a").lastSyncedDeltaId).toBe(2);
	});

	it("push returns empty when device is caught up", () => {
		const engine = new SyncEngine();
		const local = [makeDelta({ id: 1 }), makeDelta({ id: 2 })];
		engine.push(local, "device-a");
		const result = engine.push(local, "device-a");
		expect(result.count).toBe(0);
	});

	it("pull merges remote deltas and updates cursor", () => {
		const engine = new SyncEngine();
		const local = [makeDelta({ id: 1, rowId: "row-1" })];
		const remote = [makeDelta({ id: 2, rowId: "row-2" })];
		const result = engine.pull(local, remote, "device-a");
		expect(result.applied).toBe(1);
		expect(engine.getDeviceState("device-a").lastSyncedDeltaId).toBe(2);
	});

	it("pull resolves conflicts and counts them", () => {
		const engine = new SyncEngine();
		const local = [
			makeDelta({
				id: 1,
				tableName: "children",
				rowId: "alice",
				createdAt: "2026-06-20T00:00:00Z",
				payload: { name: "Alice" },
			}),
		];
		const remote = [
			makeDelta({
				id: 1,
				tableName: "children",
				rowId: "alice",
				createdAt: "2026-06-20T01:00:00Z",
				payload: { name: "Alicia" },
			}),
		];
		const result = engine.pull(local, remote, "device-a");
		expect(result.conflicts).toBe(1);
	});

	it("listDevices returns all known devices", () => {
		const engine = new SyncEngine();
		engine.getDeviceState("a");
		engine.getDeviceState("b");
		expect(engine.listDevices()).toHaveLength(2);
	});

	it("reset clears all state", () => {
		const engine = new SyncEngine();
		engine.getDeviceState("a");
		engine.reset();
		expect(engine.listDevices()).toHaveLength(0);
	});

	it("tracks multiple devices independently", () => {
		const engine = new SyncEngine();
		const local = [makeDelta({ id: 1 })];
		engine.push(local, "device-a");
		expect(engine.getDeviceState("device-a").lastSyncedDeltaId).toBe(1);
		expect(engine.getDeviceState("device-b").lastSyncedDeltaId).toBe(0);
	});
});

describe("fullSync", () => {
	it("runs push and pull in one call", () => {
		const engine = new SyncEngine();
		const local = [
			makeDelta({ id: 1, rowId: "row-1" }),
			makeDelta({ id: 2, rowId: "row-2" }),
		];
		const remote = [makeDelta({ id: 3, rowId: "row-3" })];
		const result = fullSync(engine, local, remote, "device-a");
		expect(result.push.count).toBe(2);
		expect(result.pull.applied).toBe(1);
	});

	it("advances cursor after full sync", () => {
		const engine = new SyncEngine();
		const local = [makeDelta({ id: 1, rowId: "row-1" })];
		const remote = [makeDelta({ id: 2, rowId: "row-2" })];
		fullSync(engine, local, remote, "device-a");
		expect(engine.getDeviceState("device-a").lastSyncedDeltaId).toBe(2);
	});
});