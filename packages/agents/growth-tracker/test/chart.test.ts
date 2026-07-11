import { describe, expect, it } from "vitest";
import {
	computeChartPoints,
	computePercentileForChart,
	detectPercentileShift,
	renderGrowthChart,
	trendDirection,
} from "../src/index.js";

describe("computePercentileForChart", () => {
	it("returns percentile in [1, 99] range", () => {
		const p = computePercentileForChart(75, 24, "height", "male");
		expect(p).toBeGreaterThanOrEqual(1);
		expect(p).toBeLessThanOrEqual(99);
	});

	it("higher value → higher percentile", () => {
		const low = computePercentileForChart(60, 24, "height", "male");
		const high = computePercentileForChart(90, 24, "height", "male");
		expect(high).toBeGreaterThan(low);
	});

	it("handles all metrics", () => {
		for (const m of ["height", "weight", "head_circumference"] as const) {
			const p = computePercentileForChart(50, 12, m, "female");
			expect(p).toBeGreaterThan(0);
		}
	});

	it("handles both sexes", () => {
		const m = computePercentileForChart(50, 12, "height", "male");
		const f = computePercentileForChart(50, 12, "height", "female");
		expect(m).not.toBe(f);
	});
});

describe("computeChartPoints", () => {
	it("sorts by ageMonths ascending", () => {
		const points = computeChartPoints(
			[
				{ ageMonths: 24, value: 85 },
				{ ageMonths: 6, value: 65 },
				{ ageMonths: 12, value: 75 },
			],
			"height",
			"male",
		);
		expect(points.map((p) => p.ageMonths)).toEqual([6, 12, 24]);
	});

	it("assigns percentile to each point", () => {
		const points = computeChartPoints(
			[
				{ ageMonths: 6, value: 65 },
				{ ageMonths: 12, value: 75 },
			],
			"height",
			"male",
		);
		for (const p of points) {
			expect(p.percentile).toBeGreaterThanOrEqual(1);
			expect(p.percentile).toBeLessThanOrEqual(99);
		}
	});

	it("handles empty input", () => {
		expect(computeChartPoints([], "height", "male")).toEqual([]);
	});
});

describe("renderGrowthChart", () => {
	const measurements = [
		{ ageMonths: 6, value: 65 },
		{ ageMonths: 12, value: 75 },
		{ ageMonths: 24, value: 85 },
	];

	it("renders ASCII with header", () => {
		const chart = renderGrowthChart(measurements, {
			width: 30,
			height: 10,
			metric: "height",
			sex: "male",
		});
		expect(chart.ascii).toContain("height");
		expect(chart.ascii).toContain("male");
	});

	it("uses requested dimensions", () => {
		const chart = renderGrowthChart(measurements, {
			width: 20,
			height: 5,
			metric: "height",
			sex: "male",
		});
		const lines = chart.ascii.split("\n");
		expect(lines.length).toBeGreaterThan(5);
	});

	it("returns placeholder for empty measurements", () => {
		const chart = renderGrowthChart([], {
			width: 30,
			height: 10,
			metric: "height",
			sex: "male",
		});
		expect(chart.ascii).toContain("暂无");
		expect(chart.points).toEqual([]);
	});

	it("respects minimum dimensions", () => {
		const chart = renderGrowthChart(measurements, {
			width: 0,
			height: 0,
			metric: "weight",
			sex: "female",
		});
		expect(chart.ascii.length).toBeGreaterThan(0);
	});

	it("pads large age labels correctly", () => {
		// ages 1200 and 2400 produce 4+ char strings; padding branch must hit
		const wide = [
			{ ageMonths: 1200, value: 1300 },
			{ ageMonths: 2400, value: 2000 },
		];
		const chart = renderGrowthChart(wide, {
			width: 40,
			height: 10,
			metric: "height",
			sex: "male",
		});
		expect(chart.ascii).toContain("1200");
		expect(chart.ascii).toContain("2400");
	});

	it("includes start and end age labels", () => {
		const chart = renderGrowthChart(measurements, {
			width: 40,
			height: 10,
			metric: "height",
			sex: "male",
		});
		expect(chart.ascii).toContain("6");
		expect(chart.ascii).toContain("24");
	});

	it("returns points array alongside ASCII", () => {
		const chart = renderGrowthChart(measurements, {
			width: 30,
			height: 10,
			metric: "height",
			sex: "male",
		});
		expect(chart.points).toHaveLength(3);
	});
});

describe("detectPercentileShift", () => {
	it("returns false for insufficient data", () => {
		expect(detectPercentileShift([]).shifted).toBe(false);
		expect(
			detectPercentileShift([{ ageMonths: 0, value: 0, percentile: 50 }])
				.shifted,
		).toBe(false);
	});

	it("returns false for stable percentile", () => {
		const r = detectPercentileShift([
			{ ageMonths: 6, value: 65, percentile: 50 },
			{ ageMonths: 12, value: 75, percentile: 51 },
			{ ageMonths: 18, value: 80, percentile: 52 },
		]);
		expect(r.shifted).toBe(false);
		expect(r.magnitude).toBeLessThan(15);
	});

	it("returns true for major percentile jump within window", () => {
		const r = detectPercentileShift([
			{ ageMonths: 6, value: 65, percentile: 30 },
			{ ageMonths: 12, value: 95, percentile: 90 },
		]);
		expect(r.shifted).toBe(true);
		expect(r.magnitude).toBeGreaterThanOrEqual(15);
	});

	it("ignores points outside the window", () => {
		const r = detectPercentileShift([
			{ ageMonths: 6, value: 65, percentile: 30 },
			{ ageMonths: 36, value: 95, percentile: 90 }, // gap > 6mo
		]);
		expect(r.shifted).toBe(false);
	});
});

describe("trendDirection", () => {
	it("rising: latest - prev >= 3", () => {
		const dir = trendDirection([
			{ ageMonths: 6, value: 65, percentile: 30 },
			{ ageMonths: 12, value: 75, percentile: 50 },
			{ ageMonths: 18, value: 85, percentile: 70 },
		]);
		expect(dir).toBe("rising");
	});

	it("falling: latest - prev <= -3", () => {
		const dir = trendDirection([
			{ ageMonths: 6, value: 85, percentile: 80 },
			{ ageMonths: 12, value: 75, percentile: 50 },
			{ ageMonths: 18, value: 65, percentile: 20 },
		]);
		expect(dir).toBe("falling");
	});

	it("flat: diff within ±3", () => {
		const dir = trendDirection([
			{ ageMonths: 6, value: 75, percentile: 50 },
			{ ageMonths: 12, value: 76, percentile: 51 },
			{ ageMonths: 18, value: 74, percentile: 49 },
		]);
		expect(dir).toBe("flat");
	});

	it("insufficient: < 3 points", () => {
		expect(trendDirection([])).toBe("insufficient");
		expect(
			trendDirection([{ ageMonths: 6, value: 65, percentile: 50 }]),
		).toBe("insufficient");
	});
});
