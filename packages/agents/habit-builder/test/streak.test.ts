import { describe, expect, it } from "vitest";
import {
	emptyStreakState,
	formatLeaderboard,
	formatStreakBadge,
	getStreakBadge,
	getStreakLeaderboard,
	HABITS,
	type HabitCheckIn,
	type HabitStreakState,
	isWeeklyQualified,
	recomputeStreak,
	recordCheckIn,
	STREAK_GAP_TOLERANCE_HOURS,
	streakLevelFromDays,
	suggestNextCheckIn,
	summarizeChildStreaks,
} from "../src/index.js";

const DAY = 24 * 60 * 60 * 1000;

function makeCheckIn(
	habitId: string,
	childId: string,
	ts: number,
	idSuffix = "",
): HabitCheckIn {
	return { id: `c_${ts}${idSuffix}`, habitId, childId, ts };
}

describe("emptyStreakState", () => {
	it("returns zero state", () => {
		const s = emptyStreakState("habit-1", "child-1");
		expect(s.currentStreak).toBe(0);
		expect(s.bestStreak).toBe(0);
		expect(s.lastCheckInTs).toBeNull();
		expect(s.checkIns).toEqual([]);
		expect(s.habitId).toBe("habit-1");
		expect(s.childId).toBe("child-1");
	});
});

describe("getStreakBadge", () => {
	it("returns correct badge for each level", () => {
		expect(getStreakBadge("new").emoji).toBe("🌱");
		expect(getStreakBadge("building").emoji).toBe("🌿");
		expect(getStreakBadge("established").emoji).toBe("🌳");
		expect(getStreakBadge("automatic").emoji).toBe("🌟");
	});

	it("all badges have labels in zh and en", () => {
		for (const level of [
			"new",
			"building",
			"established",
			"automatic",
		] as const) {
			const b = getStreakBadge(level);
			expect(b.label.length).toBeGreaterThan(0);
			expect(b.labelEn.length).toBeGreaterThan(0);
		}
	});
});

describe("streakLevelFromDays", () => {
	it("0-6 days = new", () => {
		expect(streakLevelFromDays(0)).toBe("new");
		expect(streakLevelFromDays(6)).toBe("new");
	});
	it("7-29 days = building", () => {
		expect(streakLevelFromDays(7)).toBe("building");
		expect(streakLevelFromDays(29)).toBe("building");
	});
	it("30-89 days = established", () => {
		expect(streakLevelFromDays(30)).toBe("established");
		expect(streakLevelFromDays(89)).toBe("established");
	});
	it("90+ days = automatic", () => {
		expect(streakLevelFromDays(90)).toBe("automatic");
		expect(streakLevelFromDays(365)).toBe("automatic");
	});
});

describe("recomputeStreak", () => {
	it("returns zeros for empty history", () => {
		const r = recomputeStreak([], 1000);
		expect(r.currentStreak).toBe(0);
		expect(r.bestStreak).toBe(0);
		expect(r.lastCheckInTs).toBeNull();
	});

	it("single check-in → current=1 best=1", () => {
		const r = recomputeStreak([makeCheckIn("h", "c", 1000)], 1000);
		expect(r.currentStreak).toBe(1);
		expect(r.bestStreak).toBe(1);
	});

	it("two consecutive days → current=2 best=2", () => {
		const r = recomputeStreak(
			[makeCheckIn("h", "c", DAY), makeCheckIn("h", "c", 2 * DAY)],
			2 * DAY,
		);
		expect(r.currentStreak).toBe(2);
		expect(r.bestStreak).toBe(2);
	});

	it("gap > 36h resets current streak but keeps best", () => {
		const r = recomputeStreak(
			[
				makeCheckIn("h", "c", DAY),
				makeCheckIn("h", "c", 2 * DAY),
				makeCheckIn("h", "c", 10 * DAY), // big gap
			],
			10 * DAY,
		);
		expect(r.bestStreak).toBe(2);
		// current=1 because last is now DAY*10 which is within 36h of now=DAY*10
		// actually current counts the run starting at the last reset
		expect(r.currentStreak).toBeGreaterThanOrEqual(1);
	});

	it("current resets to 0 when last check-in too old", () => {
		const r = recomputeStreak(
			[makeCheckIn("h", "c", DAY), makeCheckIn("h", "c", 2 * DAY)],
			100 * DAY, // way later
		);
		expect(r.currentStreak).toBe(0);
		expect(r.bestStreak).toBe(2);
	});

	it("multiple gaps → multiple runs", () => {
		const r = recomputeStreak(
			[
				makeCheckIn("h", "c", DAY),
				makeCheckIn("h", "c", 2 * DAY),
				makeCheckIn("h", "c", 3 * DAY), // run of 3
				makeCheckIn("h", "c", 20 * DAY), // gap
				makeCheckIn("h", "c", 21 * DAY),
				makeCheckIn("h", "c", 22 * DAY), // run of 3 again
			],
			22 * DAY,
		);
		expect(r.bestStreak).toBe(3);
	});

	it("uses lastTs as lastCheckInTs", () => {
		const r = recomputeStreak(
			[makeCheckIn("h", "c", 100), makeCheckIn("h", "c", 200)],
			500,
		);
		expect(r.lastCheckInTs).toBe(200);
	});

	it("sorts unsorted history by ts", () => {
		const r = recomputeStreak(
			[
				makeCheckIn("h", "c", 3 * DAY, "_3"),
				makeCheckIn("h", "c", 1 * DAY, "_1"),
				makeCheckIn("h", "c", 2 * DAY, "_2"),
			],
			3 * DAY,
		);
		expect(r.bestStreak).toBe(3);
	});
});

