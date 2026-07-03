/**
 * @parenting/orchestrator — multi-agent orchestrator for parenting questions.
 *
 * Combines:
 * - chatdev Puppeteer pattern (routing + coordination)
 * - nanobot MessageBus (event pub/sub)
 * - generic-agent L0 rules (from @parenting/memory)
 */

export { type EventHandler, MessageBus, type Unsubscribe } from "./bus.js";
export {
	applyFeedbackBoost,
	applyStageBonus,
	applyTopicMatch,
	applyWorkbenchHints,
	OrchestratorCore,
	WORKBENCH_HINT_MULTIPLIER,
} from "./orchestrator.js";
export {
	type Agent,
	type AgentContext,
	type AgentReply,
	type AgentStats,
	type AgentTopic,
	type AgentWeightHint,
	type AgentWeightHints,
	detectTopics,
	type Feedback,
	type FeedbackRating,
	type MemoryLayerLike,
	type OrchestratorConfig,
	type OrchestratorEvent,
	type OrchestratorResult,
	type RedFlag,
	type UrgencyLevel,
} from "./types.js";

export const ORCHESTRATOR_VERSION = "0.1.0";
