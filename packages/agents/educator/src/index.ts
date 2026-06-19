/**
 * @parenting/agent-educator — schooling, learning style, interest, activities.
 *
 * Phase 1: rule-based + keyword matching. No LLM call.
 */

export {
	EducatorAgent,
	createEducatorAgent,
	EDUCATOR_DISCLAIMER,
} from "./agent.js";

export {
	EDU_STAGES,
	LEARNING_STYLES,
	INTERESTS,
	getEduStage,
	detectLearningStyle,
	detectInterests,
	suggestActivities,
	type EduStage,
	type EduStageInfo,
	type LearningStyle,
	type LearningStylePattern,
	type InterestCategory,
	type InterestInfo,
} from "./knowledge.js";

export const EDUCATOR_VERSION = "0.1.0";
