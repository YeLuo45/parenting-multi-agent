/**
 * Tests for WebMemoryLayer — pure in-memory MemoryLayer implementation.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebMemoryLayer } from "../src/memory-web.js";

let memory: WebMemoryLayer;

beforeEach(() => {
	memory = new WebMemoryLayer();
});

afterEach(() => {
	memory.close();
});

describe("WebMemoryLayer — L1 Children", () => {
	it("upsertChild stores and returns child", () => {
		const c = memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		expect(c.id).toBe("c1");
		expect(c.name).toBe("A");
		expect(memory.getChild("c1")?.name).toBe("A");
	});

	it("upsertChild overwrites existing child", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		memory.upsertChild({
			id: "c1",
			name: "B",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		expect(memory.getChild("c1")?.name).toBe("B");
	});

	it("getChild returns null for missing child", () => {
		expect(memory.getChild("nope")).toBeNull();
	});

	it("listChildren returns all children", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		memory.upsertChild({
			id: "c2",
			name: "B",
			birthDate: "2024-06-01",
			stage: "infant",
		});
		expect(memory.listChildren()).toHaveLength(2);
	});

	it("deleteChild removes child and records delta", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		expect(memory.deleteChild("c1")).toBe(true);
		expect(memory.getChild("c1")).toBeNull();
		expect(memory.deleteChild("c1")).toBe(false);
	});
});

describe("WebMemoryLayer — L2 Facts", () => {
	it("addFact stores and returns fact", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		const f = memory.addFact("c1", "vaccine", "bcg", "done");
		expect(f.childId).toBe("c1");
		expect(f.key).toBe("bcg");
	});

	it("getFacts returns child facts optionally filtered", () => {
		memory.addFact("c1", "vaccine", "bcg", "done");
		memory.addFact("c1", "milestone", "walk", "12m");
		memory.addFact("c2", "vaccine", "mmr", "done");
		expect(memory.getFacts("c1")).toHaveLength(2);
		expect(memory.getFacts("c1", "vaccine")).toHaveLength(1);
		expect(memory.getFacts("c2")).toHaveLength(1);
	});

	it("deleteFact removes and records delta", () => {
		const f = memory.addFact("c1", "vaccine", "bcg", "done");
		expect(memory.deleteFact(f.id)).toBe(true);
		expect(memory.getFacts("c1")).toHaveLength(0);
	});
});

describe("WebMemoryLayer — L3 Episodes", () => {
	it("addEpisode stores episode with content", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		const ep = memory.addEpisode("c1", "qa", { question: "宝宝发烧" });
		expect(ep.childId).toBe("c1");
		expect(ep.content).toEqual({ question: "宝宝发烧" });
	});

	it("getEpisodes filters by type and limit", () => {
		memory.addEpisode("c1", "qa", { question: "Q1" });
		memory.addEpisode("c1", "qa", { question: "Q2" });
		memory.addEpisode("c1", "visit", { visit: "v1" });
		expect(memory.getEpisodes("c1")).toHaveLength(3);
		expect(memory.getEpisodes("c1", "qa")).toHaveLength(2);
		expect(memory.getEpisodes("c1", "qa", 1)).toHaveLength(1);
	});

	it("getEpisodes returns empty for missing child", () => {
		expect(memory.getEpisodes("ghost")).toEqual([]);
	});
});

describe("WebMemoryLayer — L4 Sessions", () => {
	it("startSession creates and returns session", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		const s = memory.startSession("c1", { topic: "sleep" });
		expect(s.childId).toBe("c1");
		expect(s.context).toEqual({ topic: "sleep" });
		expect(memory.getSession(s.id)?.id).toBe(s.id);
	});

	it("getSession returns null for missing session", () => {
		expect(memory.getSession("ghost")).toBeNull();
	});

	it("updateSession updates context and lastActive", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		const s = memory.startSession("c1");
		const before = s.lastActive;
		const updated = memory.updateSession(s.id, { topic: "nutrition" });
		expect(updated).not.toBeNull();
		expect(updated?.context).toEqual({ topic: "nutrition" });
		expect(updated?.lastActive >= before).toBe(true);
	});

	it("updateSession returns null for missing session", () => {
		expect(memory.updateSession("ghost", {})).toBeNull();
	});
});

describe("WebMemoryLayer — Agent Feedback", () => {
	it("stores and returns recent feedback for one agent", () => {
		const a = memory.addFeedback({
			childId: "c1",
			episodeId: "s1",
			agentId: "educator",
			rating: 5,
		});
		const b = memory.addFeedback({
			childId: "c1",
			episodeId: "s2",
			agentId: "educator",
			rating: 1,
		});
		memory.addFeedback({
			childId: "c1",
			episodeId: "s3",
			agentId: "pediatrician",
			rating: 5,
		});
		expect(a.id).toMatch(/^fb_/);
		expect(b.createdAt).toBeDefined();
		expect(memory.getFeedback("educator")).toHaveLength(2);
		expect(memory.getFeedback("educator", 1)).toHaveLength(1);
		expect(memory.getDeltaStats().byTable.feedback).toBe(3);
	});
});

describe("WebMemoryLayer — Delta Log", () => {
	it("records deltas for every write", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		memory.addFact("c1", "vaccine", "bcg", "done");
		memory.addEpisode("c1", "qa", { q: "test" });
		memory.startSession("c1");
		const deltas = memory.getDeltaLog();
		expect(deltas.length).toBe(4);
		expect(deltas.map((d) => d.tableName)).toEqual([
			"children",
			"facts",
			"episodes",
			"sessions",
		]);
	});

	it("all deltas start unsynced", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		const unsynced = memory.getUnsyncedDeltas();
		expect(unsynced.length).toBe(1);
		expect(unsynced[0].syncedAt).toBeNull();
	});

	it("markDeltaSynced marks up to given id", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		memory.upsertChild({
			id: "c2",
			name: "B",
			birthDate: "2024-06-01",
			stage: "infant",
		});
		const all = memory.getDeltaLog();
		const count = memory.markDeltaSynced(all[0].id);
		expect(count).toBe(1);
		expect(memory.getUnsyncedDeltas().length).toBe(1);
	});

	it("getDeltaStats returns correct summary", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		memory.addFact("c1", "vaccine", "bcg", "done");
		const stats = memory.getDeltaStats();
		expect(stats.total).toBe(2);
		expect(stats.unsynced).toBe(2);
		expect(stats.byTable).toHaveProperty("children");
		expect(stats.byTable).toHaveProperty("facts");
		expect(stats.byOp).toHaveProperty("upsert");
		expect(stats.byOp).toHaveProperty("insert");
	});

	it("getDeltaLog with includeUnsynced=false returns only synced", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		memory.upsertChild({
			id: "c2",
			name: "B",
			birthDate: "2024-06-01",
			stage: "infant",
		});
		const all = memory.getDeltaLog();
		memory.markDeltaSynced(all[0].id);
		const syncedOnly = memory.getDeltaLog(0, false);
		expect(syncedOnly.length).toBe(1);
	});

	it("getDeltaLog with since filters by id", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		memory.upsertChild({
			id: "c2",
			name: "B",
			birthDate: "2024-06-01",
			stage: "infant",
		});
		const all = memory.getDeltaLog();
		const since = all[0].id;
		const filtered = memory.getDeltaLog(since);
		expect(filtered.length).toBe(1);
	});

	it("getUnsyncedDeltas with limit caps results", () => {
		for (let i = 0; i < 5; i++) {
			memory.upsertChild({
				id: `c-${i}`,
				name: `C${i}`,
				birthDate: "2024-01-01",
				stage: "toddler",
			});
		}
		const capped = memory.getUnsyncedDeltas(3);
		expect(capped.length).toBe(3);
	});
});

describe("WebMemoryLayer — Lifecycle", () => {
	it("close clears all data and sets isClosed", () => {
		memory.upsertChild({
			id: "c1",
			name: "A",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		expect(memory.isClosed).toBe(false);
		memory.close();
		expect(memory.isClosed).toBe(true);
		expect(memory.listChildren()).toEqual([]);
	});

	it("close is idempotent", () => {
		memory.close();
		expect(memory.isClosed).toBe(true);
		memory.close();
		expect(memory.isClosed).toBe(true);
	});
});
