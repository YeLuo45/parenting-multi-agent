/**
 * @parenting/agent-safety-guard — age-specific hazards + first aid + triage.
 *
 * Phase 2 batch 2: rule-based engine. No LLM call.
 */

export {
	SafetyGuardAgent,
	createSafetyGuardAgent,
	SAFETY_DISCLAIMER,
} from "./agent.js";

export {
	HAZARDS,
	FIRST_AID_GUIDES,
	getHazardsForAge,
	getHazardsByCategory,
	getHazardById,
	getCriticalHazards,
	getFirstAidGuide,
	getAllFirstAidTopics,
	triageSeverity,
	type Hazard,
	type HazardCategory,
	type HazardSeverity,
	type FirstAidTopic,
	type FirstAidGuide,
	type FirstAidStep,
} from "./knowledge.js";

export const SAFETY_GUARD_VERSION = "0.1.0";