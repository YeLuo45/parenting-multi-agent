import { describe, expect, it } from "vitest";
import {
	SleepCoachAgent,
	createSleepCoachAgent,
	getSleepMethodsForAge,
	getSleepMethod,
	getSleepRegression,
	getNapSchedule,
	getNightWakingCauses,
} from "../src/index.js";
import type { ChildProfile } from "@parenting/memory";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const makeChild = (ageDays: number, id = "c1", name = "TestChild", stage?: ChildProfile["stage"]): ChildProfile => ({
	id,
	name,
	birthDate: daysAgo(ageDays),
	stage: stage ?? "infant",
});

describe("Knowledge: sleep methods", () => {
	it("returns methods for 6-month-old", () => {
		const m = getSleepMethodsForAge(6);
		expect(m.length).toBeGreaterThan(0);
	});

	it("returns no methods for newborn (0 months)", () => {
		const m = getSleepMethodsForAge(0);
		expect(m.length).toBe(0);
	});

	it("returns more methods for 12-month-old", () => {
		const m6 = getSleepMethodsForAge(6);
		const m12 = getSleepMethodsForAge(12);
		expect(m12.length).toBeGreaterThanOrEqual(m6.length);
	});

	it("finds method by id", () => {
		const m = getSleepMethod("fading");
		expect(m?.id).toBe("fading");
	});

	it("returns null for unknown id", () => {
		expect(getSleepMethod("unknown" as never)).toBeNull();
	});
});

describe("Knowledge: sleep regressions", () => {
	it("returns 4-month regression near 4 months", () => {
		const r = getSleepRegression(4);
		expect(r?.ageMonths).toBe(4);
	});

	it("returns 8-month regression near 8 months", () => {
		const r = getSleepRegression(8);
		expect(r?.ageMonths).toBe(8);
	});

	it("returns null for 6 months (between regressions)", () => {
		const r = getSleepRegression(6);
		// 6 is 2 away from 4 and 2 away from 8 — both within 2
		// 4 is the nearest
		expect(r).not.toBeNull();
	});

	it("returns null for newborn", () => {
		const r = getSleepRegression(0);
		expect(r).toBeNull();
	});
});

describe("Knowledge: nap schedules", () => {
	it("returns 3-nap schedule for 6-month-old", () => {
		const s = getNapSchedule(6);
		expect(s.totalNaps).toBe(3);
	});

	it("returns 2-nap schedule for 12-month-old", () => {
		const s = getNapSchedule(12);
		expect(s.totalNaps).toBe(2);
	});

	it("returns 1-nap schedule for 18-month-old", () => {
		const s = getNapSchedule(18);
		expect(s.totalNaps).toBe(1);
	});

	it("returns 0-nap schedule for 5-year-old", () => {
		const s = getNapSchedule(60);
		expect(s.totalNaps).toBe(0);
	});
});

describe("Knowledge: night waking causes", () => {
	it("returns causes for newborn", () => {
		const c = getNightWakingCauses(1);
		expect(c.length).toBeGreaterThan(0);
	});

	it("returns causes for 6-month-old (multiple)", () => {
		const c = getNightWakingCauses(6);
		expect(c.length).toBeGreaterThan(1);
	});

	it("returns 0 causes for very old child", () => {
		const c = getNightWakingCauses(120); // 10 years
		expect(c.length).toBe(0);
	});
});

describe("SleepCoachAgent", () => {
	const agent = new SleepCoachAgent();

	describe("metadata", () => {
		it("has correct id and name", () => {
			expect(agent.id).toBe("sleep-coach");
			expect(agent.name).toBe("睡眠顾问");
		});

		it("handles sleep topic", () => {
			expect(agent.topics).toContain("sleep");
		});
	});

	describe("training queries", () => {
		it("returns methods for 8-month-old", async () => {
			const reply = await agent.respond("宝宝睡眠训练方法", makeChild(240, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/Ferber|哭声|消退/);
		});

		it("returns no methods for newborn", async () => {
			const reply = await agent.respond("宝宝睡眠训练", makeChild(15, "c", "Kid", "newborn"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("暂不适合");
		});
	});

	describe("regression queries", () => {
		it("returns 4-month regression info", async () => {
			const reply = await agent.respond("宝宝突然不睡", makeChild(120, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/倒退|regression/);
		});

		it("returns 8-month regression info", async () => {
			const reply = await agent.respond("宝宝睡眠倒退", makeChild(240, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("8 月");
		});

		it("returns no regression for unusual age", async () => {
			const reply = await agent.respond("宝宝突然不睡", makeChild(365 * 6, "c", "Kid", "school_age"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			// 6yo — no standard regression, but generic advice
			expect(reply.content).toMatch(/检查|出牙|生病/);
		});
	});

	describe("schedule queries", () => {
		it("returns schedule for 9-month-old", async () => {
			const reply = await agent.respond("宝宝作息", makeChild(270, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/小睡|夜间/);
		});

		it("returns schedule for 18-month-old", async () => {
			// Use 18*30 days ≈ 540 days; nearest schedule is 12 or 18 depending on rounding
			const reply = await agent.respond("宝宝每天小睡几次", makeChild(18 * 30.4, "c", "Kid", "toddler"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			// 18mo schedule is 1 nap; 12mo is 2 naps
			expect(reply.content).toMatch(/次小睡/);
			expect(reply.content).toMatch(/小睡 1/);
		});

		it("returns 0-nap schedule for 6-year-old (covers branches 72 + 78 false)", async () => {
			const reply = await agent.respond("宝宝作息", makeChild(365 * 6, "c", "Kid", "school_age"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			// 6yo schedule has totalNaps=0 and no notes
			expect(reply.content).toMatch(/无小睡/);
			expect(reply.content).toMatch(/夜间睡眠/);
		});

		it("returns schedule for 19-month-old (no notes, covers branch 78 false)", async () => {
			// 19*30.44 = 578 days = 19 months. 18mo schedule has no notes.
			const reply = await agent.respond("宝宝作息", makeChild(19 * 30.44, "c", "Kid", "toddler"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			// 18mo schedule: 1 nap, no notes — no "💡 ..." line
			expect(reply.content).toMatch(/1\s*次小睡/);
			expect(reply.content).not.toMatch(/💡/);
		});
	});

	describe("night waking queries", () => {
		it("returns causes for 6-month-old", async () => {
			const reply = await agent.respond("宝宝夜醒", makeChild(180, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/倒退|焦虑|出牙/);
		});

		it("returns causes for 2-year-old", async () => {
			const reply = await agent.respond("宝宝夜里哭", makeChild(365 * 2, "c", "Kid", "toddler"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/噩梦|怕黑/);
		});
	});

	describe("routine queries", () => {
		it("returns bedtime routine", async () => {
			const reply = await agent.respond("宝宝睡前程序", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("洗澡");
		});
	});

	describe("general queries", () => {
		it("introduces itself for vague questions", async () => {
			const reply = await agent.respond("你好", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("睡眠顾问");
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});

	describe("factory and edge cases", () => {
		it("createSleepCoachAgent returns a working agent", async () => {
			const a = createSleepCoachAgent();
			expect(a.id).toBe("sleep-coach");
			const reply = await a.respond("宝宝夜醒", makeChild(180, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("sleep-coach");
		});

		it("computes stage when child.stage is undefined", async () => {
			const childWithoutStage = {
				id: "c1",
				name: "Test",
				birthDate: "2024-06-19",
				stage: undefined as unknown as "infant",
			};
			const reply = await agent.respond("宝宝夜醒", childWithoutStage, {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("sleep-coach");
		});
	});
});
