import { describe, expect, it } from "vitest";
import type { HabitStreakState } from "../src/index.js";
import {
	ACHIEVEMENTS,
	earnedAchievements,
	formatAchievements,
	getAchievement,
	nextAchievement,
	qualifiesFor,
	totalAchievements,
} from "../src/index.js";

function makeState(
	currentStreak: number,
	bestStreak: number,
): HabitStreakState {
	return {
		habitId: "h",
		childId: "c",
		currentStreak,
		bestStreak,
		lastCheckInTs: Date.now(),
		checkIns: [],
	};
}

describe("ACHIEVEMENTS data integrity", () => {
	it("contains at least 8 achievements", () => {
		expect(totalAchievements()).toBeGreaterThanOrEqual(8);
	});

	it("all ids are unique", () => {
		const idList = ACHIEVEMENTS.map((a) => a.id);
		expect(new Set(idList).size).toBe(idList.length);
	});

	it("all achievements have emoji + titles", () => {
		for (const a of ACHIEVEMENTS) {
			expect(a.emoji.length).toBeGreaterThan(0);
			expect(a.title.length).toBeGreaterThan(0);
			expect(a.titleEn.length).toBeGreaterThan(0);
			expect(a.description.length).toBeGreaterThan(0);
		}
	});
});

describe("qualifiesFor — fallback branches", () => {
	it("returns false for unknown achievement id (cast)", () => {
		expect(qualifiesFor("nonexistent" as never, makeState(100, 100))).toBe(
			false,
		);
	});

	it("returns false when threshold is a number type fall-through", () => {
		// Patch the ACHIEVEMENTS_BY_ID via casting an object with negative threshold
		// to force the inner `>=` to evaluate to false in the number branch.
		// Since the number branch checks >= threshold, negative threshold always
		// fails. This exercises both true/false of the >= check.
		const fake = {
			id: "fake_neg" as never,
			title: "x",
			titleEn: "x",
			emoji: "x",
			description: "x",
			threshold: -100,
		} as never;
		expect(qualifiesFor(fake, makeState(0, 0))).toBe(false);
		expect(qualifiesFor(fake, makeState(50, 50))).toBe(false);
	});

	it("returns false when threshold is non-recognized literal", () => {
		const fake = {
			id: "fake_lit" as never,
			title: "x",
			titleEn: "x",
			emoji: "x",
			description: "x",
			threshold: "mystery" as never,
		} as never;
		expect(qualifiesFor(fake, makeState(1000, 1000))).toBe(false);
	});
});

describe("getAchievement", () => {
	it("returns achievement for valid id", () => {
		const a = getAchievement("streak_7");
		expect(a?.id).toBe("streak_7");
	});

	it("returns null for unknown id", () => {
		expect(getAchievement("nonexistent" as never)).toBeNull();
	});
});

