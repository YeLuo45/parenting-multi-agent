/**
 * @parenting/agent-pediatrician — illness triage, vaccines, milestones.
 *
 * Direction S: extended vaccine schedule with reminders.
 */

export {
	createPediatricianAgent,
	formatMilestonesForTest,
	PEDIATRICIAN_DISCLAIMER,
	PediatricianAgent,
} from "./agent.js";

export {
	calculateDose,
	type DoseInfo,
	getMilestonesForAge,
	getNextVaccine,
	getVaccinesForAge,
	type Milestone,
	type TriageRule,
	triageSymptom,
	VACCINE_SCHEDULE,
	type VaccineInfo,
} from "./knowledge.js";

export {
	buildVaccineSchedule,
	formatVaccineReminder,
	formatVaccineSchedule,
	getDueVaccines,
	isVaccineDue,
	recommendedDateForVaccine,
	VACCINE_DISCLAIMER,
	VACCINES,
	type Vaccine,
	type VaccineCategory,
	type VaccineId,
	type VaccineRecord,
	type VaccineScheduleEntry,
} from "./vaccine.js";

export const PEDIATRICIAN_VERSION = "0.2.0";
