export {
	SleepCoachAgent,
	createSleepCoachAgent,
	SLEEP_COACH_DISCLAIMER,
} from "./agent.js";

export {
	BEDTIME_ROUTINE_STEPS,
	SLEEP_REGRESSIONS,
	getNapSchedule,
	getNightWakingCauses,
	getSleepMethod,
	getSleepMethodsForAge,
	getSleepRegression,
	type NapSchedule,
	type NightWakingCause,
	type SleepMethod,
	type SleepRegression,
	type SleepTrainingMethod,
} from "./knowledge.js";

export const SLEEP_COACH_VERSION = "0.1.0";