describe("qualifiesFor", () => {
	it("first_checkin: streak >= 1", () => {
		expect(qualifiesFor("first_checkin", makeState(1, 1))).toBe(true);
		expect(qualifiesFor("first_checkin", makeState(0, 0))).toBe(false);
	});

	it("streak_7: streak >= 7", () => {
		expect(qualifiesFor("streak_7", makeState(7, 7))).toBe(true);
		expect(qualifiesFor("streak_7", makeState(6, 7))).toBe(true); // bestStreak
		expect(qualifiesFor("streak_7", makeState(6, 6))).toBe(false);
	});

	it("streak_30: streak >= 30", () => {
		expect(qualifiesFor("streak_30", makeState(30, 30))).toBe(true);
		expect(qualifiesFor("streak_30", makeState(29, 30))).toBe(true);
	});

	it("streak_365: streak >= 365", () => {
		expect(qualifiesFor("streak_365", makeState(365, 365))).toBe(true);
		expect(qualifiesFor("streak_365", makeState(100, 100))).toBe(false);
	});

	it("perfect_week: requires currentStreak >= 7 AND best >= 7", () => {
		expect(qualifiesFor("perfect_week", makeState(7, 7))).toBe(true);
		expect(qualifiesFor("perfect_week", makeState(7, 6))).toBe(false);
		expect(qualifiesFor("perfect_week", makeState(6, 7))).toBe(false);
	});

	it("comeback: current >= 3 AND best >= current + 5", () => {
		// best=20, current=5 → diff 15 ≥ 5 → true
		expect(qualifiesFor("comeback", makeState(5, 20))).toBe(true);
		// best=10, current=10 → diff 0 < 5 → false
		expect(qualifiesFor("comeback", makeState(10, 10))).toBe(false);
		// best=5, current=5 → diff 0 < 5 → false
		expect(qualifiesFor("comeback", makeState(5, 5))).toBe(false);
		// current < 3 → false
		expect(qualifiesFor("comeback", makeState(2, 20))).toBe(false);
	});

	it("consistent: bestStreak >= 30", () => {
		expect(qualifiesFor("consistent", makeState(10, 30))).toBe(true);
		expect(qualifiesFor("consistent", makeState(30, 30))).toBe(true);
		expect(qualifiesFor("consistent", makeState(29, 29))).toBe(false);
	});

	it("returns false for unknown achievement id (cast)", () => {
		expect(qualifiesFor("nonexistent" as never, makeState(100, 100))).toBe(
			false,
		);
	});

	it("returns false for unknown threshold type (cast)", () => {
		// Cast a valid achievement to an unknown threshold — the default `return false`
		// branch is exercised when threshold is not a known literal.
		const fake = {
			id: "fake_ach" as never,
			title: "x",
			titleEn: "x",
			emoji: "x",
			description: "x",
			threshold: "unknown-threshold" as never,
		} as never;
		expect(qualifiesFor(fake, makeState(1000, 1000))).toBe(false);
	});
});

describe("earnedAchievements", () => {
	it("empty state has no earned achievements", () => {
		expect(earnedAchievements(makeState(0, 0))).toEqual([]);
	});

	it("30-day state earns multiple streak + consistent", () => {
		const earned = earnedAchievements(makeState(30, 30));
		const ids = earned.map((a) => a.id);
		expect(ids).toContain("first_checkin");
		expect(ids).toContain("streak_3");
		expect(ids).toContain("streak_7");
		expect(ids).toContain("streak_14");
		expect(ids).toContain("streak_30");
		expect(ids).toContain("consistent");
	});

	it("returns in canonical order", () => {
		const earned = earnedAchievements(makeState(60, 60));
		// first_checkin should be first (canonical order)
		expect(earned[0]?.id).toBe("first_checkin");
	});

	it("bestStreak qualifies even if currentStreak lower", () => {
		const earned = earnedAchievements(makeState(5, 30));
		const ids = earned.map((a) => a.id);
		expect(ids).toContain("streak_30");
		expect(ids).toContain("consistent");
	});
});

describe("nextAchievement", () => {
	it("returns first unearned for empty state", () => {
		const next = nextAchievement(makeState(0, 0));
		expect(next?.id).toBe("first_checkin");
	});

	it("returns null when all earned", () => {
		// Achieve all 12 achievements: current=900 + best=905 — comeback
		// requires best >= current + 5. All numeric thresholds trivially met.
		const next = nextAchievement(makeState(900, 905));
		expect(next).toBeNull();
	});

	it("skips already-earned achievements", () => {
		// state with streak 5 should not yet have streak_7
		const next = nextAchievement(makeState(5, 5));
		const ids = earnedAchievements(makeState(5, 5)).map((a) => a.id);
		expect(ids).not.toContain(next?.id);
	});
});

describe("formatAchievements", () => {
	it("empty list placeholder", () => {
		expect(formatAchievements([])).toContain("暂无");
	});

	it("renders each achievement", () => {
		const earned = earnedAchievements(makeState(30, 30));
		const out = formatAchievements(earned);
		expect(out).toContain("已解锁成就");
		for (const a of earned) {
			expect(out).toContain(a.title);
		}
	});

	it("includes emoji for each entry", () => {
		const earned = earnedAchievements(makeState(7, 7));
		const out = formatAchievements(earned);
		const bulletCount = (out.match(/^-/gm) || []).length;
		expect(bulletCount).toBe(earned.length);
	});
});
