import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { MemoryLayer, computeStage, genId, L0_RULES, matchL0Rule } from "../src/index.js";
import type { ChildProfile, ChildStage } from "../src/index.js";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string => new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

describe("MemoryLayer", () => {
	let memory: MemoryLayer;

	beforeEach(() => {
		memory = new MemoryLayer({ dbPath: ":memory:" });
	});

	afterEach(() => {
		memory.close();
	});

	describe("L1: Children (Index)", () => {
		it("upserts a new child and computes stage from birth date", () => {
			const child = memory.upsertChild({
				id: "c1",
				name: "小明",
				birthDate: daysAgo(90), // 3 months old
				stage: undefined as unknown as ChildStage, // will be computed
			} as ChildProfile);
			expect(child.id).toBe("c1");
			expect(child.name).toBe("小明");
			expect(child.stage).toBe("infant");
		});

		it("updates an existing child", () => {
			memory.upsertChild({ id: "c1", name: "小明", birthDate: daysAgo(90) });
			const updated = memory.upsertChild({ id: "c1", name: "小明 (大名叫张明)", birthDate: daysAgo(90) });
			expect(updated.name).toBe("小明 (大名叫张明)");
			const fetched = memory.getChild("c1");
			expect(fetched?.name).toBe("小明 (大名叫张明)");
		});

		it("returns null for non-existent child", () => {
			expect(memory.getChild("nope")).toBeNull();
		});

		it("lists all children sorted by update time", () => {
			memory.upsertChild({ id: "c1", name: "A", birthDate: daysAgo(30) });
			memory.upsertChild({ id: "c2", name: "B", birthDate: daysAgo(60) });
			memory.upsertChild({ id: "c3", name: "C", birthDate: daysAgo(90) });
			const list = memory.listChildren();
			expect(list.length).toBe(3);
			expect(list.map((c) => c.id).sort()).toEqual(["c1", "c2", "c3"]);
		});

		it("deletes a child and returns true", () => {
			memory.upsertChild({ id: "c1", name: "A", birthDate: daysAgo(30) });
			expect(memory.deleteChild("c1")).toBe(true);
			expect(memory.getChild("c1")).toBeNull();
		});

		it("delete returns false for non-existent", () => {
			expect(memory.deleteChild("nope")).toBe(false);
		});

		it("stores child metadata as JSON", () => {
			const child = memory.upsertChild({
				id: "c1",
				name: "A",
				birthDate: daysAgo(30),
				metadata: { allergies: ["peanut"], bloodType: "O+" },
			});
			expect(child.metadata).toEqual({ allergies: ["peanut"], bloodType: "O+" });
			const fetched = memory.getChild("c1");
			expect(fetched?.metadata).toEqual({ allergies: ["peanut"], bloodType: "O+" });
		});
	});

	describe("L2: Facts (Global)", () => {
		beforeEach(() => {
			memory.upsertChild({ id: "c1", name: "A", birthDate: daysAgo(90) });
		});

		it("adds and retrieves a fact", () => {
			const fact = memory.addFact("c1", "vaccine", "BCG", { date: daysAgo(60), site: "left arm" });
			expect(fact.id).toMatch(/^fact_/);
			expect(fact.category).toBe("vaccine");
			const facts = memory.getFacts("c1");
			expect(facts.length).toBe(1);
			expect(facts[0].value).toEqual({ date: daysAgo(60), site: "left arm" });
		});

		it("filters facts by category", () => {
			memory.addFact("c1", "vaccine", "BCG", { ok: true });
			memory.addFact("c1", "milestone", "smile", { age: "2m" });
			memory.addFact("c1", "vaccine", "HepB", { ok: true });
			const vaccines = memory.getFacts("c1", "vaccine");
			const milestones = memory.getFacts("c1", "milestone");
			expect(vaccines.length).toBe(2);
			expect(milestones.length).toBe(1);
		});

		it("deletes a fact", () => {
			const f = memory.addFact("c1", "medical", "allergy", { type: "peanut" });
			expect(memory.deleteFact(f.id)).toBe(true);
			expect(memory.deleteFact(f.id)).toBe(false);
		});

		it("returns facts in reverse-chronological order", async () => {
			const f1 = memory.addFact("c1", "medical", "visit-1", { date: daysAgo(10) });
			// small delay to ensure different createdAt
			await new Promise((r) => setTimeout(r, 5));
			const f2 = memory.addFact("c1", "medical", "visit-2", { date: daysAgo(5) });
			const facts = memory.getFacts("c1");
			expect(facts[0].id).toBe(f2.id);
			expect(facts[1].id).toBe(f1.id);
		});
	});

	describe("L3: Episodes (Episodic)", () => {
		beforeEach(() => {
			memory.upsertChild({ id: "c1", name: "A", birthDate: daysAgo(90) });
		});

		it("adds a Q&A episode", () => {
			const ep = memory.addEpisode("c1", "qa", {
				question: "宝宝3个月夜醒怎么办",
				answer: "建立规律作息",
				agentId: "pediatrician",
			});
			expect(ep.type).toBe("qa");
			const eps = memory.getEpisodes("c1", "qa");
			expect(eps.length).toBe(1);
			expect(eps[0].content).toMatchObject({ question: expect.any(String) });
		});

		it("filters episodes by type", () => {
			memory.addEpisode("c1", "qa", { q: 1 });
			memory.addEpisode("c1", "visit", { doctor: "Dr. Lee" });
			memory.addEpisode("c1", "qa", { q: 2 });
			expect(memory.getEpisodes("c1", "qa").length).toBe(2);
			expect(memory.getEpisodes("c1", "visit").length).toBe(1);
		});

		it("supports limit parameter", () => {
			for (let i = 0; i < 5; i++) {
				memory.addEpisode("c1", "qa", { i });
			}
			const eps = memory.getEpisodes("c1", "qa", 3);
			expect(eps.length).toBe(3);
		});
	});

	describe("L4: Sessions (Working Memory)", () => {
		beforeEach(() => {
			memory.upsertChild({ id: "c1", name: "A", birthDate: daysAgo(90) });
		});

		it("starts a session with initial context", () => {
			const sess = memory.startSession("c1", { topic: "夜醒" });
			expect(sess.childId).toBe("c1");
			expect(sess.context).toEqual({ topic: "夜醒" });
		});

		it("updates session context and last_active", async () => {
			const sess = memory.startSession("c1", { topic: "a" });
			await new Promise((r) => setTimeout(r, 10));
			const updated = memory.updateSession(sess.id, { topic: "b" });
			expect(updated?.context).toEqual({ topic: "b" });
			expect(new Date(updated!.lastActive).getTime()).toBeGreaterThan(new Date(sess.startedAt).getTime());
		});

		it("returns null when updating non-existent session", () => {
			expect(memory.updateSession("nope", {})).toBeNull();
		});

		it("retrieves session by id", () => {
			const sess = memory.startSession("c1", { x: 1 });
			const fetched = memory.getSession(sess.id);
			expect(fetched?.context).toEqual({ x: 1 });
		});

		it("returns null for non-existent session", () => {
			expect(memory.getSession("nope")).toBeNull();
		});

		it("getActiveSession returns most recent within 24h", () => {
			const sess = memory.startSession("c1", { x: 1 });
			const active = memory.getActiveSession("c1");
			expect(active?.id).toBe(sess.id);
		});

		it("getActiveSession returns null for old sessions", () => {
			memory.startSession("c1", { x: 1 });
			// manually backdate the last_active to 48h ago
			memory.db
				.prepare(`UPDATE sessions SET last_active = ?`)
				.run(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
			expect(memory.getActiveSession("c1")).toBeNull();
		});
	});

	describe("Delta Log (PowerSync-ready)", () => {
		beforeEach(() => {
			memory.upsertChild({ id: "c1", name: "A", birthDate: daysAgo(90) });
		});

		it("records a delta on every child write", () => {
			const beforeCount = memory.getDeltaLog().length;
			memory.upsertChild({ id: "c1", name: "A renamed", birthDate: daysAgo(90) });
			const afterCount = memory.getDeltaLog().length;
			expect(afterCount - beforeCount).toBe(1);
		});

		it("records a delta on every fact add", () => {
			const before = memory.getDeltaLog().length;
			memory.addFact("c1", "vaccine", "BCG", {});
			expect(memory.getDeltaLog().length - before).toBe(1);
		});

		it("records a delta on every episode add", () => {
			const before = memory.getDeltaLog().length;
			memory.addEpisode("c1", "qa", { q: "test" });
			expect(memory.getDeltaLog().length - before).toBe(1);
		});

		it("records a delta on session start and update", () => {
			const beforeCount = memory.getDeltaLog().length;
			const sess = memory.startSession("c1", { x: 1 });
			memory.updateSession(sess.id, { x: 2 });
			const allDeltas = memory.getDeltaLog();
			const newDeltas = allDeltas.slice(beforeCount);
			expect(newDeltas.length).toBe(2);
			expect(newDeltas[0].op).toBe("insert");
			expect(newDeltas[1].op).toBe("update");
		});

		it("getDeltaLog(since) returns only entries after the given id", () => {
			memory.upsertChild({ id: "c2", name: "B", birthDate: daysAgo(60) });
			memory.upsertChild({ id: "c3", name: "C", birthDate: daysAgo(30) });
			const all = memory.getDeltaLog();
			expect(all.length).toBeGreaterThanOrEqual(2);
			const since = all[0].id;
			const newDeltas = memory.getDeltaLog(since);
			expect(newDeltas.length).toBe(all.length - 1);
		});

		it("markDeltaSynced updates synced_at and returns count", () => {
			memory.upsertChild({ id: "c2", name: "B", birthDate: daysAgo(60) });
			const all = memory.getDeltaLog();
			const count = memory.markDeltaSynced(all[all.length - 1].id);
			expect(count).toBeGreaterThan(0);
			const allSynced = memory.getDeltaLog(0, true);
			const allDone = allSynced.every((d) => d.syncedAt !== null);
			expect(allDone).toBe(true);
		});

		it("getDeltaLog with includeUnsynced=false only returns synced", () => {
			memory.upsertChild({ id: "c2", name: "B", birthDate: daysAgo(60) });
			memory.upsertChild({ id: "c3", name: "C", birthDate: daysAgo(30) });
			const all = memory.getDeltaLog();
			memory.markDeltaSynced(all[0].id);
			const syncedOnly = memory.getDeltaLog(0, false);
			expect(syncedOnly.length).toBe(1);
		});
	});

	describe("L0 Rules (Guardrails)", () => {
		it("matches infant fever emergency", () => {
			const rule = matchL0Rule("我家宝宝3个月发烧38.5度怎么办");
			expect(rule?.id).toBe("R001_infant_fever");
			expect(rule?.severity).toBe("emergency");
		});

		it("matches English infant fever", () => {
			const rule = matchL0Rule("My 3 month old has a fever of 38.5");
			expect(rule).not.toBeNull();
			expect(rule?.severity).toBe("emergency");
		});

		it("matches breathing difficulty", () => {
			const rule = matchL0Rule("宝宝嘴唇发紫呼吸困难");
			expect(rule?.severity).toBe("emergency");
		});

		it("matches self-harm ideation", () => {
			const rule = matchL0Rule("我家孩子说想死");
			expect(rule?.id).toBe("R010_self_harm");
		});

		it("returns null for normal parenting questions", () => {
			const rule = matchL0Rule("宝宝不爱吃辅食怎么办");
			expect(rule).toBeNull();
		});

		it("L0_RULES has expected structure", () => {
			expect(L0_RULES.length).toBeGreaterThan(5);
			for (const rule of L0_RULES) {
				expect(rule.id).toMatch(/^R\d{3}_/);
				expect(rule.pattern).toBeInstanceOf(RegExp);
				expect(rule.severity).toMatch(/^(info|warn|emergency)$/);
			}
		});
	});

	describe("Persistence", () => {
		it("data survives DB reopen (file-based)", () => {
			const path = `/tmp/test_memory_${Date.now()}.sqlite`;
			const m1 = new MemoryLayer({ dbPath: path });
			m1.upsertChild({ id: "c1", name: "持久化测试", birthDate: daysAgo(30) });
			m1.close();

			const m2 = new MemoryLayer({ dbPath: path });
			const child = m2.getChild("c1");
			expect(child?.name).toBe("持久化测试");
			m2.close();
		});
	});

	describe("Helpers", () => {
		it("computeStage returns correct stage for each age", () => {
			expect(computeStage(daysAgo(0), TODAY)).toBe("newborn");
			expect(computeStage(daysAgo(15), TODAY)).toBe("newborn"); // < 1 month
			expect(computeStage(daysAgo(35), TODAY)).toBe("infant"); // > 1 month
			expect(computeStage(daysAgo(180), TODAY)).toBe("infant"); // 6 months
			expect(computeStage(daysAgo(365 * 2), TODAY)).toBe("toddler");
			expect(computeStage(daysAgo(365 * 5), TODAY)).toBe("preschool");
			expect(computeStage(daysAgo(365 * 8), TODAY)).toBe("school_age");
			expect(computeStage(daysAgo(365 * 13), TODAY)).toBe("tween");
			expect(computeStage(daysAgo(365 * 16), TODAY)).toBe("teen");
			expect(computeStage(daysAgo(365 * 20), TODAY)).toBe("young_adult");
		});

		it("genId returns unique IDs with prefix", () => {
			const id1 = genId("test");
			const id2 = genId("test");
			expect(id1).not.toBe(id2);
			expect(id1.startsWith("test_")).toBe(true);
		});
	});
});
