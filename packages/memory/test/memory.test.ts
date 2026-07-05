import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ChildProfile, ChildStage } from "../src/index.js";
import {
	buildChildSharePayload,
	canCaregiver,
	caregiverPermissions,
	computeStage,
	decodeSharePayload,
	encodeSharePayload,
	genId,
	L0_RULES,
	MemoryLayer,
	matchL0Rule,
	sanitizeChildForShare,
	validateChildSharePayload,
} from "../src/index.js";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

describe("MemoryLayer", () => {
	let memory: MemoryLayer;

	beforeEach(() => {
		memory = new MemoryLayer({ dbPath: ":memory:" });
	});

	afterEach(() => {
		memory.close();
	});

	describe("Schema migration", () => {
		it("records the current schema version in SQLite metadata", () => {
			expect(memory.getSchemaVersion()).toBe(1);
			expect(memory.getSchemaMeta()).toMatchObject({ version: 1 });
		});

		it("returns version 0 when schema metadata is missing", () => {
			memory.db
				.prepare("DELETE FROM schema_meta WHERE key = 'schema'")
				.run();
			expect(memory.getSchemaMeta()).toEqual({ version: 0 });
			expect(memory.getSchemaVersion()).toBe(0);
		});
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
			memory.upsertChild({
				id: "c1",
				name: "小明",
				birthDate: daysAgo(90),
			});
			const updated = memory.upsertChild({
				id: "c1",
				name: "小明 (大名叫张明)",
				birthDate: daysAgo(90),
			});
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
			expect(child.metadata).toEqual({
				allergies: ["peanut"],
				bloodType: "O+",
			});
			const fetched = memory.getChild("c1");
			expect(fetched?.metadata).toEqual({
				allergies: ["peanut"],
				bloodType: "O+",
			});
		});

		it("upsertChild with no metadata works", () => {
			const child = memory.upsertChild({
				id: "c1",
				name: "NoMeta",
				birthDate: daysAgo(30),
			});
			expect(child.metadata).toBeUndefined();
			const fetched = memory.getChild("c1");
			expect(fetched?.metadata).toBeUndefined();
		});

		it("uses :memory: when no options provided", () => {
			const m = new MemoryLayer();
			m.upsertChild({
				id: "c1",
				name: "Default",
				birthDate: daysAgo(30),
			});
			const fetched = m.getChild("c1");
			expect(fetched?.name).toBe("Default");
			m.close();
		});

		it("listChildren handles null metadata correctly", () => {
			memory.upsertChild({
				id: "c1",
				name: "NoMeta",
				birthDate: daysAgo(30),
			});
			memory.upsertChild({
				id: "c2",
				name: "WithMeta",
				birthDate: daysAgo(60),
				metadata: { k: "v" },
			});
			const list = memory.listChildren();
			expect(list.length).toBe(2);
			const noMeta = list.find((c) => c.id === "c1");
			const withMeta = list.find((c) => c.id === "c2");
			expect(noMeta?.metadata).toBeUndefined();
			expect(withMeta?.metadata).toEqual({ k: "v" });
		});
	});

	describe("L2: Facts (Global)", () => {
		beforeEach(() => {
			memory.upsertChild({ id: "c1", name: "A", birthDate: daysAgo(90) });
		});

		it("adds and retrieves a fact", () => {
			const fact = memory.addFact("c1", "vaccine", "BCG", {
				date: daysAgo(60),
				site: "left arm",
			});
			expect(fact.id).toMatch(/^fact_/);
			expect(fact.category).toBe("vaccine");
			const facts = memory.getFacts("c1");
			expect(facts.length).toBe(1);
			expect(facts[0].value).toEqual({
				date: daysAgo(60),
				site: "left arm",
			});
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
			const f = memory.addFact("c1", "medical", "allergy", {
				type: "peanut",
			});
			expect(memory.deleteFact(f.id)).toBe(true);
			expect(memory.deleteFact(f.id)).toBe(false);
		});

		it("returns facts in reverse-chronological order", async () => {
			const f1 = memory.addFact("c1", "medical", "visit-1", {
				date: daysAgo(10),
			});
			// small delay to ensure different createdAt
			await new Promise((r) => setTimeout(r, 5));
			const f2 = memory.addFact("c1", "medical", "visit-2", {
				date: daysAgo(5),
			});
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
			expect(eps[0].content).toMatchObject({
				question: expect.any(String),
			});
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

		it("getEpisodes without type returns all types", () => {
			memory.addEpisode("c1", "qa", { q: 1 });
			memory.addEpisode("c1", "visit", { doctor: "Dr. Lee" });
			const all = memory.getEpisodes("c1");
			expect(all.length).toBe(2);
		});

		it("getEpisodes with type and limit combines both filters", () => {
			for (let i = 0; i < 5; i++) memory.addEpisode("c1", "qa", { i });
			memory.addEpisode("c1", "visit", { doctor: "x" });
			const eps = memory.getEpisodes("c1", "qa", 2);
			expect(eps.length).toBe(2);
			expect(eps.every((e) => e.type === "qa")).toBe(true);
		});

		it("getEpisodes with type but no limit returns all matching", () => {
			for (let i = 0; i < 5; i++) memory.addEpisode("c1", "qa", { i });
			memory.addEpisode("c1", "visit", { doctor: "x" });
			const eps = memory.getEpisodes("c1", "qa");
			expect(eps.length).toBe(5);
		});

		it("getEpisodes with no type but with limit applies limit only", () => {
			for (let i = 0; i < 5; i++) memory.addEpisode("c1", "qa", { i });
			memory.addEpisode("c1", "visit", { doctor: "x" });
			const eps = memory.getEpisodes("c1", undefined, 2);
			expect(eps.length).toBe(2);
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
			expect(new Date(updated?.lastActive).getTime()).toBeGreaterThan(
				new Date(sess.startedAt).getTime(),
			);
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

		it("getSession handles null context", () => {
			const sess = memory.startSession("c1", { x: 1 });
			// null out the context
			memory.db
				.prepare(`UPDATE sessions SET context = NULL WHERE id = ?`)
				.run(sess.id);
			const fetched = memory.getSession(sess.id);
			expect(fetched?.context).toEqual({});
		});

		it("getActiveSession handles null context", () => {
			const sess = memory.startSession("c1", { x: 1 });
			memory.db
				.prepare(`UPDATE sessions SET context = NULL WHERE id = ?`)
				.run(sess.id);
			const active = memory.getActiveSession("c1");
			expect(active?.context).toEqual({});
		});
	});

	describe("Delta Log (PowerSync-ready)", () => {
		beforeEach(() => {
			memory.upsertChild({ id: "c1", name: "A", birthDate: daysAgo(90) });
		});

		it("records a delta on every child write", () => {
			const beforeCount = memory.getDeltaLog().length;
			memory.upsertChild({
				id: "c1",
				name: "A renamed",
				birthDate: daysAgo(90),
			});
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
			// 3 children = 3 unsynced deltas
			memory.upsertChild({ id: "c2", name: "B", birthDate: daysAgo(60) });
			memory.upsertChild({ id: "c3", name: "C", birthDate: daysAgo(30) });
			const all = memory.getDeltaLog();
			memory.markDeltaSynced(all[0].id);
			const syncedOnly = memory.getDeltaLog(0, false);
			expect(syncedOnly.length).toBe(1);
		});

		it("getUnsyncedDeltas returns only unsynced entries", () => {
			memory.upsertChild({ id: "c2", name: "B", birthDate: daysAgo(60) });
			const all = memory.getDeltaLog();
			memory.markDeltaSynced(all[0].id);
			const unsynced = memory.getUnsyncedDeltas();
			// Only c2 delta is unsynced (c1 already synced)
			expect(unsynced.length).toBe(1);
			expect(unsynced[0].rowId).toBe("c2");
			expect(unsynced[0].syncedAt).toBeNull();
		});

		it("getUnsyncedDeltas with limit caps results", () => {
			for (let i = 0; i < 5; i++) {
				memory.upsertChild({
					id: `bulk-${i}`,
					name: `Bulk ${i}`,
					birthDate: daysAgo(100),
				});
			}
			const capped = memory.getUnsyncedDeltas(3);
			expect(capped.length).toBe(3);
		});

		it("records delete delta when child is removed", () => {
			memory.upsertChild({
				id: "c-del",
				name: "Del",
				birthDate: daysAgo(100),
			});
			const before = memory.getDeltaLog().length;
			memory.deleteChild("c-del");
			const after = memory.getDeltaLog().length;
			expect(after).toBe(before + 1);
			const last = memory.getDeltaLog()[after - 1];
			expect(last.op).toBe("delete");
			expect(last.tableName).toBe("children");
		});

		it("getDeltaStats returns correct summary", () => {
			memory.upsertChild({
				id: "s1",
				name: "S1",
				birthDate: daysAgo(100),
			});
			memory.addFact("s1", "vaccine", "bcg", "done");
			memory.addEpisode("s1", "qa", { question: "Q1" });
			const stats = memory.getDeltaStats();
			expect(stats.total).toBeGreaterThan(0);
			expect(stats.unsynced).toBeGreaterThan(0);
			// All deltas should be unsynced (we haven't called markDeltaSynced)
			expect(stats.unsynced).toBe(stats.total);
			expect(stats.byTable).toHaveProperty("children");
			expect(stats.byTable).toHaveProperty("facts");
			expect(stats.byTable).toHaveProperty("episodes");
			expect(stats.byOp).toHaveProperty("upsert");
			expect(stats.byOp).toHaveProperty("insert");
		});

		it("markDeltaSynced marks only up to given id", () => {
			memory.upsertChild({
				id: "m1",
				name: "M1",
				birthDate: daysAgo(100),
			});
			memory.upsertChild({
				id: "m2",
				name: "M2",
				birthDate: daysAgo(80),
			});
			memory.upsertChild({
				id: "m3",
				name: "M3",
				birthDate: daysAgo(60),
			});
			const all = memory.getDeltaLog();
			// Mark only first entry
			const count = memory.markDeltaSynced(all[0].id);
			expect(count).toBe(1);
			// Remaining should be unsynced
			const unsynced = memory.getUnsyncedDeltas();
			expect(unsynced.length).toBe(all.length - 1);
			// Mark the rest
			memory.markDeltaSynced(all[all.length - 1].id);
			const after = memory.getUnsyncedDeltas();
			expect(after.length).toBe(0);
		});

		it("getDeltaLog default returns all (since=0, includeUnsynced=true)", () => {
			const allDefault = memory.getDeltaLog();
			const allExplicit = memory.getDeltaLog(0, true);
			expect(allDefault.length).toBe(allExplicit.length);
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

		it("matchL0Rule returns first-match as best when only one matches", () => {
			// Cover !best branch (line 97): first match wins as best
			const rule = matchL0Rule("宝宝呼吸困难");
			expect(rule?.id).toBe("R003_breathing_difficulty");
		});

		it("matchL0Rule upgrades to higher-severity when both match", () => {
			// Cover best-replacement branch (line 97 second part)
			// infant fever (emergency) + head injury (warn) — emergency wins
			const rule = matchL0Rule("3个月宝宝发烧40度摔到头");
			expect(rule?.severity).toBe("emergency");
		});
	});

	describe("Lifecycle", () => {
		it("isClosed returns false before close", () => {
			const m = new MemoryLayer({ dbPath: ":memory:" });
			expect(m.isClosed).toBe(false);
			m.close();
		});

		it("isClosed returns true after close", () => {
			const m = new MemoryLayer({ dbPath: ":memory:" });
			m.close();
			expect(m.isClosed).toBe(true);
		});

		it("calling close twice is safe", () => {
			const m = new MemoryLayer({ dbPath: ":memory:" });
			m.close();
			expect(() => m.close()).not.toThrow();
		});
	});

	describe("Persistence", () => {
		it("data survives DB reopen (file-based)", () => {
			const path = `/tmp/test_memory_${Date.now()}.sqlite`;
			const m1 = new MemoryLayer({ dbPath: path });
			m1.upsertChild({
				id: "c1",
				name: "持久化测试",
				birthDate: daysAgo(30),
			});
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

describe("caregiverPermissions", () => {
	it("primary can do everything", () => {
		const p = caregiverPermissions("primary");
		expect(p.canEditChild).toBe(true);
		expect(p.canAddFacts).toBe(true);
		expect(p.canAddEpisodes).toBe(true);
		expect(p.canAddFeedback).toBe(true);
		expect(p.canExport).toBe(true);
	});

	it("caregiver can add episodes and feedback but not facts", () => {
		const p = caregiverPermissions("caregiver");
		expect(p.canEditChild).toBe(false);
		expect(p.canAddFacts).toBe(false);
		expect(p.canAddEpisodes).toBe(true);
		expect(p.canAddFeedback).toBe(true);
		expect(p.canExport).toBe(true);
	});

	it("viewer is read-only", () => {
		const p = caregiverPermissions("viewer");
		expect(p.canEditChild).toBe(false);
		expect(p.canAddFacts).toBe(false);
		expect(p.canAddEpisodes).toBe(false);
		expect(p.canAddFeedback).toBe(false);
		expect(p.canExport).toBe(true);
	});
});

describe("canCaregiver", () => {
	it("routes each action through the permission table", () => {
		expect(canCaregiver("primary", "editChild")).toBe(true);
		expect(canCaregiver("primary", "addFacts")).toBe(true);
		expect(canCaregiver("primary", "addFeedback")).toBe(true);
		expect(canCaregiver("caregiver", "editChild")).toBe(false);
		expect(canCaregiver("caregiver", "addFacts")).toBe(false);
		expect(canCaregiver("caregiver", "addFeedback")).toBe(true);
		expect(canCaregiver("viewer", "addEpisodes")).toBe(false);
		expect(canCaregiver("viewer", "addFeedback")).toBe(false);
		expect(canCaregiver("viewer", "export")).toBe(true);
	});
});

describe("sanitizeChildForShare", () => {
	it("strips the metadata bag", () => {
		const child: ChildProfile = {
			id: "c1",
			name: "Alice",
			birthDate: "2024-01-01",
			stage: "infant",
			metadata: { allergies: ["peanut"], bloodType: "A+" },
		};
		const sanitized = sanitizeChildForShare(child);
		expect(sanitized.metadata).toBeUndefined();
		expect(sanitized.id).toBe("c1");
	});

	it("preserves all shareable fields when no metadata", () => {
		const child: ChildProfile = {
			id: "c1",
			name: "Alice",
			birthDate: "2024-01-01",
			stage: "infant",
		};
		expect(sanitizeChildForShare(child)).toEqual(child);
	});
});

describe("buildChildSharePayload", () => {
	const child: ChildProfile = {
		id: "c1",
		name: "Alice",
		birthDate: "2024-01-01",
		stage: "infant",
		metadata: { allergies: ["peanut"] },
	};
	const fact = {
		id: "f1",
		childId: "c1",
		category: "vaccine" as const,
		key: "mmr",
		value: { dose: 1 },
		createdAt: "2024-06-01T00:00:00.000Z",
	};
	const episode = {
		id: "e1",
		childId: "c1",
		type: "qa" as const,
		content: { question: "fever?" },
		createdAt: "2024-06-02T00:00:00.000Z",
	};
	const caregiver = {
		id: "g1",
		name: "Dad",
		role: "primary" as const,
		addedAt: "2024-06-01T00:00:00.000Z",
	};

	it("strips metadata and copies arrays", () => {
		const p = buildChildSharePayload({
			child,
			facts: [fact],
			episodes: [episode],
			caregivers: [caregiver],
			exportedBy: "g1",
		});
		expect(p.version).toBe(1);
		expect(p.child.metadata).toBeUndefined();
		expect(p.facts).toEqual([fact]);
		expect(p.episodes).toEqual([episode]);
		expect(p.caregivers).toEqual([caregiver]);
		expect(p.exportedBy).toBe("g1");
		expect(typeof p.exportedAt).toBe("string");
	});

	it("returns a fresh arrays copy (caller mutations do not leak)", () => {
		const facts = [fact];
		const p = buildChildSharePayload({
			child,
			facts,
			episodes: [],
			caregivers: [],
			exportedBy: "g1",
		});
		facts.push({ ...fact, id: "f2" });
		expect(p.facts).toHaveLength(1);
	});
});

describe("validateChildSharePayload", () => {
	const valid = {
		version: 1,
		exportedAt: "2024-06-01T00:00:00.000Z",
		exportedBy: "g1",
		child: {
			id: "c1",
			name: "Alice",
			birthDate: "2024-01-01",
			stage: "infant",
		},
		facts: [],
		episodes: [],
		caregivers: [],
	};

	it("accepts a well-formed payload", () => {
		expect(validateChildSharePayload(valid)).toBe(true);
	});

	it("rejects non-object inputs", () => {
		expect(validateChildSharePayload(null)).toBe(false);
		expect(validateChildSharePayload("string")).toBe(false);
		expect(validateChildSharePayload(42)).toBe(false);
	});

	it("rejects wrong version", () => {
		expect(validateChildSharePayload({ ...valid, version: 2 })).toBe(false);
	});

	it("rejects missing child fields", () => {
		const c = { ...valid.child } as Record<string, unknown>;
		delete c.id;
		expect(validateChildSharePayload({ ...valid, child: c })).toBe(false);
	});

	it("rejects invalid birthDate", () => {
		expect(
			validateChildSharePayload({
				...valid,
				child: { ...valid.child, birthDate: "not-a-date" },
			}),
		).toBe(false);
	});

	it("rejects when facts/episodes/caregivers are not arrays", () => {
		expect(validateChildSharePayload({ ...valid, facts: "x" })).toBe(false);
		expect(validateChildSharePayload({ ...valid, episodes: 1 })).toBe(
			false,
		);
		expect(validateChildSharePayload({ ...valid, caregivers: null })).toBe(
			false,
		);
	});

	it("rejects when child is a non-object primitive", () => {
		expect(validateChildSharePayload({ ...valid, child: "string" })).toBe(
			false,
		);
		expect(validateChildSharePayload({ ...valid, child: 42 })).toBe(false);
	});

	it("rejects when child fields are wrong type", () => {
		const c = { ...valid.child } as Record<string, unknown>;
		c.id = 42;
		expect(validateChildSharePayload({ ...valid, child: c })).toBe(false);
		c.id = "c1";
		c.name = 99;
		expect(validateChildSharePayload({ ...valid, child: c })).toBe(false);
	});

	it("rejects when exportedBy is not a string", () => {
		expect(validateChildSharePayload({ ...valid, exportedBy: 1 })).toBe(
			false,
		);
	});
});

describe("encodeSharePayload + decodeSharePayload", () => {
	const sample = {
		version: 1 as const,
		exportedAt: "2024-06-01T00:00:00.000Z",
		exportedBy: "g1",
		child: {
			id: "c1",
			name: "Alice",
			birthDate: "2024-01-01",
			stage: "infant" as const,
		},
		facts: [],
		episodes: [],
		caregivers: [],
	};

	it("round-trips through base64url", () => {
		const encoded = encodeSharePayload(sample);
		expect(typeof encoded).toBe("string");
		expect(encoded).not.toMatch(/[+/=]/);
		const decoded = decodeSharePayload(encoded);
		expect(decoded).toEqual(sample);
	});

	it("returns null for invalid base64", () => {
		expect(decodeSharePayload("not-base64-!!!")).toBeNull();
	});

	it("returns null for a decoded payload that is not valid", () => {
		const bogus = Buffer.from("garbage", "utf8").toString("base64url");
		expect(decodeSharePayload(bogus)).toBeNull();
	});

	it("returns null when exportedAt is invalid in the decoded payload", () => {
		// round-trip with manually corrupted payload
		const sample2 = {
			...sample,
			exportedAt: "not-a-date",
		};
		const encoded = encodeSharePayload(
			sample2 as Parameters<typeof encodeSharePayload>[0],
		);
		expect(decodeSharePayload(encoded)).toBeNull();
	});
});

describe("SymptomLog (time series)", () => {
	let layer: MemoryLayer;
	beforeEach(() => {
		layer = new MemoryLayer({ dbPath: ":memory:" });
	});

	it("addSymptom persists the reading with a generated id", () => {
		const s = layer.addSymptom("alice", "fever", 38.5, { unit: "C" });
		expect(s.id).toMatch(/^sym_/);
		expect(s.childId).toBe("alice");
		expect(s.type).toBe("fever");
		expect(s.value).toBe(38.5);
		expect(s.unit).toBe("C");
		expect(s.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it("listSymptoms returns chronological desc for a child", () => {
		const t0 = "2024-01-01T10:00:00.000Z";
		const a = layer.addSymptom("alice", "fever", 38.5, { createdAt: t0 });
		const b = layer.addSymptom("alice", "cough", 0, {
			createdAt: "2024-01-02T10:00:00.000Z",
		});
		const c = layer.addSymptom("alice", "rash", 0, {
			createdAt: "2024-01-03T10:00:00.000Z",
		});
		const all = layer.listSymptoms("alice");
		expect(all).toHaveLength(3);
		// latest first
		expect(all[0]?.id).toBe(c.id);
		expect(all[2]?.id).toBe(a.id);
		expect(all.map((s) => s.type)).toEqual(["rash", "cough", "fever"]);
		// ids are unique
		expect(new Set([a.id, b.id, c.id]).size).toBe(3);
	});

	it("listSymptoms scopes by childId", () => {
		layer.addSymptom("alice", "fever", 38.0);
		layer.addSymptom("bob", "fever", 39.0);
		expect(layer.listSymptoms("alice")).toHaveLength(1);
		expect(layer.listSymptoms("bob")).toHaveLength(1);
		expect(layer.listSymptoms("nobody")).toHaveLength(0);
	});

	it("recentFeverBy returns only fever readings within the time window", () => {
		layer.addSymptom("alice", "fever", 38.0, {
			createdAt: "2024-01-01T10:00:00.000Z",
		});
		layer.addSymptom("alice", "fever", 38.5, {
			createdAt: "2024-01-02T10:00:00.000Z",
		});
		layer.addSymptom("alice", "cough", 0, {
			createdAt: "2024-01-02T11:00:00.000Z",
		});
		const since = new Date("2024-01-01T00:00:00.000Z").toISOString();
		const recent = layer.recentFeverBy("alice", since);
		expect(recent).toHaveLength(2);
		expect(recent.every((r) => r.type === "fever")).toBe(true);
	});

	it("computeFeverTrend returns slope + direction for recent readings", () => {
		// higher temp at t+1 than t => 'rising'
		const asOf = new Date("2024-01-02T00:00:00.000Z");
		layer.addSymptom("alice", "fever", 37.5, {
			createdAt: "2024-01-01T08:00:00.000Z",
		});
		layer.addSymptom("alice", "fever", 38.0, {
			createdAt: "2024-01-01T12:00:00.000Z",
		});
		layer.addSymptom("alice", "fever", 38.5, {
			createdAt: "2024-01-01T16:00:00.000Z",
		});
		const trend = layer.computeFeverTrend("alice", 24, asOf);
		expect(trend.count).toBe(3);
		expect(trend.direction).toBe("rising");
		expect(trend.delta).toBeCloseTo(1.0, 5);
		expect(trend.min).toBe(37.5);
		expect(trend.max).toBe(38.5);
	});

	it("computeFeverTrend returns flat direction for constant readings", () => {
		const asOf = new Date("2024-01-02T00:00:00.000Z");
		layer.addSymptom("alice", "fever", 38.0, {
			createdAt: "2024-01-01T08:00:00.000Z",
		});
		layer.addSymptom("alice", "fever", 38.0, {
			createdAt: "2024-01-01T12:00:00.000Z",
		});
		const trend = layer.computeFeverTrend("alice", 24, asOf);
		expect(trend.direction).toBe("stable");
		expect(trend.delta).toBe(0);
	});

	it("computeFeverTrend returns falling direction when temperature drops", () => {
		const asOf = new Date("2024-01-02T00:00:00.000Z");
		layer.addSymptom("alice", "fever", 39.0, {
			createdAt: "2024-01-01T08:00:00.000Z",
		});
		layer.addSymptom("alice", "fever", 38.0, {
			createdAt: "2024-01-01T12:00:00.000Z",
		});
		layer.addSymptom("alice", "fever", 37.5, {
			createdAt: "2024-01-01T16:00:00.000Z",
		});
		const trend = layer.computeFeverTrend("alice", 24, asOf);
		expect(trend.direction).toBe("falling");
		expect(trend.delta).toBeCloseTo(-1.5, 5);
	});

	it("computeFeverTrend returns empty trend when no recent readings", () => {
		const trend = layer.computeFeverTrend("alice", 24);
		expect(trend.count).toBe(0);
		expect(trend.direction).toBe("unknown");
	});

	it("computeFeverTrend flags fever-duration when readings span > 72h", () => {
		const asOf = new Date("2024-01-05T00:00:00.000Z");
		layer.addSymptom("alice", "fever", 38.0, {
			createdAt: "2024-01-01T08:00:00.000Z",
		});
		layer.addSymptom("alice", "fever", 38.5, {
			createdAt: "2024-01-02T08:00:00.000Z",
		});
		layer.addSymptom("alice", "fever", 39.0, {
			createdAt: "2024-01-04T08:00:00.000Z",
		});
		const trend = layer.computeFeverTrend("alice", 24 * 7, asOf);
		expect(trend.durationHours).toBeGreaterThanOrEqual(72);
		expect(trend.actionFlag).toBe("see-doctor");
	});

	it("addSymptom omits unit when not provided", () => {
		const s = layer.addSymptom("alice", "rash", 0);
		expect(s.unit).toBeUndefined();
	});

	it("addSymptom persists note when provided", () => {
		const s = layer.addSymptom("alice", "fever", 39.0, {
			note: "after nap",
		});
		expect(s.note).toBe("after nap");
	});

	it("listSymptoms: rows with NULL unit/note omit those keys", () => {
		const s = layer.addSymptom("alice", "cough", 0);
		const all = layer.listSymptoms("alice");
		const found = all.find((r) => r.id === s.id);
		expect(found).toBeDefined();
		expect(found?.unit).toBeUndefined();
		expect(found?.note).toBeUndefined();
	});

	it("listSymptoms: rows with unit/note set round-trip those keys", () => {
		const s = layer.addSymptom("alice", "rash", 0, {
			unit: "count",
			note: "on arm",
		});
		const all = layer.listSymptoms("alice");
		const found = all.find((r) => r.id === s.id);
		expect(found?.unit).toBe("count");
		expect(found?.note).toBe("on arm");
	});

	it("recentFeverBy round-trips unit and note when set", () => {
		layer.addSymptom("alice", "fever", 38.5, {
			unit: "C",
			note: "morning",
			createdAt: "2024-01-01T08:00:00.000Z",
		});
		const rows = layer.recentFeverBy("alice", "2024-01-01T00:00:00.000Z");
		expect(rows).toHaveLength(1);
		expect(rows[0]?.unit).toBe("C");
		expect(rows[0]?.note).toBe("morning");
	});
});

describe("Symptom analytics (pure)", () => {
	it("classifyFeverDirection: within stable threshold is 'stable'", async () => {
		const { classifyFeverDirection } = await import("../src/symptom.js");
		expect(classifyFeverDirection(0)).toBe("stable");
		expect(classifyFeverDirection(0.1)).toBe("stable");
		expect(classifyFeverDirection(-0.2)).toBe("stable");
	});
	it("classifyFeverDirection: positive delta => rising", async () => {
		const { classifyFeverDirection } = await import("../src/symptom.js");
		expect(classifyFeverDirection(0.3)).toBe("rising");
		expect(classifyFeverDirection(1.5)).toBe("rising");
	});
	it("classifyFeverDirection: negative delta => falling", async () => {
		const { classifyFeverDirection } = await import("../src/symptom.js");
		expect(classifyFeverDirection(-0.3)).toBe("falling");
		expect(classifyFeverDirection(-2.0)).toBe("falling");
	});
	it("classifyFeverAction: high temp + rising => urgent", async () => {
		const { classifyFeverAction } = await import("../src/symptom.js");
		expect(classifyFeverAction(40.0, 1.0, 12)).toBe("urgent");
	});
	it("classifyFeverAction: spike above 39.5 => watch", async () => {
		const { classifyFeverAction } = await import("../src/symptom.js");
		expect(classifyFeverAction(39.6, 0, 1)).toBe("watch");
	});
	it("classifyFeverAction: 72h rising => see-doctor", async () => {
		const { classifyFeverAction } = await import("../src/symptom.js");
		expect(classifyFeverAction(38.5, 0.3, 80)).toBe("see-doctor");
	});
	it("classifyFeverAction: low-grade stable => none", async () => {
		const { classifyFeverAction } = await import("../src/symptom.js");
		expect(classifyFeverAction(37.8, 0, 12)).toBe("none");
	});
	it("computeFeverTrend: empty list returns unknown/zero", async () => {
		const { computeFeverTrend } = await import("../src/symptom.js");
		const trend = computeFeverTrend([]);
		expect(trend.direction).toBe("unknown");
		expect(trend.count).toBe(0);
		expect(trend.actionFlag).toBe("none");
	});
	it("computeFeverTrend: handles unsorted readings", async () => {
		const { computeFeverTrend } = await import("../src/symptom.js");
		const readings = [
			{
				id: "s3",
				childId: "c",
				type: "fever" as const,
				value: 38.5,
				createdAt: "2024-01-01T16:00:00.000Z",
			},
			{
				id: "s1",
				childId: "c",
				type: "fever" as const,
				value: 37.5,
				createdAt: "2024-01-01T08:00:00.000Z",
			},
			{
				id: "s2",
				childId: "c",
				type: "fever" as const,
				value: 38.0,
				createdAt: "2024-01-01T12:00:00.000Z",
			},
		];
		const trend = computeFeverTrend(readings);
		expect(trend.count).toBe(3);
		expect(trend.min).toBe(37.5);
		expect(trend.max).toBe(38.5);
		expect(trend.delta).toBeCloseTo(1.0, 5);
		expect(trend.direction).toBe("rising");
	});
	it("formatFeverTrendLine: empty/unknown returns chinese placeholder", async () => {
		const { formatFeverTrendLine } = await import("../src/symptom.js");
		expect(
			formatFeverTrendLine({
				count: 0,
				min: 0,
				max: 0,
				avg: 0,
				delta: 0,
				direction: "unknown",
				durationHours: 0,
				actionFlag: "none",
			}),
		).toContain("尚未记录");
	});
	it("formatFeverTrendLine: rising includes 上升", async () => {
		const { formatFeverTrendLine } = await import("../src/symptom.js");
		expect(
			formatFeverTrendLine({
				count: 3,
				min: 37.5,
				max: 38.5,
				avg: 38.0,
				delta: 1.0,
				direction: "rising",
				durationHours: 8,
				actionFlag: "none",
			}),
		).toContain("上升");
	});

	it("formatFeverTrendLine: falling includes 下降", async () => {
		const { formatFeverTrendLine } = await import("../src/symptom.js");
		expect(
			formatFeverTrendLine({
				count: 3,
				min: 37.0,
				max: 38.5,
				avg: 37.8,
				delta: -0.7,
				direction: "falling",
				durationHours: 8,
				actionFlag: "none",
			}),
		).toContain("下降");
	});

	it("formatFeverTrendLine: stable (delta ≈ 0, direction stable) includes 稳定", async () => {
		const { formatFeverTrendLine } = await import("../src/symptom.js");
		expect(
			formatFeverTrendLine({
				count: 3,
				min: 38.0,
				max: 38.1,
				avg: 38.05,
				delta: 0.05,
				direction: "stable",
				durationHours: 8,
				actionFlag: "none",
			}),
		).toContain("稳定");
	});
});
