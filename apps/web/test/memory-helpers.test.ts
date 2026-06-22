import { describe, expect, it } from "vitest";
import {
	buildFeedbackAnalytics,
	buildSyncSnapshot,
	computeStage,
	genId,
	matchL0Rule,
	validateChildProfileDraft,
} from "../src/memory-helpers.js";

describe("computeStage", () => {
	const ref = new Date("2026-06-21T00:00:00Z");

	it("returns newborn for under 1 month", () => {
		expect(computeStage("2026-06-01T00:00:00Z", ref)).toBe("newborn");
	});

	it("returns infant for 1mo..12mo", () => {
		expect(computeStage("2025-09-01T00:00:00Z", ref)).toBe("infant");
	});

	it("returns toddler for 1y..3y", () => {
		expect(computeStage("2024-06-01T00:00:00Z", ref)).toBe("toddler");
	});

	it("returns preschool for 3y..6y", () => {
		expect(computeStage("2021-06-01T00:00:00Z", ref)).toBe("preschool");
	});

	it("returns school_age for 6y..12y", () => {
		expect(computeStage("2017-06-01T00:00:00Z", ref)).toBe("school_age");
	});

	it("returns tween for 12y..15y", () => {
		expect(computeStage("2013-06-01T00:00:00Z", ref)).toBe("tween");
	});

	it("returns teen for 15y..18y", () => {
		expect(computeStage("2010-06-01T00:00:00Z", ref)).toBe("teen");
	});

	it("returns young_adult for >= 18y", () => {
		expect(computeStage("2005-06-01T00:00:00Z", ref)).toBe("young_adult");
	});
});

describe("genId", () => {
	it("returns a string with the given prefix", () => {
		expect(genId("fact")).toMatch(/^fact_/);
	});

	it("returns a default id when no prefix given", () => {
		expect(genId()).toMatch(/^id_/);
	});
});

describe("matchL0Rule", () => {
	it("matches infant fever emergency", () => {
		const rule = matchL0Rule("我家宝宝3个月发烧38.5度");
		expect(rule?.id).toBe("R001_infant_fever");
		expect(rule?.severity).toBe("emergency");
	});

	it("matches self-harm emergency", () => {
		const rule = matchL0Rule("I am thinking about suicide");
		expect(rule?.id).toBe("R010_self_harm");
	});

	it("returns null when no rule fires", () => {
		expect(matchL0Rule("我家宝宝今天学会走路了")).toBeNull();
	});

	it("picks the highest-severity rule when multiple match", () => {
		const rule = matchL0Rule("婴儿 40度 发烧");
		expect(rule?.severity).toBe("emergency");
	});

	it("matches warn rules and keeps the first highest severity rule", () => {
		expect(matchL0Rule("孩子摔到头 head injury")?.severity).toBe("warn");
		expect(matchL0Rule("孩子摔到头后呼吸困难")?.id).toBe(
			"R003_breathing_difficulty",
		);
	});
});

describe("validateChildProfileDraft", () => {
	it("accepts a valid child draft and computes stage", () => {
		const result = validateChildProfileDraft({
			id: "alice",
			name: "爱丽丝",
			birthDate: "2024-06-19",
		});
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected valid draft");
		expect(result.profile.stage).toBeDefined();
	});

	it("accepts an explicit stage without recomputing it", () => {
		const result = validateChildProfileDraft(
			{
				id: "bob",
				name: "Bob",
				birthDate: "2020-01-01",
				stage: "teen",
			},
			new Date("2026-01-01T00:00:00Z"),
		);
		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected valid draft");
		expect(result.profile.stage).toBe("teen");
	});

	it("rejects blank names, invalid dates, and future birth dates", () => {
		const invalid = validateChildProfileDraft({
			id: "alice",
			name: "爱丽丝",
			birthDate: "not-a-date",
		});
		expect(invalid.ok).toBe(false);
		if (invalid.ok) throw new Error("expected invalid date failure");
		expect(invalid.errors).toContain("birthDate is invalid");

		const future = validateChildProfileDraft({
			id: " ",
			name: " ",
			birthDate: "2999-01-01",
		});
		expect(future.ok).toBe(false);
		if (future.ok) throw new Error("expected validation failure");
		expect(future.errors).toContain("id is required");
		expect(future.errors).toContain("name is required");
		expect(future.errors).toContain("birthDate cannot be in the future");
	});
});

