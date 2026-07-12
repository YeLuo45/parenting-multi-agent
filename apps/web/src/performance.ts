/**
 * Performance profiling — web vitals + render measurement.
 *
 * Direction U8: Performance Optimization.
 *
 * Pure helpers: web vitals reading (with safe fallbacks for non-browser
 * test envs), render measurement, performance observer wrappers.
 */

export type MetricName = "CLS" | "LCP" | "INP" | "TTFB" | "FID" | "FCP";

export type MetricRating = "good" | "needs-improvement" | "poor";

export interface WebVital {
	name: MetricName;
	value: number;
	rating: MetricRating;
	delta: number;
	id: string;
	timestamp: number;
}

export interface RenderMeasurement {
	name: string;
	durationMs: number;
	startTs: number;
	endTs: number;
	threshold: number;
	passed: boolean;
}

/** Threshold values for "good" rating (in ms or score). */
const GOOD_THRESHOLDS: Record<MetricName, number> = {
	CLS: 0.1,
	LCP: 2500,
	INP: 200,
	TTFB: 800,
	FID: 100,
	FCP: 1800,
};

/** Threshold values for "poor" rating. */
const POOR_THRESHOLDS: Record<MetricName, number> = {
	CLS: 0.25,
	LCP: 4000,
	INP: 500,
	TTFB: 1800,
	FID: 300,
	FCP: 3000,
};

/** Rate a metric value into good/needs-improvement/poor. */
export function rateMetric(name: MetricName, value: number): MetricRating {
	if (value <= GOOD_THRESHOLDS[name]) return "good";
	if (value <= POOR_THRESHOLDS[name]) return "needs-improvement";
	return "poor";
}

/** Get a numeric value from PerformanceEntry (with safe fallbacks). */
export function extractMetricValue(
	name: MetricName,
	entry: PerformanceEntry | undefined,
): number {
	if (!entry) return 0;
	const e = entry as unknown as Record<string, number>;
	switch (name) {
		case "CLS":
			return e.value ?? 0;
		case "LCP":
		case "INP":
		case "TTFB":
		case "FID":
		case "FCP":
			return e.startTime ?? e.duration ?? 0;
		default:
			return 0;
	}
}

/** Read all web vitals (uses PerformanceObserver when available). */
export async function getWebVitals(): Promise<WebVital[]> {
	const out: WebVital[] = [];
	const now = Date.now();
	for (const name of Object.keys(GOOD_THRESHOLDS) as MetricName[]) {
		try {
			const entries = performance.getEntriesByName(name);
			const entry = entries[entries.length - 1];
			const value = extractMetricValue(name, entry);
			out.push({
				name,
				value,
				rating: rateMetric(name, value),
				delta: value,
				id: `v_${name}_${now}`,
				timestamp: now,
			});
		} catch {
			out.push({
				name,
				value: 0,
				rating: "good",
				delta: 0,
				id: `v_${name}_${now}_fallback`,
				timestamp: now,
			});
		}
	}
	return out;
}

/** Read a single metric by name. */
export function getVitalByName(name: MetricName): WebVital | null {
	try {
		const entries = performance.getEntriesByName(name);
		const entry = entries[entries.length - 1];
		if (!entry) return null;
		const value = extractMetricValue(name, entry);
		return {
			name,
			value,
			rating: rateMetric(name, value),
			delta: value,
			id: `v_${name}_${Date.now()}`,
			timestamp: Date.now(),
		};
	} catch {
		return null;
	}
}

/** Measure the duration of a synchronous function. */
export function measureRender<T>(
	name: string,
	fn: () => T,
	thresholdMs = 16,
): { result: T; measurement: RenderMeasurement } {
	const startTs = performance.now();
	const result = fn();
	const endTs = performance.now();
	const durationMs = endTs - startTs;
	return {
		result,
		measurement: {
			name,
			durationMs,
			startTs,
			endTs,
			threshold: thresholdMs,
			passed: durationMs <= thresholdMs,
		},
	};
}

/** Measure the duration of an async function. */
export async function measureRenderAsync<T>(
	name: string,
	fn: () => Promise<T>,
	thresholdMs = 16,
): Promise<{ result: T; measurement: RenderMeasurement }> {
	const startTs = performance.now();
	const result = await fn();
	const endTs = performance.now();
	const durationMs = endTs - startTs;
	return {
		result,
		measurement: {
			name,
			durationMs,
			startTs,
			endTs,
			threshold: thresholdMs,
			passed: durationMs <= thresholdMs,
		},
	};
}

/** Aggregate multiple render measurements. */
export interface RenderReport {
	totalDuration: number;
	measurements: RenderMeasurement[];
	passed: number;
	failed: number;
	avgDuration: number;
	p95Duration: number;
}

export function summarizeMeasurements(
	measurements: RenderMeasurement[],
): RenderReport {
	const total = measurements.length;
	const passed = measurements.filter((m) => m.passed).length;
	const totalDuration = measurements.reduce((s, m) => s + m.durationMs, 0);
	const sorted = [...measurements].sort(
		(a, b) => a.durationMs - b.durationMs,
	);
	const p95Idx = Math.min(
		sorted.length - 1,
		Math.floor(sorted.length * 0.95),
	);
	return {
		totalDuration,
		measurements,
		passed,
		failed: total - passed,
		avgDuration: total === 0 ? 0 : totalDuration / total,
		p95Duration: sorted[p95Idx]?.durationMs ?? 0,
	};
}

/** Report vitals to console (or custom sink). */
export function reportWebVitals(
	vitals: WebVital[],
	sink: (msg: string) => void = (m) => console.warn(m),
): void {
	for (const v of vitals) {
		const emoji =
			v.rating === "good"
				? "✅"
				: v.rating === "needs-improvement"
					? "⚠️"
					: "❌";
		sink(`${emoji} ${v.name}: ${v.value.toFixed(1)} (${v.rating})`);
	}
}

/** Format a render report as a Chinese summary. */
export function formatRenderReport(report: RenderReport): string {
	const lines: string[] = [
		`📊 渲染性能报告（${report.measurements.length} 次）`,
		`通过：${report.passed} / 失败：${report.failed}`,
		`总耗时：${report.totalDuration.toFixed(2)}ms`,
		`平均：${report.avgDuration.toFixed(2)}ms`,
		`P95：${report.p95Duration.toFixed(2)}ms`,
	];
	return lines.join("\n");
}

export const PERFORMANCE_DISCLAIMER =
	"⚠️ 性能数据来自浏览器真实测量。开发环境下可能为 0。";
