/**
 * @parenting/agent-habit-builder — habit formation, routines, screen time, sleep.
 *
 * Phase 2 batch 2: rule-based engine. No LLM call.
 */

export {
	createHabitBuilderAgent,
	HABIT_DISCLAIMER,
	HabitBuilderAgent,
} from "./agent.js";

export {
	getHabitById,
	getHabitsByDomain,
	getHabitsForAge,
	HABIT_FORMATION_AVG_DAYS,
	HABITS,
	type Habit,
	type HabitCue,
	type HabitDomain,
	type HabitStep,
	habitLoop,
	habitStepCount,
	habitTotalDuration,
	SCREEN_TIME_GUIDELINES,
	type ScreenTimeGuideline,
	SLEEP_HOURS_GUIDELINES,
	type SleepHoursGuideline,
	screenTimeForAge,
	sleepHoursForAge,
	streakLevel,
} from "./knowledge.js";

export {
	type ChildStreakSummary,
	emptyStreakState,
	formatLeaderboard,
	formatStreakBadge,
	getStreakBadge,
	getStreakLeaderboard,
	type HabitCheckIn,
	type HabitStreakState,
	isWeeklyQualified,
	recomputeStreak,
	recordCheckIn,
	STREAK_GAP_TOLERANCE_HOURS,
	type StreakBadge,
	type StreakLevel,
	streakLevelFromDays,
	suggestNextCheckIn,
	summarizeChildStreaks,
} from "./streak.js";

export const HABIT_BUILDER_VERSION = "0.2.0";