describe("buildSyncSnapshot", () => {
	it("summarizes delta health and latest unsynced rows", () => {
		const snapshot = buildSyncSnapshot([
			{
				id: 1,
				tableName: "children",
				rowId: "c1",
				op: "upsert",
				payload: {},
				syncedAt: "2026-01-01",
				createdAt: "2026-01-01",
			},
			{
				id: 2,
				tableName: "facts",
				rowId: "f1",
				op: "insert",
				payload: {},
				syncedAt: null,
				createdAt: "2026-01-02",
			},
			{
				id: 3,
				tableName: "feedback",
				rowId: "fb1",
				op: "insert",
				payload: {},
				syncedAt: null,
				createdAt: "2026-01-03",
			},
		]);
		expect(snapshot.total).toBe(3);
		expect(snapshot.unsynced).toBe(2);
		expect(snapshot.status).toBe("pending");
		expect(snapshot.latestUnsynced.map((d) => d.rowId)).toEqual([
			"fb1",
			"f1",
		]);
	});

	it("returns a synced snapshot and respects latest unsynced limit", () => {
		const synced = buildSyncSnapshot([
			{
				id: 1,
				tableName: "children",
				rowId: "c1",
				op: "upsert",
				payload: {},
				syncedAt: "2026-01-01",
				createdAt: "2026-01-01",
			},
		]);
		expect(synced.status).toBe("synced");
		expect(synced.unsynced).toBe(0);

		const limited = buildSyncSnapshot(
			[
				{
					id: 1,
					tableName: "facts",
					rowId: "f1",
					op: "insert",
					payload: {},
					syncedAt: null,
					createdAt: "2026-01-01",
				},
				{
					id: 2,
					tableName: "facts",
					rowId: "f2",
					op: "insert",
					payload: {},
					syncedAt: null,
					createdAt: "2026-01-02",
				},
			],
			1,
		);
		expect(limited.latestUnsynced.map((d) => d.rowId)).toEqual(["f2"]);
	});
});

describe("buildFeedbackAnalytics", () => {
	it("groups feedback by agent and ranks liked agents first", () => {
		const analytics = buildFeedbackAnalytics([
			{
				id: "a",
				childId: "c1",
				episodeId: "s1",
				agentId: "educator",
				rating: 5,
				createdAt: "2026-01-01",
			},
			{
				id: "b",
				childId: "c1",
				episodeId: "s2",
				agentId: "educator",
				rating: 1,
				createdAt: "2026-01-02",
			},
			{
				id: "c",
				childId: "c1",
				episodeId: "s3",
				agentId: "pediatrician",
				rating: 5,
				createdAt: "2026-01-03",
			},
		]);
		expect(analytics[0]).toMatchObject({
			agentId: "pediatrician",
			likes: 1,
			dislikes: 0,
			avgRating: 5,
		});
		expect(analytics[1]).toMatchObject({
			agentId: "educator",
			likes: 1,
			dislikes: 1,
			avgRating: 3,
		});
	});

	it("uses total count then agent id as deterministic tie breakers", () => {
		const byTotal = buildFeedbackAnalytics([
			{
				id: "a",
				childId: "c1",
				episodeId: "s1",
				agentId: "zed",
				rating: 4,
				createdAt: "2026-01-01",
			},
			{
				id: "b",
				childId: "c1",
				episodeId: "s2",
				agentId: "alpha",
				rating: 4,
				createdAt: "2026-01-02",
			},
			{
				id: "c",
				childId: "c1",
				episodeId: "s3",
				agentId: "alpha",
				rating: 4,
				createdAt: "2026-01-03",
			},
		]);
		expect(byTotal.map((row) => row.agentId)).toEqual(["alpha", "zed"]);
		expect(byTotal[0].total).toBe(2);
		expect(byTotal[0].lastFeedbackAt).toBe("2026-01-03");

		const byAgentId = buildFeedbackAnalytics([
			{
				id: "d",
				childId: "c1",
				episodeId: "s4",
				agentId: "beta",
				rating: 4,
				createdAt: "2026-01-04",
			},
			{
				id: "e",
				childId: "c1",
				episodeId: "s5",
				agentId: "alpha",
				rating: 4,
				createdAt: "2026-01-05",
			},
		]);
		expect(byAgentId.map((row) => row.agentId)).toEqual(["alpha", "beta"]);
	});
});
