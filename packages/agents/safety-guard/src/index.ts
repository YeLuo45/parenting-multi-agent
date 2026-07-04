/**
 * @parenting/agent-safety-guard — age-specific hazards + first aid + triage.
 *
 * Phase 2 batch 2: rule-based engine. No LLM call.
 */

export {
	createSafetyGuardAgent,
	SAFETY_DISCLAIMER,
	SafetyGuardAgent,
} from "./agent.js";

export {
	buildEmergencyProtocol,
	type EmergencyLevel,
	type EmergencyProtocol,
	type EmergencyStep,
	EMERGENCY_PROTOCOLS,
	FIRST_AID_GUIDES,
	type FirstAidGuide,
	type FirstAidStep,
	type FirstAidTopic,
	getAllFirstAidTopics,
	getCriticalHazards,
	getFirstAidGuide,
	getHazardById,
	getHazardsByCategory,
	getHazardsForAge,
	HAZARDS,
	type Hazard,
	type HazardCategory,
	type HazardSeverity,
	triageSeverity,
} from "./knowledge.js";

export const SAFETY_GUARD_VERSION = "0.1.0";
