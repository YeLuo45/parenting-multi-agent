/**
 * Family Streak — consecutive check-in tracking per habit.
 *
 * Direction H: Family Streak + dashboard.
 */

import type { Habit } from "./knowledge.js";

export type StreakLevel = "new" | "building" | "established" | "automatic";

export interface HabitCheckIn {
	id: string;
	habitId: string;
	childId: string;
	ts: number;
}

export interface HabitStreakState {
	habitId: string;
	childId: string;
	currentStreak: number;
	bestStreak: number;
	lastCheckInTs: number | null;
	checkIns: HabitCheckIn[];
}

export interface StreakBadge {
	level: StreakLevel;
	label: string;
	labelEn: string;
	emoji: string;
}

const STREAK_BADGES: Record<StreakLevel, StreakBadge> = {
	new: { level: "new", label: "新手", labelEn: "New", emoji: "🌱" },
	building: {
		level: "building",
		label: "养成中",
		labelEn: "Building",
		emoji: "🌿",
	},
	established: {
		level: "established",
		label: "已稳定",
		labelEn: "Established",
		emoji: "🌳",
	},
	automatic: {
		level: "automatic",
		label: "自动化",
		labelEn: "Automatic",
		emoji: "🌟",
	},
};

export const STREAK_GAP_TOLERANCE_HOURS = 36; // allow 1 missed day

export function getStreakBadge(level: StreakLevel): StreakBadge {
	return STREAK_BADGES[level];
}

/**
 * Build initial empty streak state.
 */
export function emptyStreakState(
	habitId: string,
	childId: string,
): HabitStreakState {
	return {
		habitId,
		childId,
		currentStreak: 0,
		bestStreak: 0,
		lastCheckInTs: null,
		checkIns: [],
	};
}

/**
 * Recompute current/best streaks from check-in history.
 * - Sorts by ts ascending
 * - Walks consecutive days; gap > 36h resets current streak
 * - bestStreak = max consecutive run length seen
 */
export function recomputeStreak(
	checkIns: readonly HabitCheckIn[],
	now: number = Date.now(),
): { currentStreak: number; bestStreak: number; lastCheckInTs: number | null } {
	if (checkIns.length === 0) {
		return { currentStreak: 0, bestStreak: 0, lastCheckInTs: null };
	}
	const sorted = [...checkIns].sort((a, b) => a.ts - b.ts);
	const HOUR = 1000 * 60 * 60;
	const GAP = STREAK_GAP_TOLERANCE_HOURS * HOUR;
	const DAY = 24 * HOUR;

	let best = 1;
	let run = 1;
	let lastDayBucket = Math.floor(sorted[0]!.ts / DAY);
	for (let i = 1; i < sorted.length; i++) {
		const t = sorted[i]!.ts;
		const dayBucket = Math.floor(t / DAY);
		const diff = t - sorted[i - 1]!.ts;
		if (diff <= GAP && dayBucket - lastDayBucket <= 2) {
			run += 1;
		} else {
			best = Math.max(best, run);
			run = 1;
		}
		lastDayBucket = dayBucket;
	}
	best = Math.max(best, run);

	// currentStreak: only counts if last check-in is within tolerance of now
	const lastTs = sorted[sorted.length - 1]!.ts;
	const lastGap = now - lastTs;
	const current = lastGap <= GAP ? run : 0;

	return { currentStreak: current, bestStreak: best, lastCheckInTs: lastTs };
}

/**
 * Record a new check-in: append + recompute streaks.
 * Returns a new state object (no mutation).
 */
export function recordCheckIn(
	state: HabitStreakState,
	ts: number = Date.now(),
): HabitStreakState {
	const newCheckIn: HabitCheckIn = {
		id: `c_${ts}_${Math.floor(Math.random() * 1e6)}`,
		habitId: state.habitId,
		childId: state.childId,
		ts,
	};
	const next: HabitCheckIn[] = [...state.checkIns, newCheckIn];
	const { currentStreak, bestStreak, lastCheckInTs } = recomputeStreak(
		next,
		ts,
	);
	const nextBest = Math.max(state.bestStreak, bestStreak);
	return {
		...state,
		checkIns: next,
		currentStreak,
		bestStreak: nextBest,
		lastCheckInTs,
	};
}

/**
 * Map streak days to level.
 */
