/**
 * @parenting/orchestrator — multi-agent orchestrator for parenting questions.
 *
 * Combines:
 * - chatdev Puppeteer pattern (routing + coordination)
 * - nanobot MessageBus (event pub/sub)
 * - generic-agent L0 rules (from @parenting/memory)
 */

export { OrchestratorCore } from "./orchestrator.js";
export { MessageBus, type EventHandler, type Unsubscribe } from "./bus.js";
export {
	type Agent,
	type AgentContext,
	type AgentReply,
	type AgentTopic,
	type OrchestratorConfig,
	type OrchestratorEvent,
	type OrchestratorResult,
	type RedFlag,
	type UrgencyLevel,
	detectTopics,
} from "./types.js";

export const ORCHESTRATOR_VERSION = "0.1.0";
