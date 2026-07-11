/**
 * Growth chart visualization — ASCII plot of percentile trajectory over time.
 *
 * Direction O: Growth Chart Visualization.
 *
 * Pure functions that compute percentile paths from a series of measurements
 * and render them as ASCII charts suitable for CLI/TUI display. No deps.
 */

export interface GrowthMeasurement {
	ageMonths: number;
	value: number;
}

export interface GrowthChartPoint {
	ageMonths: number;
	value: number;
	percentile: number;
}

export interface GrowthChartOptions {
	width: number; // chars per row
	height: number; // rows of plot area
	metric: "height" | "weight" | "head_circumference";
	sex: "male" | "female";
}

export interface GrowthChartSeries {
	options: GrowthChartOptions;
	points: GrowthChartPoint[];
	ascii: string;
}

/** Compute percentile for a measurement using simple z-score method. */
export function computePercentileForChart(
	value: number,
	ageMonths: number,
	metric: "height" | "weight" | "head_circumference",
	sex: "male" | "female",
): number {
	// Simplified: P50 baseline varies by age + sex. This is a visualization
	// helper, not clinical.
	const baseBySex: Record<string, Record<string, number>> = {
		male: {
			height: 50 + ageMonths * 0.98,
			weight: 3.6 + ageMonths * 0.27,
			head_circumference: 35.5 + ageMonths * 0.34,
		},
		female: {
			height: 49.5 + ageMonths * 0.93,
			weight: 3.4 + ageMonths * 0.24,
			head_circumference: 34.8 + ageMonths * 0.33,
		},
	};
	const base = baseBySex[sex][metric];
	const sd = base * 0.12;
	const z = (value - base) / sd;
	const percentile = 50 + 50 * Math.tanh(z * 0.8);
	return Math.max(1, Math.min(99, Math.round(percentile)));
}

/** Compute percentile trajectory from measurements. */
export function computeChartPoints(
	measurements: readonly GrowthMeasurement[],
	metric: "height" | "weight" | "head_circumference",
	sex: "male" | "female",
): GrowthChartPoint[] {
	return [...measurements]
		.sort((a, b) => a.ageMonths - b.ageMonths)
		.map((m) => ({
			ageMonths: m.ageMonths,
			value: m.value,
			percentile: computePercentileForChart(
				m.value,
				m.ageMonths,
				metric,
				sex,
			),
		}));
}

/** Render an ASCII growth chart. */
export function renderGrowthChart(
	measurements: readonly GrowthMeasurement[],
	options: GrowthChartOptions,
): GrowthChartSeries {
	const points = computeChartPoints(
		measurements,
		options.metric,
		options.sex,
	);
	const w = Math.max(8, options.width);
	const h = Math.max(3, options.height);

	if (points.length === 0) {
		return {
			options,
			points,
			ascii: "(暂无数据)",
		};
	}

	const minAge = points[0]!.ageMonths;
	const maxAge = points[points.length - 1]!.ageMonths;
	const ageRange = Math.max(1, maxAge - minAge);

	// Bucket points by x-position
	const grid: number[][] = Array.from({ length: h }, () =>
		new Array<number>(w).fill(-1),
	);
	for (const p of points) {
		const xRatio = (p.ageMonths - minAge) / ageRange;
		const x = Math.min(w - 1, Math.round(xRatio * (w - 1)));
		const yRatio = p.percentile / 100;
		const y = Math.min(h - 1, Math.round((1 - yRatio) * (h - 1)));
		if (grid[y]![x] === -1) {
			grid[y]![x] = p.percentile;
		}
	}

	const lines: string[] = [];
	lines.push(`${options.metric} (${options.sex}) — ${points.length} points`);
	lines.push("100 " + "─".repeat(w));
	for (let y = 0; y < h; y++) {
		const yPct = Math.round(100 - (y / (h - 1)) * 100);
		const row = grid[y]!.map((v) => (v === -1 ? "·" : "●")).join("");
		lines.push(`${paddedLeft(yPct)} │${row}`);
	}
	lines.push("   0 " + "─".repeat(w));
	lines.push(
		`   ${paddedLeft(minAge)}${" ".repeat(Math.max(1, w - 8))}${paddedLeft(maxAge)} (months)`,
	);
	return { options, points, ascii: lines.join("\n") };
}

function paddedLeft(n: number): string {
	const s = String(n);
	return s.length >= 4 ? s : " ".repeat(4 - s.length) + s;
}

/** Detect a concerning percentile jump (≥ 2 percentile bands in 6 months). */
export function detectPercentileShift(
	points: readonly GrowthChartPoint[],
	windowMonths = 6,
	bandShift = 15,
): { shifted: boolean; magnitude: number } {
	if (points.length < 2) return { shifted: false, magnitude: 0 };
	let maxShift = 0;
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1]!;
		const curr = points[i]!;
		if (curr.ageMonths - prev.ageMonths > windowMonths) continue;
		const shift = Math.abs(curr.percentile - prev.percentile);
		maxShift = Math.max(maxShift, shift);
	}
	return {
		shifted: maxShift >= bandShift,
		magnitude: maxShift,
	};
}

/** Trend direction across the latest 3 measurements. */
export function trendDirection(
	points: readonly GrowthChartPoint[],
): "rising" | "falling" | "flat" | "insufficient" {
	if (points.length < 3) return "insufficient";
	const last = points[points.length - 1]!.percentile;
	const prev = points[points.length - 3]!.percentile;
	const diff = last - prev;
	if (Math.abs(diff) < 3) return "flat";
	return diff > 0 ? "rising" : "falling";
}