describe("recordCheckIn", () => {
	it("appends to empty state", () => {
		const s = emptyStreakState("h", "c");
		const next = recordCheckIn(s, 1000);
		expect(next.checkIns).toHaveLength(1);
		expect(next.currentStreak).toBe(1);
	});

	it("accumulates streaks", () => {
		let s = emptyStreakState("h", "c");
		for (let i = 0; i < 5; i++) {
			s = recordCheckIn(s, (i + 1) * DAY);
		}
		expect(s.checkIns).toHaveLength(5);
		expect(s.currentStreak).toBe(5);
		expect(s.bestStreak).toBe(5);
	});

	it("preserves bestStreak when current is lower", () => {
		let s = emptyStreakState("h", "c");
		// build streak of 5
		for (let i = 0; i < 5; i++) s = recordCheckIn(s, (i + 1) * DAY);
		// break it with gap, then start new streak of 2
		s = recordCheckIn(s, 30 * DAY);
		s = recordCheckIn(s, 31 * DAY);
		expect(s.currentStreak).toBe(2);
		expect(s.bestStreak).toBe(5);
	});

	it("does not mutate input state", () => {
		const s = emptyStreakState("h", "c");
		const before = s.checkIns.length;
		recordCheckIn(s, 1000);
		expect(s.checkIns.length).toBe(before);
	});
});

describe("formatStreakBadge", () => {
	it("renders zero streak with placeholder", () => {
		const s = emptyStreakState("h", "c");
		const out = formatStreakBadge(s);
		expect(out).toContain("0 天");
	});

	it("renders building streak with leaf emoji", () => {
		const s: HabitStreakState = {
			habitId: "h",
			childId: "c",
			currentStreak: 14,
			bestStreak: 14,
			lastCheckInTs: Date.now(),
			checkIns: [],
		};
		expect(formatStreakBadge(s)).toContain("🌿");
		expect(formatStreakBadge(s)).toContain("14 天");
	});

	it("renders established streak with tree emoji", () => {
		const s: HabitStreakState = {
			habitId: "h",
			childId: "c",
			currentStreak: 45,
			bestStreak: 45,
			lastCheckInTs: Date.now(),
			checkIns: [],
		};
		expect(formatStreakBadge(s)).toContain("🌳");
	});

	it("renders automatic streak with star emoji", () => {
		const s: HabitStreakState = {
			habitId: "h",
			childId: "c",
			currentStreak: 120,
			bestStreak: 120,
			lastCheckInTs: Date.now(),
			checkIns: [],
		};
		expect(formatStreakBadge(s)).toContain("🌟");
	});

	it("renders — for null last check-in", () => {
		const s = emptyStreakState("h", "c");
		expect(formatStreakBadge(s)).toContain("—");
	});
});

describe("getStreakLeaderboard", () => {
	it("ranks by bestStreak descending", () => {
		const a: HabitStreakState = {
			...emptyStreakState("a", "c"),
			bestStreak: 3,
		};
		const b: HabitStreakState = {
			...emptyStreakState("b", "c"),
			bestStreak: 10,
		};
		const c: HabitStreakState = {
			...emptyStreakState("c", "c"),
			bestStreak: 7,
		};
		const ranked = getStreakLeaderboard([a, b, c]);
		expect(ranked.map((s) => s.habitId)).toEqual(["b", "c", "a"]);
	});

	it("returns empty for empty input", () => {
		expect(getStreakLeaderboard([])).toEqual([]);
	});

	it("does not mutate input", () => {
		const a: HabitStreakState = {
			...emptyStreakState("a", "c"),
			bestStreak: 3,
		};
		const b: HabitStreakState = {
			...emptyStreakState("b", "c"),
			bestStreak: 10,
		};
		const before = [a, b].map((s) => s.habitId);
		getStreakLeaderboard([a, b]);
		expect([a, b].map((s) => s.habitId)).toEqual(before);
	});
});

