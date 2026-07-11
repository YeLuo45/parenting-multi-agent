/**
 * Achievement badges — milestone-based rewards for habit streaks.
 *
 * Direction P: extends Direction H with named achievements.
 */

import type { HabitStreakState } from "./streak.js";

export type AchievementId =
	| "first_checkin"
	| "streak_3"
	| "streak_7"
	| "streak_14"
	| "streak_30"
	| "streak_60"
	| "streak_90"
	| "streak_180"
	| "streak_365"
	| "perfect_week"
	| "comeback"
	| "consistent";

export interface Achievement {
	id: AchievementId;
	title: string;
	titleEn: string;
	emoji: string;
	description: string;
	threshold: number | "perfect-week" | "comeback" | "consistent";
}

export const ACHIEVEMENTS: Achievement[] = [
	{
		id: "first_checkin",
		title: "初次打卡",
		titleEn: "First Check-In",
		emoji: "🌱",
		description: "完成第一次习惯打卡",
		threshold: 1,
	},
	{
		id: "streak_3",
		title: "三日初步",
		titleEn: "3-Day Streak",
		emoji: "🔥",
		description: "连续打卡 3 天",
		threshold: 3,
	},
	{
		id: "streak_7",
		title: "一周坚持",
		titleEn: "1-Week Streak",
		emoji: "⭐",
		description: "连续打卡 7 天",
		threshold: 7,
	},
	{
		id: "streak_14",
		title: "两周稳定",
		titleEn: "2-Week Streak",
		emoji: "🌟",
		description: "连续打卡 14 天",
		threshold: 14,
	},
	{
		id: "streak_30",
		title: "月度习惯",
		titleEn: "Monthly Habit",
		emoji: "🏆",
		description: "连续打卡 30 天",
		threshold: 30,
	},
	{
		id: "streak_60",
		title: "两月大师",
		titleEn: "2-Month Master",
		emoji: "💎",
		description: "连续打卡 60 天",
		threshold: 60,
	},
	{
		id: "streak_90",
		title: "季度成就",
		titleEn: "Quarterly Achievement",
		emoji: "👑",
		description: "连续打卡 90 天",
		threshold: 90,
	},
	{
		id: "streak_180",
		title: "半年大师",
		titleEn: "6-Month Master",
		emoji: "🎖️",
		description: "连续打卡 180 天",
		threshold: 180,
	},
	{
		id: "streak_365",
		title: "年度传奇",
		titleEn: "Yearly Legend",
		emoji: "🏅",
		description: "连续打卡 365 天",
		threshold: 365,
	},
	{
		id: "perfect_week",
		title: "完美一周",
		titleEn: "Perfect Week",
		emoji: "🌈",
		description: "连续 7 天不间断",
		threshold: "perfect-week",
	},
	{
		id: "comeback",
		title: "完美复出",
		titleEn: "Comeback Kid",
		emoji: "💪",
		description: "中断后重新建立 3 天以上连击",
		threshold: "comeback",
	},
	{
		id: "consistent",
		title: "稳定输出",
		titleEn: "Consistent",
		emoji: "🌟",
		description: "最佳连击 ≥ 30 天",
		threshold: "consistent",
	},
];

const ACHIEVEMENTS_BY_ID: ReadonlyMap<AchievementId, Achievement> = new Map(
	ACHIEVEMENTS.map((a) => [a.id, a]),
);

/** Get an achievement definition by id. */
export function getAchievement(id: AchievementId): Achievement | null {
	return ACHIEVEMENTS_BY_ID.get(id) ?? null;
}

/** Check whether a state qualifies for a given achievement. */
export function qualifiesFor(
	achievementId: AchievementId,
	state: HabitStreakState,
): boolean {
	const a = ACHIEVEMENTS_BY_ID.get(achievementId);
	if (!a) return false;
	if (typeof a.threshold === "number") {
		return (
			state.currentStreak >= a.threshold ||
			state.bestStreak >= a.threshold
		);
	}
	if (a.threshold === "perfect-week") {
		return state.currentStreak >= 7 && state.bestStreak >= 7;
	}
	if (a.threshold === "comeback") {
		return (
			state.currentStreak >= 3 &&
			state.bestStreak >= state.currentStreak + 5
		);
	}
	// remaining literal: "consistent"
	return state.bestStreak >= 30;
}

/** Return all achievements a state has earned, in canonical order. */
export function earnedAchievements(state: HabitStreakState): Achievement[] {
	const out: Achievement[] = [];
	for (const a of ACHIEVEMENTS) {
		if (qualifiesFor(a.id, state)) out.push(a);
	}
	return out;
}

/** Next unearned achievement (or null if all earned). */
export function nextAchievement(state: HabitStreakState): Achievement | null {
	for (const a of ACHIEVEMENTS) {
		if (!qualifiesFor(a.id, state)) return a;
	}
	return null;
}

/** Format a list of achievements as a Chinese markdown block. */
export function formatAchievements(
	achievements: readonly Achievement[],
): string {
	if (achievements.length === 0) return "（暂无成就）";
	const lines: string[] = ["🏅 已解锁成就："];
	for (const a of achievements) {
		lines.push(`- ${a.emoji} ${a.title}（${a.titleEn}）— ${a.description}`);
	}
	return lines.join("\n");
}

/** Count of total possible achievements. */
export function totalAchievements(): number {
	return ACHIEVEMENTS.length;
}
