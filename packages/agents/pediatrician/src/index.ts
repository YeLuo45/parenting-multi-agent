/**
 * @parenting/agent-pediatrician — child health triage, vaccines, milestones.
 *
 * Phase 1: rule-based + keyword matching. No LLM call.
 * Real LLM integration planned for Phase 2.
 */

export {
	PediatricianAgent,
	createPediatricianAgent,
	PEDIATRICIAN_DISCLAIMER,
	formatMilestonesForTest,
} from "./agent.js";

export {
	VACCINE_SCHEDULE,
	getVaccinesForAge,
	getNextVaccine,
	triageSymptom,
	getMilestonesForAge,
	calculateDose,
	type VaccineInfo,
	type TriageRule,
	type Milestone,
	type DoseInfo,
} from "./knowledge.js";

export const PEDIATRICIAN_VERSION = "0.1.0";