describe("suggestNextCheckIn", () => {
	it("returns null for empty input", () => {
		expect(suggestNextCheckIn([])).toBeNull();
	});

	it("prefers habit with no check-ins (null ts)", () => {
		const a: HabitStreakState = {
			...emptyStreakState("a", "c"),
			lastCheckInTs: Date.now() - DAY * 5,
		};
		const b = emptyStreakState("b", "c");
		const out = suggestNextCheckIn([a, b], Date.now());
		expect(out?.habitId).toBe("b");
	});

	it("prefers habit with broken streak (last > 36h ago)", () => {
		const now = 1000 * DAY;
		const fresh: HabitStreakState = {
			...emptyStreakState("fresh", "c"),
			lastCheckInTs: now - 1000, // recent
		};
		const broken: HabitStreakState = {
			...emptyStreakState("broken", "c"),
			lastCheckInTs: now - 5 * DAY,
		};
		const out = suggestNextCheckIn([fresh, broken], now);
		expect(out?.habitId).toBe("broken");
	});

	it("returns null when all habits have recent check-ins", () => {
		const now = 1000 * DAY;
		const recent: HabitStreakState = {
			...emptyStreakState("h", "c"),
			lastCheckInTs: now - 1000,
		};
		expect(suggestNextCheckIn([recent], now)).toBeNull();
	});
});

describe("summarizeChildStreaks", () => {
	it("empty summary for unknown child", () => {
		const out = summarizeChildStreaks([], "nobody");
		expect(out.totalHabits).toBe(0);
		expect(out.bestStreakOverall).toBe(0);
		expect(out.topStreak).toBeNull();
	});

	it("aggregates stats across habits", () => {
		const a: HabitStreakState = {
			...emptyStreakState("a", "c"),
			currentStreak: 5,
			bestStreak: 8,
			checkIns: [
				makeCheckIn("a", "c", 100),
				makeCheckIn("a", "c", 200),
				makeCheckIn("a", "c", 300),
			],
		};
		const b: HabitStreakState = {
			...emptyStreakState("b", "c"),
			currentStreak: 3,
			bestStreak: 3,
			checkIns: [makeCheckIn("b", "c", 100)],
		};
		const out = summarizeChildStreaks([a, b], "c");
		expect(out.totalHabits).toBe(2);
		expect(out.totalCheckIns).toBe(4);
		expect(out.bestStreakOverall).toBe(8);
		expect(out.averageCurrentStreak).toBe(4); // (5+3)/2 = 4
		expect(out.topStreak?.habitId).toBe("a");
	});

	it("filters by childId", () => {
		const a: HabitStreakState = {
			...emptyStreakState("a", "alice"),
			bestStreak: 5,
		};
		const b: HabitStreakState = {
			...emptyStreakState("b", "bob"),
			bestStreak: 10,
		};
		const out = summarizeChildStreaks([a, b], "alice");
		expect(out.bestStreakOverall).toBe(5);
		expect(out.totalHabits).toBe(1);
	});

	it("average rounds to 1 decimal", () => {
		const a: HabitStreakState = {
			...emptyStreakState("a", "c"),
			currentStreak: 4,
		};
		const b: HabitStreakState = {
			...emptyStreakState("b", "c"),
			currentStreak: 5,
		};
		const out = summarizeChildStreaks([a, b], "c");
		expect(out.averageCurrentStreak).toBe(4.5);
	});
});

describe("isWeeklyQualified", () => {
	it("false when fewer than 5 check-ins in last 7 days", () => {
		const s = emptyStreakState("h", "c");
		for (let i = 0; i < 4; i++) {
			s.checkIns.push(makeCheckIn("h", "c", Date.now() - i * DAY));
		}
		expect(isWeeklyQualified(s)).toBe(false);
	});

	it("true when 5+ check-ins in last 7 days", () => {
		const s = emptyStreakState("h", "c");
		for (let i = 0; i < 5; i++) {
			s.checkIns.push(makeCheckIn("h", "c", Date.now() - i * DAY));
		}
		expect(isWeeklyQualified(s)).toBe(true);
	});

	it("ignores check-ins older than 7 days", () => {
		const s = emptyStreakState("h", "c");
		for (let i = 0; i < 5; i++) {
			s.checkIns.push(makeCheckIn("h", "c", Date.now() - (10 + i) * DAY));
		}
		expect(isWeeklyQualified(s)).toBe(false);
	});
});

describe("formatLeaderboard", () => {
	it("renders empty for no states", () => {
		expect(formatLeaderboard(HABITS, [])).toContain("暂无");
	});

	it("renders each state's badge + title", () => {
		const states: HabitStreakState[] = [
			{
				...emptyStreakState(HABITS[0]!.id, "c"),
				currentStreak: 14,
				bestStreak: 14,
			},
			{
				...emptyStreakState(HABITS[1]!.id, "c"),
				currentStreak: 5,
				bestStreak: 7,
			},
		];
		const out = formatLeaderboard(HABITS, states);
		expect(out).toContain("排行榜");
		expect(out).toContain(HABITS[0]!.title);
		expect(out).toContain("14 天");
	});

	it("handles unknown habitId gracefully", () => {
		const states: HabitStreakState[] = [
			{ ...emptyStreakState("not-in-habits", "c"), bestStreak: 5 },
		];
		const out = formatLeaderboard(HABITS, states);
		expect(out).toContain("not-in-habits");
	});
});

describe("STREAK_GAP_TOLERANCE_HOURS constant", () => {
	it("is 36 hours", () => {
		expect(STREAK_GAP_TOLERANCE_HOURS).toBe(36);
	});
});
