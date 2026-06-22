import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import { createHabitBuilderAgent } from "../src/agent.js";
import {
	getHabitById,
	getHabitsByDomain,
	getHabitsForAge,
	HABIT_FORMATION_AVG_DAYS,
	HABITS,
	type Habit,
	habitLoop,
	habitStepCount,
	habitTotalDuration,
	SCREEN_TIME_GUIDELINES,
	SLEEP_HOURS_GUIDELINES,
	screenTimeForAge,
	sleepHoursForAge,
	streakLevel,
} from "../src/knowledge.js";

function makeChild(ageMonths: number): ChildProfile {
	const _birthYear = new Date().getFullYear() - Math.floor(ageMonths / 12);
	return {
		id: "test-child",
		name: "测试宝宝",
		birthDate: new Date(
			Date.now() - ageMonths * 30.44 * 24 * 60 * 60 * 1000,
		)
			.toISOString()
			.split("T")[0],
		stage:
			ageMonths < 3
				? "newborn"
				: ageMonths < 12
					? "infant"
					: ageMonths < 36
						? "toddler"
						: ageMonths < 72
							? "preschool"
							: "school_age",
	};
}

describe("HabitBuilderAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createHabitBuilderAgent();
		expect(a.id).toBe("habit-builder");
		expect(a.name).toBe("习惯养成");
	});

	it("topic is habits", () => {
		expect(createHabitBuilderAgent().topics).toEqual(["habits"]);
	});

	it("supports all 8 stages", () => {
		const stages = createHabitBuilderAgent().stages;
		expect(stages.length).toBe(8);
		expect(stages).toContain("newborn");
		expect(stages).toContain("teen");
	});
});

