/**
 * @parenting/agent-pediatrician — child health triage, vaccines, milestones.
 *
 * Phase 1: rule-based + keyword matching. No LLM call.
 * Real LLM integration planned for Phase 2.
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

export const PEDIATRICIAN_VERSION = "0.1.0";
