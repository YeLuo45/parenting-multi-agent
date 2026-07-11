import { describe, expect, it } from "vitest";
import {
	anonymizeProfile,
	buildPeerCohort,
	compareToCohort,
	computePercentile,
	createPeerBenchmarkAgent,
	filterByAgeWindow,
	filterBySex,
	formatAnonymizedProfile,
	generateSyntheticCohort,
	K_ANONYMITY_MINIMUM,
	type PeerMeasurement,
} from "../src/index.js";

function makeCohort(
	ageMonths: number,
	sex: "male" | "female",
	values: number[],
): PeerMeasurement[] {
	return values.map((v) => ({ ageMonths, value: v, sex }));
}

describe("filterByAgeWindow", () => {
	it("filters by ±window", () => {
		const data: PeerMeasurement[] = [
			{ ageMonths: 10, value: 75, sex: "male" },
			{ ageMonths: 13, value: 78, sex: "male" },
			{ ageMonths: 20, value: 85, sex: "male" },
		];
		const r = filterByAgeWindow(data, 12, 3);
		expect(r).toHaveLength(2);
	});

	it("returns empty for out-of-range data", () => {
		const r = filterByAgeWindow(
			[{ ageMonths: 50, value: 1, sex: "male" }],
			12,
			3,
		);
		expect(r).toEqual([]);
	});
});

describe("filterBySex", () => {
	it("filters by sex", () => {
		const data: PeerMeasurement[] = [
			{ ageMonths: 12, value: 75, sex: "male" },
			{ ageMonths: 12, value: 73, sex: "female" },
			{ ageMonths: 12, value: 76, sex: "male" },
		];
		const r = filterBySex(data, "male");
		expect(r).toHaveLength(2);
	});

	it("returns empty for no matches", () => {
		const r = filterBySex(
			[{ ageMonths: 12, value: 1, sex: "female" }],
			"male",
		);
		expect(r).toEqual([]);
	});
});

describe("buildPeerCohort", () => {
	it("builds cohort with k-anonymity honored", () => {
		const cohort = makeCohort(
			24,
			"male",
			[80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90],
		);
		const r = buildPeerCohort(cohort, "height", 24, "male");
		expect(r.count).toBe(11);
		expect(r.metric).toBe("height");
	});

	it("throws on empty cohort", () => {
		expect(() => buildPeerCohort([], "height", 24, "male")).toThrow(
			/empty/,
		);
	});

	it("throws on cohort smaller than k-anonymity", () => {
		const cohort = makeCohort(24, "male", [80, 81, 82, 83]);
		expect(() => buildPeerCohort(cohort, "height", 24, "male")).toThrow(
			/k-anonymity/,
		);
	});

	it("filters by age and sex", () => {
		const data: PeerMeasurement[] = [
			...makeCohort(24, "male", Array(10).fill(80)),
			...makeCohort(24, "female", Array(10).fill(78)),
			...makeCohort(30, "male", Array(10).fill(85)),
		];
		const r = buildPeerCohort(data, "height", 24, "male");
		expect(r.count).toBe(10);
		expect(r.sex).toBe("male");
	});

	it("computes correct percentiles for known data", () => {
		const values = Array.from({ length: 101 }, (_, i) => i + 1); // 1..101
		const cohort = makeCohort(24, "male", values);
		const r = buildPeerCohort(cohort, "height", 24, "male");
		expect(r.p5).toBeCloseTo(6, 0);
		expect(r.p50).toBeCloseTo(51, 0);
		expect(r.p95).toBeCloseTo(96, 0);
	});

	it("handles single-value cohort (degenerate but valid)", () => {
		const cohort = makeCohort(24, "male", [80, 80, 80, 80, 80, 80, 80]);
		const r = buildPeerCohort(cohort, "height", 24, "male");
		expect(r.median).toBe(80);
	});

	it("single-value n=1 returns the value at all percentiles", () => {
		// Build a cohort with only one age-matching entry (others filtered out by sex)
		const single: PeerMeasurement[] = [
			{ ageMonths: 24, value: 80, sex: "male" },
		];
		// Need 5+ for k-anonymity; add 4 more at different ages
		const cohort: PeerMeasurement[] = [
			...single,
			...Array.from({ length: 4 }, () => ({
				ageMonths: 5,
				value: 60,
				sex: "male" as const,
			})),
		];
		// Filter to age window ±3 around 24 → only the single entry matches
		const filtered = filterByAgeWindow(cohort, 24, 3);
		expect(filtered).toHaveLength(1);
		// Now buildPeerCohort will throw (n=1 < 5)
		// To test the n=1 path we need a custom test that bypasses k-anonymity
		// — the function is internal. Verify percentile function handles n=1.
		const pct = computePercentile(filtered, 80, 24, "male");
		expect(pct).toBe(50);
	});

	it("handles n=1 in percentile function (no division by zero)", () => {
		const cohort = makeCohort(24, "male", [80]);
		const r = computePercentile(cohort, 80, 24, "male");
		// 0 below + 0.5 equal / 1 * 100 = 50
		expect(r).toBe(50);
	});

	it("generateSyntheticCohort guards against u1=0 in Box-Muller", () => {
		// Just ensure the generator never returns NaN/negative values
		const r = generateSyntheticCohort(24, "male", 100, "height");
		for (const m of r) {
			expect(Number.isFinite(m.value)).toBe(true);
			expect(m.value).toBeGreaterThan(0);
		}
	});
});

