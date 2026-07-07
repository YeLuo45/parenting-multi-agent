/**
 * @parenting/agent-homework-helper — Socratic question coach.
 *
 * Phase 1: rule-based. No LLM call. Helps students work through problems
 * with guided questions, hints, and graded feedback.
 */

export {
	createHomeworkHelperAgent,
	HOMEWORK_HELPER_DISCLAIMER,
	HomeworkHelperAgent,
} from "./agent.js";

export {
	buildSocraticSession,
	detectDifficulty,
	detectHomeworkSubject,
	detectProblemTopic,
	formatHintChain,
	generateProbeQuestion,
	generateSocraticQuestion,
	getHintChain,
	getHomeworkSubjects,
	gradeStudentAnswer,
	HOMEWORK_SUBJECTS,
	type HomeworkDifficulty,
	type HomeworkSubject,
	type ProbeQuestion,
	type ProblemTopic,
	type SocraticSession,
	type SocraticStep,
} from "./knowledge.js";

export const HOMEWORK_HELPER_VERSION = "0.1.0";
