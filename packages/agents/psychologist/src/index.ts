/**
 * @parenting/agent-psychologist — child emotions, behavior, development.
 *
 * Phase 1: rule-based + keyword matching. No LLM call.
 */

export {
	createPsychologistAgent,
	PSYCHOLOGIST_DISCLAIMER,
	PsychologistAgent,
} from "./agent.js";

export {
	BEHAVIOR_PROBLEMS,
	type BehaviorProblem,
	detectEmotions,
	EMOTION_PATTERNS,
	type Emotion,
	type EmotionPattern,
	ERIKSON_STAGES,
	type EriksonStage,
	getEriksonStage,
	matchBehaviorProblem,
} from "./knowledge.js";

export const PSYCHOLOGIST_VERSION = "0.1.0";