describe("computePercentile", () => {
	it("returns mid-rank percentile for value at median", () => {
		const cohort = makeCohort(24, "male", [70, 75, 80, 85, 90, 95, 100]);
		const r = computePercentile(cohort, 80, 24, "male");
		// 2 below + 0.5 equal (1) / 7 * 100 = ~36
		expect(r).toBeGreaterThanOrEqual(30);
		expect(r).toBeLessThanOrEqual(45);
	});

	it("returns high percentile for value above range", () => {
		const cohort = makeCohort(24, "male", [70, 75, 80, 85, 90, 95, 100]);
		const r = computePercentile(cohort, 200, 24, "male");
		expect(r).toBeGreaterThanOrEqual(90);
	});

	it("returns low percentile for value below range", () => {
		const cohort = makeCohort(24, "male", [70, 75, 80, 85, 90, 95, 100]);
		const r = computePercentile(cohort, 0, 24, "male");
		expect(r).toBeLessThanOrEqual(10);
	});

	it("returns 50 for empty cohort", () => {
		expect(computePercentile([], 80, 24, "male")).toBe(50);
	});
});

describe("compareToCohort", () => {
	it("returns 'above' for value above median", () => {
		const stats = buildPeerCohort(
			makeCohort(
				24,
				"male",
				Array.from({ length: 10 }, (_, i) => 70 + i),
			),
			"height",
			24,
			"male",
		);
		expect(compareToCohort(stats, 100)).toBe("above");
	});

	it("returns 'below' for value below median", () => {
		const stats = buildPeerCohort(
			makeCohort(
				24,
				"male",
				Array.from({ length: 10 }, (_, i) => 70 + i),
			),
			"height",
			24,
			"male",
		);
		expect(compareToCohort(stats, 50)).toBe("below");
	});

	it("returns 'at' for value near median (within tolerance)", () => {
		const stats = buildPeerCohort(
			makeCohort(
				24,
				"male",
				Array.from({ length: 100 }, (_, i) => 70 + i),
			),
			"height",
			24,
			"male",
		);
		// Median is 119.5; tolerance = (p75-p25)*0.1
		expect(compareToCohort(stats, 119.5)).toBe("at");
	});

	it("returns 'at' when p25==p75 (zero tolerance fallback)", () => {
		const stats = buildPeerCohort(
			makeCohort(24, "male", [80, 80, 80, 80, 80, 80, 80, 80, 80, 80]),
			"height",
			24,
			"male",
		);
		expect(compareToCohort(stats, 81)).toBe("above");
		expect(compareToCohort(stats, 79)).toBe("below");
		expect(compareToCohort(stats, 80.05)).toBe("at");
	});
});

describe("anonymizeProfile", () => {
	it("returns full anonymized profile", () => {
		const cohort = makeCohort(
			24,
			"male",
			Array.from({ length: 10 }, (_, i) => 70 + i),
		);
		const r = anonymizeProfile(cohort, "height", 85, 24, "male");
		expect(r.metric).toBe("height");
		expect(r.value).toBe(85);
		expect(r.percentile).toBeGreaterThan(50);
		expect(r.cohort.count).toBe(10);
	});

	it("comparison is 'above' for high value", () => {
		const cohort = makeCohort(
			24,
			"male",
			Array.from({ length: 10 }, (_, i) => 70 + i),
		);
		const r = anonymizeProfile(cohort, "height", 200, 24, "male");
		expect(r.comparison).toBe("above");
	});
});

