/**
 * @parenting/agent-habit-builder — habit formation, routines, screen time, sleep.
 *
 * Phase 2 batch 2: rule-based engine. No LLM call.
 */

export {
	HabitBuilderAgent,
	createHabitBuilderAgent,
	HABIT_DISCLAIMER,
} from "./agent.js";

export {
	HABITS,
	HABIT_FORMATION_AVG_DAYS,
	SCREEN_TIME_GUIDELINES,
	SLEEP_HOURS_GUIDELINES,
	getHabitsForAge,
	getHabitsByDomain,
	getHabitById,
	habitStepCount,
	habitTotalDuration,
	habitLoop,
	streakLevel,
	screenTimeForAge,
	sleepHoursForAge,
	type Habit,
	type HabitDomain,
	type HabitStep,
	type HabitCue,
	type ScreenTimeGuideline,
	type SleepHoursGuideline,
} from "./knowledge.js";

export const HABIT_BUILDER_VERSION = "0.1.0";