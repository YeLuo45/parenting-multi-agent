/**
 * @parenting/agent-psychologist — child emotions, behavior, development.
 *
 * Phase 1: rule-based + keyword matching. No LLM call.
 */

export {
	PsychologistAgent,
	createPsychologistAgent,
	PSYCHOLOGIST_DISCLAIMER,
} from "./agent.js";

export {
	EMOTION_PATTERNS,
	BEHAVIOR_PROBLEMS,
	ERIKSON_STAGES,
	detectEmotions,
	matchBehaviorProblem,
	getEriksonStage,
	type BehaviorProblem,
	type Emotion,
	type EmotionPattern,
	type EriksonStage,
} from "./knowledge.js";

export const PSYCHOLOGIST_VERSION = "0.1.0";
