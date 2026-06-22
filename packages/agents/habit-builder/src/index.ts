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

export const HABIT_BUILDER_VERSION = "0.1.0";
