/**
 * Symptom time-series analysis — pure functions so the logic is fully
 * unit-testable. Keep this file side-effect-free; persistence lives in
 * `memory.ts`.
 */

import type {
	FeverActionFlag,
	FeverDirection,
	FeverTrend,
	SymptomLog,
} from "./types.js";

export const FEVER_STABLE_THRESHOLD_C = 0.2;
export const FEVER_DURATION_SEE_DOCTOR_HOURS = 72;
export const FEVER_HIGH_THRESHOLD_C = 39.5;

/**
 * Classify a single delta into a directional trend.
 * Within ±FEVER_STABLE_THRESHOLD_C => "stable"; above => "rising";
 * below => "falling".
 */
export function classifyFeverDirection(delta: number): FeverDirection {
	if (Math.abs(delta) <= FEVER_STABLE_THRESHOLD_C) return "stable";
	return delta > 0 ? "rising" : "falling";
}

/**
 * Convert (delta + durationHours) into an escalation flag a UI can show.
 *   - delta > +0.5 over a 24h span AND max temp > FEVER_HIGH_THRESHOLD_C => "urgent"
 *   - delta > 0 (rising) over >= 72h => "see-doctor"
 *   - max temp > FEVER_HIGH_THRESHOLD_C at any single reading => "watch"
 *   - otherwise "none"
 */
export function classifyFeverAction(
	maxTemp: number,
	delta: number,
	durationHours: number,
): FeverActionFlag {
	if (maxTemp >= FEVER_HIGH_THRESHOLD_C + 0.5 && delta > 0.5) return "urgent";
	if (maxTemp > FEVER_HIGH_THRESHOLD_C) return "watch";
	if (durationHours >= FEVER_DURATION_SEE_DOCTOR_HOURS && delta > 0)
		return "see-doctor";
	return "none";
}

/**
 * Compute the trend across a list of fever readings. Readings should be
 * pre-filtered by `MemoryLayer.recentFeverBy()`. The readings are NOT
 * assumed sorted; this function sorts them by createdAt ascending.
 */
export function computeFeverTrend(readings: SymptomLog[]): FeverTrend {
	if (readings.length === 0) {
		return {
			count: 0,
			min: 0,
			max: 0,
			avg: 0,
			delta: 0,
			direction: "unknown",
			durationHours: 0,
			actionFlag: "none",
		};
	}
	const sorted = [...readings].sort((a, b) =>
		a.createdAt.localeCompare(b.createdAt),
	);
	const values = sorted.map((r) => r.value);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const sum = values.reduce((acc, v) => acc + v, 0);
	const avg = sum / values.length;
	const delta = sorted[sorted.length - 1]!.value - sorted[0]!.value;
	const direction = classifyFeverDirection(delta);
	const first = new Date(sorted[0]!.createdAt).getTime();
	const last = new Date(sorted[sorted.length - 1]!.createdAt).getTime();
	const durationHours = Math.max(0, (last - first) / (1000 * 60 * 60));
	const actionFlag = classifyFeverAction(max, delta, durationHours);
	return {
		count: sorted.length,
		min,
		max,
		avg,
		delta,
		direction,
		durationHours,
		actionFlag,
	};
}

/**
 * Format a FeverTrend as a single human-readable sentence. Used in the
 * pediatrician agent's reply text and the workbench symptom tracker.
 */
export function formatFeverTrendLine(trend: FeverTrend): string {
	const sign = trend.delta > 0 ? "+" : "";
	if (trend.direction === "unknown") return "尚未记录到体温数据";
	return `过去 ${trend.count} 次测量,最高 ${trend.max.toFixed(1)}°C / 最低 ${trend.min.toFixed(1)}°C,趋势${trend.direction === "rising" ? "上升" : trend.direction === "falling" ? "下降" : "稳定"} (${sign}${trend.delta.toFixed(1)}°C)`;
}