describe("formatAnonymizedProfile", () => {
	it("renders all sections", () => {
		const cohort = makeCohort(
			24,
			"male",
			Array.from({ length: 10 }, (_, i) => 70 + i),
		);
		const r = anonymizeProfile(cohort, "height", 85, 24, "male");
		const out = formatAnonymizedProfile(r);
		expect(out).toContain("同侪对比");
		expect(out).toContain("k-anonymity");
		expect(out).toContain("中位");
	});

	it("includes ⚠️ privacy notice", () => {
		const cohort = makeCohort(
			24,
			"male",
			Array.from({ length: 10 }, (_, i) => 70 + i),
		);
		const r = anonymizeProfile(cohort, "height", 85, 24, "male");
		const out = formatAnonymizedProfile(r);
		expect(out).toContain("⚠️");
	});
});

describe("generateSyntheticCohort", () => {
	it("returns requested count", () => {
		const r = generateSyntheticCohort(24, "male", 30, "height");
		expect(r).toHaveLength(30);
	});

	it("spreads ages around the requested month", () => {
		const r = generateSyntheticCohort(24, "male", 50, "height");
		const ages = r.map((m) => m.ageMonths);
		expect(Math.min(...ages)).toBeLessThanOrEqual(24);
		expect(Math.max(...ages)).toBeGreaterThanOrEqual(24);
	});

	it("all values are positive", () => {
		const r = generateSyntheticCohort(24, "male", 50, "weight");
		for (const m of r) {
			expect(m.value).toBeGreaterThan(0);
		}
	});

	it("uses given sex", () => {
		const r = generateSyntheticCohort(24, "female", 20, "height");
		for (const m of r) {
			expect(m.sex).toBe("female");
		}
	});
});

describe("K_ANONYMITY_MINIMUM constant", () => {
	it("is 5 (industry standard)", () => {
		expect(K_ANONYMITY_MINIMUM).toBe(5);
	});
});

describe("PeerBenchmarkAgent", () => {
	const agent = createPeerBenchmarkAgent();
	const ctx = {
		memory: null as unknown as import("@parenting/memory").MemoryLayer,
	};

	it("responds to height query", async () => {
		const r = await agent.respond(
			"我家孩子8个月体重9.5kg，跟同龄比怎么样？",
			{
				id: "c",
				name: "Kid",
				birthDate: new Date(
					Date.now() - 9 * 30.44 * 24 * 60 * 60 * 1000,
				)
					.toISOString()
					.split("T")[0]!,
				stage: "toddler",
			},
			ctx,
		);
		expect(r.content).toContain("同侪对比");
	});

	it("responds to weight query", async () => {
		const r = await agent.respond(
			"3岁男宝宝身高95cm，跟同龄比怎么样？",
			{
				id: "c",
				name: "Kid",
				birthDate: new Date(
					Date.now() - 36 * 30.44 * 24 * 60 * 60 * 1000,
				)
					.toISOString()
					.split("T")[0]!,
				stage: "preschool",
			},
			ctx,
		);
		expect(r.content).toContain("同侪对比");
	});

	it("responds to head circumference query", async () => {
		const r = await agent.respond(
			"6个月宝宝头围43cm",
			{
				id: "c",
				name: "Kid",
				birthDate: new Date(
					Date.now() - 6 * 30.44 * 24 * 60 * 60 * 1000,
				)
					.toISOString()
					.split("T")[0]!,
				stage: "infant",
			},
			ctx,
		);
		expect(r.content).toContain("同侪对比");
	});

	it("returns intro for query without metric+value", async () => {
		const r = await agent.respond(
			"我家孩子发育怎么样",
			{
				id: "c",
				name: "Kid",
				birthDate: "2024-01-01",
				stage: "toddler",
			},
			ctx,
		);
		expect(r.content).toContain("请提供");
	});

	it("detects female sex from query", async () => {
		const r = await agent.respond(
			"女孩8个月体重8kg，跟同龄比？",
			{
				id: "c",
				name: "Kid",
				birthDate: new Date(
					Date.now() - 9 * 30.44 * 24 * 60 * 60 * 1000,
				)
					.toISOString()
					.split("T")[0]!,
				stage: "toddler",
			},
			ctx,
		);
		expect(r.content).toContain("女");
	});

	it("tween stage without explicit sex defaults to male", async () => {
		const r = await agent.respond(
			"孩子10岁身高140cm",
			{
				id: "c",
				name: "Kid",
				birthDate: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0]!,
				stage: "tween",
			},
			ctx,
		);
		expect(r.content).toContain("同侪对比");
	});

	it("teen stage without explicit sex defaults to male", async () => {
		const r = await agent.respond(
			"孩子15岁身高170cm",
			{
				id: "c",
				name: "Kid",
				birthDate: new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0]!,
				stage: "teen",
			},
			ctx,
		);
		expect(r.content).toContain("同侪对比");
	});
});
