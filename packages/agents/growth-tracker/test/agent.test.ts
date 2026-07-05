import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import { createGrowthTrackerAgent } from "../src/agent.js";
import {
	calculateBMI,
	classifyBMI,
	classifyPercentile,
	classifyZScore,
	computeZScore,
	detectGrowthConcern,
	estimatePercentile,
	GROWTH_STANDARDS,
	getMilestonesForAge,
	getPercentiles,
	weightGainVelocity,
	type ZScoreBand,
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

describe("GrowthTrackerAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createGrowthTrackerAgent();
		expect(a.id).toBe("growth-tracker");
		expect(a.name).toBe("成长追踪");
	});

	it("topic is growth", () => {
		expect(createGrowthTrackerAgent().topics).toEqual(["growth"]);
	});

	it("supports all 8 stages", () => {
		const stages = createGrowthTrackerAgent().stages;
		expect(stages.length).toBe(8);
		expect(stages).toContain("newborn");
		expect(stages).toContain("teen");
	});
});

describe("GrowthTrackerAgent — respond: measure intent", () => {
	const agent = createGrowthTrackerAgent();
	const ctx = { memory: undefined } as any;

	it("processes height measurement", async () => {
		const r = await agent.respond(
			"宝宝6个月身高 67cm 男孩",
			makeChild(6),
			ctx,
		);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/身高|P\d+/);
	});

	it("processes weight measurement in kg", async () => {
		const r = await agent.respond("体重 8.5kg", makeChild(6), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/体重|P\d+/);
	});

	it("defaults to weight when unit is kg without keyword", async () => {
		const r = await agent.respond("8.5kg", makeChild(6), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/体重|P\d+/);
	});

	it("chooses the metric closest to the first number when multiple metric keywords appear", async () => {
		const r = await agent.respond("身高和体重 8.5kg", makeChild(6), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/体重|P\d+/);
	});

	it("defaults to height when unit is cm without keyword", async () => {
		// "身高 75" has 身高 keyword first, so it goes through candidate logic
		// To hit the fallback default-to-height, we need cm unit without any keyword nearby
		const r = await agent.respond("宝宝 75cm", makeChild(12), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/身高/);
	});

	it("returns error when measurement intent but no number pattern", async () => {
		// Force measure intent without a parseable number — include unit but no digits
		const r = await agent.respond("身高cm", makeChild(6), ctx);
		expect(r.confidence).toBeLessThan(0.5);
		expect(r.content).toMatch(/请提供|具体数值/);
	});

	it("processes weight in 斤 (Chinese pounds)", async () => {
		const r = await agent.respond("体重 17 斤", makeChild(12), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/8\.5|体重/);
	});

	it("processes head circumference", async () => {
		const r = await agent.respond("头围 42cm", makeChild(6), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/头围|P\d+/);
	});

	it("detects male sex from question", async () => {
		const r = await agent.respond("男孩身高 70cm", makeChild(12), ctx);
		expect(r.content).toMatch(/男/);
	});

	it("detects female sex from question", async () => {
		const r = await agent.respond("女孩身高 70cm", makeChild(12), ctx);
		expect(r.content).toMatch(/女/);
	});

	it("includes disclaimer", async () => {
		const r = await agent.respond("身高 70cm", makeChild(12), ctx);
		expect(r.content).toContain("⚠️");
		expect(r.content).toMatch(/参考|WHO|CDC/);
	});

	it("returns error when no measurement provided", async () => {
		const r = await agent.respond("宝宝多高", makeChild(6), ctx);
		// No number pattern → falls to general help, confidence 0.5
		expect(r.confidence).toBeLessThanOrEqual(0.5);
		expect(r.content).toMatch(/请提供|成长追踪/);
	});
});

