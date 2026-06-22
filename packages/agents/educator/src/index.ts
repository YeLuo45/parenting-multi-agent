/**
 * @parenting/agent-educator — schooling, learning style, interest, activities.
 *
 * Phase 1: rule-based + keyword matching. No LLM call.
 */

export {
	createEducatorAgent,
	EDUCATOR_DISCLAIMER,
	EducatorAgent,
} from "./agent.js";

export {
	detectInterests,
	detectLearningStyle,
	EDU_STAGES,
	type EduStage,
	type EduStageInfo,
	getEduStage,
	INTERESTS,
	type InterestCategory,
	type InterestInfo,
	LEARNING_STYLES,
	type LearningStyle,
	type LearningStylePattern,
	suggestActivities,
} from "./knowledge.js";

export const EDUCATOR_VERSION = "0.1.0";
