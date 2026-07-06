/**
 * @parenting/agent-educator — schooling, learning style, interest, activities,
 * and subject-specific learning coach.
 *
 * Phase 1: rule-based + keyword matching. No LLM call.
 */

export {
	createEducatorAgent,
	EDUCATOR_DISCLAIMER,
	EducatorAgent,
	findSubject,
	formatSubjectBrief,
	formatSubjectGuidance,
} from "./agent.js";

export {
	detectInterests,
	detectLearningStyle,
	detectSubjects,
	EDU_STAGES,
	type EduStage,
	type EduStageInfo,
	getEduStage,
	getSubjectGuidance,
	getSubjectSkillPath,
	INTERESTS,
	type InterestCategory,
	type InterestInfo,
	LEARNING_STYLES,
	type LearningStyle,
	type LearningStylePattern,
	SUBJECTS,
	type SubjectId,
	type SubjectInfo,
	type SubjectStageGuidance,
	suggestActivities,
	suggestSubjectActivities,
} from "./knowledge.js";

export { decodeSubjectStage, SUBJECT_STAGE_DATA } from "./subjects-data.js";

export const EDUCATOR_VERSION = "0.2.0";
