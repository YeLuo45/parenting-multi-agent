import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import {
	calculateFundValue,
	createFinanceAgent,
	estimateTotalEducationCost,
	FinanceAgent,
	getEssentialInsurance,
	getInsurance,
	getRecommendedPlan,
	getSchoolFee,
} from "../src/index.js";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

const makeChild = (
	ageDays: number,
	id = "c1",
	name = "TestChild",
	stage?: ChildProfile["stage"],
): ChildProfile => ({
	id,
	name,
	birthDate: daysAgo(ageDays),
	stage: stage ?? "toddler",
});

describe("Knowledge: education fund", () => {
	it("returns recommended plan for 0-month-old", () => {
		const plan = getRecommendedPlan(0);
		expect(plan).not.toBeNull();
	});

	it("returns early_start_low for 0-month-old (closest match)", () => {
		const plan = getRecommendedPlan(0);
		expect(plan?.id).toBe("early_start_low");
	});

	it("returns mid_start for 6yo (12-year plan)", () => {
		const plan = getRecommendedPlan(72);
		expect(plan?.id).toBe("mid_start");
	});

	it("calculateFundValue: 500/month for 18 years at 4% ~ 165k", () => {
		const plan = getRecommendedPlan(0)!;
		const value = calculateFundValue(plan);
		expect(value).toBeGreaterThan(150000);
		expect(value).toBeLessThan(180000);
	});

	it("calculateFundValue: stops at yearsToMaturity", () => {
		// early_start_low: 18 years, 500/month
		const plan = getRecommendedPlan(0)!;
		// 25 years (300 months) → should be capped at 18*12=216
		const value25 = calculateFundValue(plan, 300);
		const value18 = calculateFundValue(plan, 216);
		expect(value25).toBe(value18);
	});
});

describe("Knowledge: insurance", () => {
	it("returns essential insurance types", () => {
		const essentials = getEssentialInsurance();
		expect(essentials.length).toBeGreaterThan(0);
		expect(essentials.every((i) => i.priority === "essential")).toBe(true);
	});

	it("finds insurance by id", () => {
		const i = getInsurance("medical");
		expect(i?.id).toBe("medical");
	});

	it("returns null for unknown id", () => {
		expect(getInsurance("unknown")).toBeNull();
	});
});

describe("Knowledge: school fees", () => {
	it("returns 小学 fee", () => {
		const f = getSchoolFee("小学");
		expect(f?.publicSchool).toBe(0);
	});

	it("returns null for unknown stage", () => {
		expect(getSchoolFee("unknown")).toBeNull();
	});

	it("estimates public total", () => {
		const total = estimateTotalEducationCost("public");
		// 幼儿园(6k) + 小学(8k) + 初中(10k) + 高中(14k) + 大学国内(11k) + 大学留学(320k) = ~369k
		expect(total).toBeGreaterThan(300000);
		expect(total).toBeLessThan(400000);
	});

	it("estimates private total", () => {
		const total = estimateTotalEducationCost("private");
		expect(total).toBeGreaterThan(500000);
		expect(total).toBeLessThan(800000);
	});

	it("estimates study_abroad total", () => {
		const total = estimateTotalEducationCost("study_abroad");
		expect(total).toBeGreaterThan(500000);
	});
});

describe("FinanceAgent", () => {
	const agent = new FinanceAgent();

	describe("metadata", () => {
		it("has correct id and name", () => {
			expect(agent.id).toBe("finance");
			expect(agent.name).toBe("家庭财务规划师");
		});

		it("handles finance topic", () => {
			expect(agent.topics).toContain("finance");
		});
	});

	describe("fund queries", () => {
		it("returns fund plan for newborn", async () => {
			const reply = await agent.respond(
				"宝宝教育金怎么存",
				makeChild(15, "c", "Kid", "newborn"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("教育金");
		});

		it("returns fund plan for 7-year-old (mid_start)", async () => {
			// 7yo = 84mo → exactly mid_start (72)
			const reply = await agent.respond(
				"教育金怎么存",
				makeChild(7 * 365, "c", "Kid", "school_age"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			// 6yo plan: monthlyAmount=3000, yearsToMaturity=12
			expect(reply.content).toContain("3000");
		});
	});

	describe("insurance queries", () => {
		it("returns insurance priority list", async () => {
			const reply = await agent.respond(
				"宝宝保险怎么买",
				makeChild(365, "c", "Kid", "infant"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("医保");
		});
	});

	describe("fees queries", () => {
		it("returns 小学 fees for school-age child", async () => {
			const reply = await agent.respond(
				"小学学费多少",
				makeChild(365 * 8, "c", "Kid", "school_age"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("小学");
		});

		it("returns 大学 fees for young_adult", async () => {
			const reply = await agent.respond(
				"大学学费",
				makeChild(365 * 19, "c", "Kid", "young_adult"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("大学");
		});

		it("returns 幼儿园 fees for toddler", async () => {
			const reply = await agent.respond(
				"幼儿园学费",
				makeChild(365 * 2, "c", "Kid", "toddler"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("幼儿园");
		});

		it("returns 初中 fees for tween", async () => {
			const reply = await agent.respond(
				"初中学费",
				makeChild(365 * 13, "c", "Kid", "tween"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("初中");
		});

		it("returns 高中 fees for teen", async () => {
			const reply = await agent.respond(
				"高中学费",
				makeChild(365 * 16, "c", "Kid", "teen"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("高中");
		});

		it("falls back to 小学 for newborn stage (covers branch 153 false)", async () => {
			const reply = await agent.respond(
				"宝宝学费",
				makeChild(15, "c", "Kid", "newborn"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			// newborn has no fee entry → falls back to 小学
			expect(reply.content).toContain("小学");
		});
	});

	describe("total cost queries", () => {
		it("returns public total cost", async () => {
			const reply = await agent.respond(
				"教育总费用",
				makeChild(365, "c", "Kid", "infant"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toMatch(/\d/);
		});

		it("returns private total cost", async () => {
			const reply = await agent.respond(
				"私立教育总费用",
				makeChild(365, "c", "Kid", "infant"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("私立");
		});

		it("returns study_abroad total cost", async () => {
			const reply = await agent.respond(
				"留学总费用",
				makeChild(365, "c", "Kid", "infant"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("留学");
		});
	});

	describe("general queries", () => {
		it("introduces itself for vague questions", async () => {
			const reply = await agent.respond(
				"你好",
				makeChild(365, "c", "Kid", "infant"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("家庭财务规划师");
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});

	describe("factory and edge cases", () => {
		it("createFinanceAgent returns a working agent", async () => {
			const a = createFinanceAgent();
			expect(a.id).toBe("finance");
			const reply = await a.respond(
				"宝宝保险",
				makeChild(365, "c", "Kid", "infant"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.agentId).toBe("finance");
		});

		it("computes stage when child.stage is undefined", async () => {
			const childWithoutStage = {
				id: "c1",
				name: "Test",
				birthDate: "2024-06-19",
				stage: undefined as unknown as "toddler",
			};
			const reply = await agent.respond("宝宝保险", childWithoutStage, {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("finance");
		});
	});
});