export function streakLevelFromDays(days: number): StreakLevel {
	if (days < 7) return "new";
	if (days < 30) return "building";
	if (days < 90) return "established";
	return "automatic";
}

/**
 * Format a streak state as a Chinese badge line.
 */
export function formatStreakBadge(state: HabitStreakState): string {
	const level = streakLevelFromDays(state.currentStreak);
	const badge = getStreakBadge(level);
	const last = state.lastCheckInTs
		? new Date(state.lastCheckInTs).toISOString().split("T")[0]
		: "—";
	return `${badge.emoji} ${badge.label} · 当前 ${state.currentStreak} 天 · 最佳 ${state.bestStreak} 天 · 上次 ${last}`;
}

/**
 * Build a leaderboard of habits ranked by bestStreak (descending).
 */
export function getStreakLeaderboard(
	states: readonly HabitStreakState[],
): HabitStreakState[] {
	return [...states].sort((a, b) => b.bestStreak - a.bestStreak);
}

/**
 * Suggest a habit for the next check-in based on last activity (longest gap).
 */
export function suggestNextCheckIn(
	states: readonly HabitStreakState[],
	now: number = Date.now(),
): HabitStreakState | null {
	const HOUR = 1000 * 60 * 60;
	let best: HabitStreakState | null = null;
	let bestGap = -Infinity;
	for (const s of states) {
		const ts = s.lastCheckInTs ?? 0;
		const gap = now - ts;
		if (gap > bestGap) {
			bestGap = gap;
			best = s;
		}
	}
	// best is guaranteed non-null since states.length > 0
	if (best === null) return null;
	if (best.lastCheckInTs === null) return best;
	const brokenGap = now - best.lastCheckInTs;
	return brokenGap > STREAK_GAP_TOLERANCE_HOURS * HOUR ? best : null;
}

/**
 * Aggregate stats across multiple states for a child.
 */
export interface ChildStreakSummary {
	childId: string;
	totalHabits: number;
	totalCheckIns: number;
	averageCurrentStreak: number;
	bestStreakOverall: number;
	topStreak: HabitStreakState | null;
}

export function summarizeChildStreaks(
	states: readonly HabitStreakState[],
	childId: string,
): ChildStreakSummary {
	const childStates = states.filter((s) => s.childId === childId);
	const totalHabits = childStates.length;
	const totalCheckIns = childStates.reduce(
		(n, s) => n + s.checkIns.length,
		0,
	);
	const avg =
		totalHabits === 0
			? 0
			: childStates.reduce((n, s) => n + s.currentStreak, 0) /
				totalHabits;
	const bestOverall = childStates.reduce(
		(best, s) => (s.bestStreak > best ? s.bestStreak : best),
		0,
	);
	const top = getStreakLeaderboard(childStates)[0] ?? null;
	return {
		childId,
		totalHabits,
		totalCheckIns,
		averageCurrentStreak: Math.round(avg * 10) / 10,
		bestStreakOverall: bestOverall,
		topStreak: top,
	};
}

/**
 * Check whether a habit qualifies for a "weekly" badge: ≥5 check-ins in the
 * last 7 days.
 */
export function isWeeklyQualified(
	state: HabitStreakState,
	now: number = Date.now(),
): boolean {
	const WEEK = 7 * 24 * 60 * 60 * 1000;
	const recent = state.checkIns.filter((c) => now - c.ts <= WEEK);
	return recent.length >= 5;
}

/**
 * Convenience: render a streak leaderboard as a Chinese markdown list.
 */
export function formatLeaderboard(
	habits: readonly Habit[],
	states: readonly HabitStreakState[],
): string {
	const ranked = getStreakLeaderboard(states);
	if (ranked.length === 0) return "（暂无习惯打卡）";
	const habitMap = new Map(habits.map((h) => [h.id, h]));
	const lines: string[] = ["🏆 家庭打卡排行榜："];
	ranked.forEach((s, i) => {
		const h = habitMap.get(s.habitId);
		const title = h?.title ?? s.habitId;
		const badge = getStreakBadge(streakLevelFromDays(s.currentStreak));
		lines.push(
			`${i + 1}. ${badge.emoji} ${title} · 当前 ${s.currentStreak} 天 · 最佳 ${s.bestStreak} 天`,
		);
	});
	return lines.join("\n");
}