describe("HabitBuilderAgent — respond: habit intent", () => {
	const agent = createHabitBuilderAgent();
	const ctx = { memory: undefined } as any;

	it("shows specific habit when title mentioned", async () => {
		const r = await agent.respond("刷牙习惯", makeChild(36), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toContain("刷牙");
		expect(r.content).toMatch(/步骤|分钟/);
	});

	it("shows bedtime routine", async () => {
		const r = await agent.respond("睡前例行程序", makeChild(48), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toContain("洗澡");
	});

	it("lists habits for age when no specific habit", async () => {
		const r = await agent.respond("培养习惯", makeChild(36), ctx);
		expect(r.confidence).toBeGreaterThan(0.6);
		expect(r.content).toMatch(/适合培养|习惯/);
	});

	it("shows habit loop when requested", async () => {
		// Use bedtime routine — has 4 non-cue/reward steps in routine
		const r = await agent.respond("睡前例行程序循环", makeChild(48), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toContain("触发");
		expect(r.content).toContain("奖励");
		expect(r.content).toContain("洗澡");
	});

	it("shows habit loop with no middle steps", async () => {
		// Brushing teeth has only cue steps → routine is empty
		const r = await agent.respond("刷牙习惯循环", makeChild(48), ctx);
		expect(r.content).toContain("无中间步骤");
	});

	it("returns disclaimer", async () => {
		const r = await agent.respond("睡前例行程序", makeChild(48), ctx);
		expect(r.content).toContain("⚠️");
	});

	it("handles age with no habits", async () => {
		const r = await agent.respond("培养习惯", makeChild(1), ctx);
		expect(r.content).toMatch(/暂无|习惯/);
	});
});

describe("HabitBuilderAgent — respond: screen intent", () => {
	const agent = createHabitBuilderAgent();
	const ctx = { memory: undefined } as any;

	it("returns screen time for 2-year-old", async () => {
		const r = await agent.respond("屏幕时间", makeChild(36), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/60|1 小时/);
	});

	it("returns 0 minutes for under 18 months", async () => {
		const r = await agent.respond("宝宝看电视", makeChild(12), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/0|避免/);
	});

	it("warns about pre-bedtime screen", async () => {
		const r = await agent.respond("看电视", makeChild(72), ctx);
		expect(r.content).toMatch(/屏幕|时间/);
	});
});

describe("HabitBuilderAgent — respond: sleep intent", () => {
	const agent = createHabitBuilderAgent();
	const ctx = { memory: undefined } as any;

	it("returns sleep hours for newborn", async () => {
		const r = await agent.respond("睡眠", makeChild(1), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/16|小时/);
	});

	it("returns sleep hours for preschooler", async () => {
		const r = await agent.respond("哄睡", makeChild(48), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/11|10|小时/);
	});

	it("advises fixed schedule", async () => {
		const r = await agent.respond("睡觉", makeChild(48), ctx);
		expect(r.content).toMatch(/固定|作息/);
	});
});

describe("HabitBuilderAgent — respond: streak intent", () => {
	const agent = createHabitBuilderAgent();
	const ctx = { memory: undefined } as any;

	it("returns streak level for 5 days (new)", async () => {
		const r = await agent.respond("已经坚持 5 天了", makeChild(36), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/新手|刚开始/);
	});

	it("returns streak level for 45 days (established)", async () => {
		const r = await agent.respond("坚持 45 天", makeChild(36), ctx);
		expect(r.content).toMatch(/稳定|建立/);
	});

	it("returns streak level for 100 days (automatic)", async () => {
		const r = await agent.respond("100 days", makeChild(36), ctx);
		expect(r.content).toMatch(/自动化|已自动/);
	});

	it("returns building streak level (15 days)", async () => {
		const r = await agent.respond("已经坚持 15 天", makeChild(36), ctx);
		expect(r.content).toMatch(/养成期|进展不错/);
	});

	it("returns help when no number provided", async () => {
		const r = await agent.respond("坚持几天", makeChild(36), ctx);
		expect(r.confidence).toBeLessThan(0.5);
	});
});

describe("HabitBuilderAgent — respond: list intent", () => {
	const agent = createHabitBuilderAgent();
	const ctx = { memory: undefined } as any;

	it("lists all habits for age", async () => {
		const r = await agent.respond("列表", makeChild(36), ctx);
		expect(r.confidence).toBeGreaterThan(0.6);
		expect(r.content).toContain("推荐习惯");
	});

	it("shows count of habits", async () => {
		const r = await agent.respond("所有习惯", makeChild(48), ctx);
		expect(r.content).toMatch(/\d+ 个/);
	});
});

describe("HabitBuilderAgent — respond: screen intent edge cases", () => {
	const agent = createHabitBuilderAgent();
	const ctx = { memory: undefined } as any;

	it("returns message for very old age (no guideline)", async () => {
		// 240 months = 20 years, no screen guideline
		const r = await agent.respond("屏幕时间", makeChild(240), ctx);
		expect(r.content).toMatch(/暂无|屏幕时间建议/);
	});
});

describe("HabitBuilderAgent — respond: sleep intent edge cases", () => {
	const agent = createHabitBuilderAgent();
	const ctx = { memory: undefined } as any;

	it("returns message for very old age (no guideline)", async () => {
		const r = await agent.respond("睡眠", makeChild(240), ctx);
		expect(r.content).toMatch(/暂无|睡眠时间建议/);
	});
});

describe("formatHabit with reward step", () => {
	it("renders reward in step description", async () => {
		const agent = createHabitBuilderAgent();
		const ctx = { memory: undefined } as any;
		// vegetable-intro has a reward step
		const r = await agent.respond("蔬菜摄入", makeChild(36), ctx);
		expect(r.content).toContain("🎁");
	});
});

describe("HabitBuilderAgent — respond: general intent", () => {
	const agent = createHabitBuilderAgent();
	const ctx = { memory: undefined } as any;

	it("returns help message", async () => {
		const r = await agent.respond("你好", makeChild(36), ctx);
		expect(r.confidence).toBeGreaterThanOrEqual(0.5);
		expect(r.content).toMatch(/习惯养成|帮助/);
	});
});

describe("getHabitsForAge", () => {
	it("returns habits for 1-year-old", () => {
		const habits = getHabitsForAge(12);
		expect(habits.length).toBeGreaterThan(0);
	});

	it("filters by domain", () => {
		const sleepHabits = getHabitsForAge(48, "sleep");
		expect(sleepHabits.length).toBeGreaterThan(0);
		expect(sleepHabits.every((h) => h.domain === "sleep")).toBe(true);
	});

	it("returns empty for age outside range", () => {
		const habits = getHabitsForAge(240); // 20 years old
		expect(habits).toEqual([]);
	});
});

describe("getHabitsByDomain", () => {
	it("returns only sleep habits", () => {
		const habits = getHabitsByDomain("sleep");
		expect(habits.every((h) => h.domain === "sleep")).toBe(true);
	});

	it("returns hygiene habits", () => {
		const habits = getHabitsByDomain("hygiene");
		expect(habits.every((h) => h.domain === "hygiene")).toBe(true);
	});

	it("returns nutrition habits", () => {
		const habits = getHabitsByDomain("nutrition");
		expect(habits.every((h) => h.domain === "nutrition")).toBe(true);
	});

	it("returns screen habits", () => {
		const habits = getHabitsByDomain("screen");
		expect(habits.every((h) => h.domain === "screen")).toBe(true);
	});

	it("returns chores habits", () => {
		const habits = getHabitsByDomain("chores");
		expect(habits.every((h) => h.domain === "chores")).toBe(true);
	});

	it("returns school habits", () => {
		const habits = getHabitsByDomain("school");
		expect(habits.every((h) => h.domain === "school")).toBe(true);
	});
});

describe("getHabitById", () => {
	it("returns habit when found", () => {
		const h = getHabitById("habit-brushing-teeth");
		expect(h).toBeDefined();
		expect(h?.id).toBe("habit-brushing-teeth");
	});

	it("returns undefined for unknown id", () => {
		expect(getHabitById("unknown")).toBeUndefined();
	});
});

describe("habitStepCount", () => {
	it("counts steps correctly", () => {
		const h = HABITS.find((x) => x.id === "habit-bedtime-routine")!;
		expect(habitStepCount(h)).toBe(6);
	});

	it("returns 0 for habit with no steps", () => {
		const h: Habit = {
			id: "test",
			domain: "sleep",
			title: "test",
			description: "",
			ageMonthsMin: 0,
			ageMonthsMax: 12,
			steps: [],
			frequencyPerDay: 1,
			difficulty: "easy",
			formationDays: 30,
		};
		expect(habitStepCount(h)).toBe(0);
	});
});

describe("habitTotalDuration", () => {
	it("sums all step durations", () => {
		const h = HABITS.find((x) => x.id === "habit-brushing-teeth")!;
		expect(habitTotalDuration(h)).toBe(4); // 2 + 2
	});

	it("returns 0 for empty steps", () => {
		const h: Habit = {
			id: "test",
			domain: "sleep",
			title: "test",
			description: "",
			ageMonthsMin: 0,
			ageMonthsMax: 12,
			steps: [],
			frequencyPerDay: 1,
			difficulty: "easy",
			formationDays: 30,
		};
		expect(habitTotalDuration(h)).toBe(0);
	});
});

describe("habitLoop", () => {
	it("returns cue, routine, reward", () => {
		const h = HABITS.find((x) => x.id === "habit-vegetable-intro")!;
		const loop = habitLoop(h);
		expect(loop.cue).toMatch(/cue|trigger|time/);
		expect(loop.routine.length).toBeGreaterThan(0);
		expect(loop.reward).toBeDefined();
	});

	it("handles habit without explicit cue", () => {
		const h: Habit = {
			id: "test",
			domain: "sleep",
			title: "test",
			description: "",
			ageMonthsMin: 0,
			ageMonthsMax: 12,
			steps: [{ order: 1, action: "do thing", durationMinutes: 1 }],
			frequencyPerDay: 1,
			difficulty: "easy",
			formationDays: 30,
		};
		const loop = habitLoop(h);
		expect(loop.cue).toBe("无明确触发");
		expect(loop.reward).toBe("完成后表扬");
	});

	it("handles habit without explicit reward", () => {
		const h: Habit = {
			id: "test",
			domain: "sleep",
			title: "test",
			description: "",
			ageMonthsMin: 0,
			ageMonthsMax: 12,
			steps: [
				{ order: 1, cue: "time", action: "do", durationMinutes: 1 },
			],
			frequencyPerDay: 1,
			difficulty: "easy",
			formationDays: 30,
		};
		const loop = habitLoop(h);
		expect(loop.cue).toMatch(/time/);
		expect(loop.reward).toBe("完成后表扬");
	});

	it("handles habit where all steps have cue or reward (empty routine)", () => {
		const h: Habit = {
			id: "test",
			domain: "sleep",
			title: "test",
			description: "",
			ageMonthsMin: 0,
			ageMonthsMax: 12,
			steps: [
				{
					order: 1,
					cue: "time",
					action: "cue step",
					durationMinutes: 1,
				},
				{
					order: 2,
					action: "and reward",
					reward: "treat",
					durationMinutes: 1,
				},
			],
			frequencyPerDay: 1,
			difficulty: "easy",
			formationDays: 30,
		};
		const loop = habitLoop(h);
		expect(loop.routine).toEqual([]);
	});
});

describe("streakLevel", () => {
	it("returns new for <7 days", () => {
		expect(streakLevel(0)).toBe("new");
		expect(streakLevel(6)).toBe("new");
	});

	it("returns building for 7-29 days", () => {
		expect(streakLevel(7)).toBe("building");
		expect(streakLevel(29)).toBe("building");
	});

	it("returns established for 30-89 days", () => {
		expect(streakLevel(30)).toBe("established");
		expect(streakLevel(89)).toBe("established");
	});

	it("returns automatic for >=90 days", () => {
		expect(streakLevel(90)).toBe("automatic");
		expect(streakLevel(365)).toBe("automatic");
	});
});

describe("screenTimeForAge", () => {
	it("returns 0 for <18 months", () => {
		const g = screenTimeForAge(12);
		expect(g).toBeDefined();
		expect(g?.dailyLimitMinutes).toBe(0);
	});

	it("returns 30 for 18-24 months", () => {
		expect(screenTimeForAge(20)?.dailyLimitMinutes).toBe(30);
	});

	it("returns 60 for 24-60 months", () => {
		expect(screenTimeForAge(36)?.dailyLimitMinutes).toBe(60);
	});

	it("returns 120 for 60+ months", () => {
		expect(screenTimeForAge(72)?.dailyLimitMinutes).toBe(120);
	});

	it("returns undefined for out of range", () => {
		expect(screenTimeForAge(240)).toBeUndefined();
	});
});

describe("sleepHoursForAge", () => {
	it("returns 16 hours for newborn", () => {
		expect(sleepHoursForAge(1)?.hoursPerDay).toBe(16);
	});

	it("returns 12 for 4-11 months", () => {
		expect(sleepHoursForAge(8)?.hoursPerDay).toBe(12);
	});

	it("returns 11 for 1-5 years", () => {
		expect(sleepHoursForAge(36)?.hoursPerDay).toBe(11);
	});

	it("returns 10 for school age", () => {
		expect(sleepHoursForAge(96)?.hoursPerDay).toBe(10);
	});

	it("returns 9 for teen", () => {
		expect(sleepHoursForAge(180)?.hoursPerDay).toBe(9);
	});

	it("includes nap for younger ages", () => {
		expect(sleepHoursForAge(12)?.includesNap).toBe(true);
	});

	it("excludes nap for older ages", () => {
		expect(sleepHoursForAge(48)?.includesNap).toBe(false);
	});
});

describe("Habit data sanity", () => {
	it("HABITS is not empty", () => {
		expect(HABITS.length).toBeGreaterThan(5);
	});

	it("all habits have unique ids", () => {
		const ids = new Set(HABITS.map((h) => h.id));
		expect(ids.size).toBe(HABITS.length);
	});

	it("all habits have valid age ranges", () => {
		for (const h of HABITS) {
			expect(h.ageMonthsMin).toBeGreaterThanOrEqual(0);
			expect(h.ageMonthsMax).toBeGreaterThan(h.ageMonthsMin);
		}
	});

	it("all habits have steps in correct order", () => {
		for (const h of HABITS) {
			const orders = h.steps.map((s) => s.order);
			expect(orders).toEqual([...orders].sort((a, b) => a - b));
		}
	});

	it("HABIT_FORMATION_AVG_DAYS is 66 (Lally)", () => {
		expect(HABIT_FORMATION_AVG_DAYS).toBe(66);
	});

	it("SCREEN_TIME_GUIDELINES covers all stages", () => {
		expect(SCREEN_TIME_GUIDELINES.length).toBeGreaterThanOrEqual(3);
	});

	it("SLEEP_HOURS_GUIDELINES covers all stages", () => {
		expect(SLEEP_HOURS_GUIDELINES.length).toBeGreaterThanOrEqual(4);
	});
});