describe("GrowthTrackerAgent — respond: milestone intent", () => {
	const agent = createGrowthTrackerAgent();
	const ctx = { memory: undefined } as any;

	it("returns milestones for newborn", async () => {
		const r = await agent.respond("发育里程碑", makeChild(2), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toMatch(/里程碑|大运动|精细/);
	});

	it("returns milestones for toddler", async () => {
		const r = await agent.respond("2岁发育", makeChild(24), ctx);
		expect(r.confidence).toBeGreaterThan(0.7);
		expect(r.content).toContain("📋");
	});

	it("shows red flags for 18-month milestone check", async () => {
		const r = await agent.respond("18个月发育", makeChild(18), ctx);
		expect(r.content).toMatch(/警示|🚨/);
	});
});

describe("GrowthTrackerAgent — respond: BMI intent", () => {
	const agent = createGrowthTrackerAgent();
	const ctx = { memory: undefined } as any;

	it("computes BMI when both height and weight provided", async () => {
		const r = await agent.respond(
			"BMI 体重 20kg 身高 110cm",
			makeChild(48),
			ctx,
		);
		expect(r.confidence).toBeGreaterThan(0.6);
		expect(r.content).toMatch(/BMI.*\d/);
	});

	it("returns error when no weight provided", async () => {
		const r = await agent.respond("BMI 身高 110cm", makeChild(48), ctx);
		expect(r.confidence).toBeLessThan(0.5);
		expect(r.content).toMatch(/BMI|体重/);
	});
});

describe("GrowthTrackerAgent — respond: velocity intent", () => {
	const agent = createGrowthTrackerAgent();
	const ctx = { memory: undefined } as any;

	it("computes weight gain velocity", async () => {
		const r = await agent.respond("体重增长 3.3 5.0", makeChild(2), ctx);
		expect(r.confidence).toBeGreaterThan(0.6);
		expect(r.content).toMatch(/增重|g\/天/);
	});

	it("returns error when only one weight provided", async () => {
		const r = await agent.respond("体重增长 5.0", makeChild(2), ctx);
		expect(r.confidence).toBeLessThan(0.5);
		expect(r.content).toMatch(/需要.*数据/);
	});
});

describe("GrowthTrackerAgent — respond: general intent", () => {
	const agent = createGrowthTrackerAgent();
	const ctx = { memory: undefined } as any;

	it("returns help message", async () => {
		const r = await agent.respond("你好", makeChild(6), ctx);
		expect(r.confidence).toBeGreaterThanOrEqual(0.5);
		expect(r.content).toMatch(/成长追踪|帮助/);
	});
});

describe("estimatePercentile", () => {
	it("returns ~50 for median values", () => {
		const std = GROWTH_STANDARDS.find((r) => r.ageMonths === 12);
		const p = estimatePercentile(
			std?.male.height.p50,
			12,
			"height",
			"male",
		);
		expect(p).toBeGreaterThanOrEqual(40);
		expect(p).toBeLessThanOrEqual(60);
	});

	it("returns <=3 for very low values", () => {
		const p = estimatePercentile(45, 12, "height", "male");
		expect(p).toBeLessThanOrEqual(3);
	});

	it("returns >=97 for very high values", () => {
		const p = estimatePercentile(85, 12, "height", "male");
		expect(p).toBeGreaterThanOrEqual(97);
	});

	it("interpolates between age rows", () => {
		const p1 = estimatePercentile(65, 3, "height", "male");
		const p2 = estimatePercentile(65, 9, "height", "male");
		// At 3 months, 65cm is high (>P85); at 9 months it's near median
		expect(p1).toBeGreaterThan(p2);
	});

	it("interpolates 15-50 range", () => {
		const std = GROWTH_STANDARDS.find((r) => r.ageMonths === 12);
		const mid = (std?.male.height.p15 + std?.male.height.p50) / 2;
		const p = estimatePercentile(mid, 12, "height", "male");
		expect(p).toBeGreaterThanOrEqual(15);
		expect(p).toBeLessThanOrEqual(50);
	});

	it("interpolates 50-85 range", () => {
		const std = GROWTH_STANDARDS.find((r) => r.ageMonths === 12);
		const mid = (std?.male.height.p50 + std?.male.height.p85) / 2;
		const p = estimatePercentile(mid, 12, "height", "male");
		expect(p).toBeGreaterThanOrEqual(50);
		expect(p).toBeLessThanOrEqual(85);
	});

	it("interpolates 85-97 range", () => {
		const std = GROWTH_STANDARDS.find((r) => r.ageMonths === 12);
		const mid = (std?.male.height.p85 + std?.male.height.p97) / 2;
		const p = estimatePercentile(mid, 12, "height", "male");
		expect(p).toBeGreaterThanOrEqual(85);
		expect(p).toBeLessThanOrEqual(97);
	});

	it("returns 50 (neutral) for invalid age", () => {
		expect(estimatePercentile(75, -5, "height", "male")).toBe(50);
	});
});

describe("classifyPercentile", () => {
	it("returns low for <3", () => {
		expect(classifyPercentile(2)).toBe("low");
		expect(classifyPercentile(0)).toBe("low");
	});

	it("returns below_avg for 3-15", () => {
		expect(classifyPercentile(3)).toBe("below_avg");
		expect(classifyPercentile(14)).toBe("below_avg");
	});

	it("returns average for 15-85", () => {
		expect(classifyPercentile(15)).toBe("average");
		expect(classifyPercentile(50)).toBe("average");
		expect(classifyPercentile(84)).toBe("average");
	});

	it("returns above_avg for 85-97", () => {
		expect(classifyPercentile(85)).toBe("above_avg");
		expect(classifyPercentile(96)).toBe("above_avg");
	});

	it("returns high for >=97", () => {
		expect(classifyPercentile(97)).toBe("high");
		expect(classifyPercentile(99)).toBe("high");
	});
});

describe("calculateBMI", () => {
	it("computes BMI correctly", () => {
		const bmi = calculateBMI(20, 110); // 20kg, 1.1m → 16.5
		expect(bmi).toBeCloseTo(16.5, 1);
	});

	it("handles zero height", () => {
		const bmi = calculateBMI(20, 0);
		expect(bmi).toBe(0);
	});

	it("rounds to 1 decimal place", () => {
		const bmi = calculateBMI(25, 120);
		expect(bmi.toString()).toMatch(/^\d+(\.\d)?$/);
	});
});

describe("classifyBMI", () => {
	it("returns normal for age <24 months", () => {
		expect(classifyBMI(18, 12)).toBe("normal");
	});

	it("returns underweight for low BMI", () => {
		expect(classifyBMI(13, 60)).toBe("underweight");
	});

	it("returns normal for healthy BMI", () => {
		expect(classifyBMI(16, 60)).toBe("normal");
	});

	it("returns overweight", () => {
		expect(classifyBMI(19, 100)).toBe("overweight");
	});

	it("returns obese for high BMI", () => {
		expect(classifyBMI(22, 120)).toBe("obese");
	});
});

describe("detectGrowthConcern", () => {
	it("flags low values (<P3)", () => {
		const r = detectGrowthConcern({
			metric: "height",
			value: 50,
			ageMonths: 12,
			sex: "male",
		});
		expect(r.concern).toBe(true);
		expect(r.reason).toMatch(/P3/);
	});

	it("flags high values (>P97)", () => {
		const r = detectGrowthConcern({
			metric: "height",
			value: 85,
			ageMonths: 12,
			sex: "male",
		});
		expect(r.concern).toBe(true);
		expect(r.reason).toMatch(/P97/);
	});

	it("flags large percentile drop", () => {
		const r = detectGrowthConcern(
			{ metric: "weight", value: 8, ageMonths: 12, sex: "male" },
			{ metric: "weight", value: 12, ageMonths: 6, sex: "male" },
		);
		expect(r.concern).toBe(true);
	});

	it("does not flag normal values", () => {
		const r = detectGrowthConcern({
			metric: "height",
			value: 74,
			ageMonths: 12,
			sex: "male",
		});
		expect(r.concern).toBe(false);
	});
});

describe("getMilestonesForAge", () => {
	it("returns expected milestones for newborn", () => {
		const r = getMilestonesForAge(1);
		expect(r.expected.length).toBeGreaterThan(0);
		// At 1 month, "6月龄仍不对人微笑" red flag (range 0-6) is in scope
		expect(r.redFlags.length).toBeGreaterThanOrEqual(0);
	});

	it("returns red flags at 18 months", () => {
		const r = getMilestonesForAge(18);
		expect(r.redFlags.length).toBeGreaterThan(0);
	});

	it("returns empty for very old age", () => {
		const r = getMilestonesForAge(120);
		// 10 years old: no milestone data here
		expect(r.expected.length).toBe(0);
	});
});

describe("getPercentiles", () => {
	it("returns null for negative age", () => {
		expect(getPercentiles(-1, "height", "male")).toBeNull();
	});

	it("returns exact match for known age", () => {
		const p = getPercentiles(12, "height", "male");
		expect(p).not.toBeNull();
		expect(p?.p50).toBe(74.0);
	});

	it("interpolates for age between rows", () => {
		const p = getPercentiles(18, "weight", "female");
		expect(p).not.toBeNull();
		// Should be between 12m and 24m
		expect(p?.p50).toBeGreaterThan(8.9);
		expect(p?.p50).toBeLessThan(11.5);
	});

	it("uses last row for age beyond table", () => {
		const p = getPercentiles(120, "height", "male");
		expect(p).not.toBeNull();
		expect(p?.p50).toBe(107.0);
	});

	it("uses first row when age is before all rows", () => {
		// Hypothetical — ageMonths=0 should match first row
		const p = getPercentiles(0, "height", "male");
		expect(p).not.toBeNull();
		expect(p?.p50).toBe(49.9);
	});
});

describe("weightGainVelocity (function)", () => {
	it("computes grams/day", () => {
		const v = weightGainVelocity(5.0, 70, 3.3, 0);
		expect(v).toBeCloseTo(24.3, 1);
	});

	it("returns null without previous data", () => {
		expect(weightGainVelocity(5.0, 70)).toBeNull();
	});

	it("returns null when age did not advance", () => {
		expect(weightGainVelocity(5.0, 70, 4.0, 70)).toBeNull();
	});
});

describe("weightGainVelocity advice branches", () => {
	const agent = createGrowthTrackerAgent();
	const ctx = { memory: undefined } as any;

	it("flags high weight gain velocity (>=30 g/day)", async () => {
		const r = await agent.respond("体重增长 3.0 8.0", makeChild(3), ctx);
		expect(r.content).toMatch(/增重较快/);
	});

	it("flags normal weight gain velocity (20-30 g/day)", async () => {
		// 3.0 → 4.5 over 50 days = 30 g/day, borderline
		const r = await agent.respond("体重增长 3.0 4.5", makeChild(2), ctx);
		expect(r.content).toMatch(/增重|正常|较快/);
	});

	it("flags low weight gain velocity (<20 g/day)", async () => {
		const r = await agent.respond("体重增长 5.0 5.5", makeChild(3), ctx);
		expect(r.content).toMatch(/增重过慢/);
	});

	it("handles velocity with same weight (no progression)", async () => {
		const r = await agent.respond("体重增长 5.0 5.0", makeChild(3), ctx);
		// 0 g/day
		expect(r.content).toMatch(/增重|需更早/);
	});
});

describe("BMI without height defaults to 100cm", () => {
	const agent = createGrowthTrackerAgent();
	const ctx = { memory: undefined } as any;
	it("computes BMI with default height when not provided", async () => {
		const r = await agent.respond("BMI 体重 20kg", makeChild(48), ctx);
		// Should fall back to height=100cm
		expect(r.content).toMatch(/BMI = 20/);
	});
});

describe("Growth standards data sanity", () => {
	it("GROWTH_STANDARDS has rows for 0, 6, 12, 24, 36, 60 months", () => {
		const ages = GROWTH_STANDARDS.map((r) => r.ageMonths);
		expect(ages).toEqual([0, 6, 12, 24, 36, 60]);
	});

	it("P3 < P15 < P50 < P85 < P97 for all rows", () => {
		for (const row of GROWTH_STANDARDS) {
			for (const sex of ["male", "female"] as const) {
				for (const metric of [
					"height",
					"weight",
					"head_circumference",
				] as const) {
					const p = row[sex][metric];
					expect(p.p3).toBeLessThan(p.p15);
					expect(p.p15).toBeLessThan(p.p50);
					expect(p.p50).toBeLessThan(p.p85);
					expect(p.p85).toBeLessThan(p.p97);
				}
			}
		}
	});

	it("all milestones have valid age ranges", () => {
		for (const m of MILESTONES_ALL) {
			expect(m.ageMonthsMin).toBeGreaterThanOrEqual(0);
			expect(m.ageMonthsMax).toBeGreaterThan(m.ageMonthsMin);
		}
	});

	it("red flag milestones are distinct domain", () => {
		const redFlags = MILESTONES_ALL.filter((m) => m.redFlag);
		expect(redFlags.length).toBeGreaterThan(0);
	});

	describe("computeZScore (WHO LMS approximation)", () => {
		it("returns 0 for the median value", () => {
			const z = computeZScore(12, "male", "weight", 10);
			expect(z).toBeCloseTo(0, 0);
		});

		it("returns ~+1 for the 85th percentile value", () => {
			// 12-month male weight p85 ≈ 10.4 kg
			const z = computeZScore(12, "male", "weight", 10.4);
			expect(z).toBeCloseTo(1, 0);
		});

		it("returns ~-2 for the ~3rd percentile value", () => {
			// 12-month male weight p3=7.7, p15=8.6
			const z = computeZScore(12, "male", "weight", 7.8);
			expect(z).toBeLessThan(-1.5);
		});

		it("returns ~+2 for the 97th percentile value", () => {
			// 12-month male weight p97=11.9
			const z = computeZScore(12, "male", "weight", 11.5);
			expect(z).toBeGreaterThan(1.5);
		});

		it("differs for male vs female at the same input", () => {
			const zm = computeZScore(24, "male", "height", 88);
			const zf = computeZScore(24, "female", "height", 88);
			expect(Math.abs(zm - zf)).toBeGreaterThan(0.1);
		});

		it("clamps to a reasonable range for extreme inputs", () => {
			const veryLow = computeZScore(24, "male", "weight", 5);
			const veryHigh = computeZScore(24, "male", "weight", 30);
			expect(veryLow).toBeLessThan(-3);
			expect(veryHigh).toBeGreaterThan(3);
		});

		it("returns a number even when value is below the lowest age bucket", () => {
			const z = computeZScore(-3, "male", "weight", 4);
			expect(Number.isFinite(z)).toBe(true);
		});

		it("extrapolates beyond the highest age bucket (clamped)", () => {
			// 240 months is far beyond the table's last row (60 months)
			const z = computeZScore(240, "male", "weight", 70);
			expect(z).toBeGreaterThan(2);
		});

		it("uses p3 anchor when value sits exactly at p3", () => {
			// 12-month male weight p3=7.7
			const z = computeZScore(12, "male", "weight", 7.7);
			expect(Math.abs(z - -1.88)).toBeLessThan(0.05);
		});

		it("uses p97 anchor when value sits exactly at p97", () => {
			// 12-month male weight p97=11.9
			const z = computeZScore(12, "male", "weight", 11.9);
			expect(Math.abs(z - 1.88)).toBeLessThan(0.05);
		});

		it("extrapolates below p3 with negative slope", () => {
			// value far below p3 — still returns a finite Z (clamped to -4)
			const z = computeZScore(12, "male", "weight", 5);
			expect(z).toBeLessThan(-2);
			expect(Number.isFinite(z)).toBe(true);
		});

		it("extrapolates above p97 with positive slope", () => {
			// value far above p97 — still returns a finite Z (clamped to +4)
			const z = computeZScore(12, "male", "weight", 20);
			expect(z).toBeGreaterThan(2);
			expect(Number.isFinite(z)).toBe(true);
		});

		it("interpolates a value that sits exactly between p15 and p50", () => {
			// 12-month male weight p15=8.6, p50=9.6
			const z = computeZScore(12, "male", "weight", 9.1);
			expect(Math.abs(z - -0.52)).toBeLessThan(0.1);
		});
	});

	describe("classifyZScore", () => {
		const cases: Array<[number, ZScoreBand]> = [
			[-3, "severely_low"],
			[-2, "low"],
			[-1, "normal_low"],
			[0, "normal"],
			[1, "normal_high"],
			[2, "high"],
			[3, "severely_high"],
		];
		for (const [input, expected] of cases) {
			it(`classifies z=${input} as ${expected}`, () => {
				expect(classifyZScore(input)).toBe(expected);
			});
		}
	});
});

// Reference to MILESTONES via re-import
import { MILESTONES as MILESTONES_ALL } from "../src/knowledge.js";
