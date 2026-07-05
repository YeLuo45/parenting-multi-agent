/**
 * In-process orchestrator factory for the web dashboard.
 *
 * Creates an OrchestratorCore backed by a WebMemoryLayer (pure in-memory,
 * no native SQLite) with all 12 specialist agents registered. The web app
 * uses this to run the real parenting multi-agent stack directly in the
 * browser, without an HTTP server or native dependencies.
 */

import { createCareerAgent } from "@parenting/agent-career";
import { createCollegePrepAgent } from "@parenting/agent-college-prep";
import { createEducatorAgent } from "@parenting/agent-educator";
import { createFamilyMediatorAgent } from "@parenting/agent-family-mediator";
import { createFinanceAgent } from "@parenting/agent-finance";
import { createGrowthTrackerAgent } from "@parenting/agent-growth-tracker";
import { createHabitBuilderAgent } from "@parenting/agent-habit-builder";
import { createKnowledgeRAGAgent } from "@parenting/agent-knowledge-rag";
import { createLegalAgent } from "@parenting/agent-legal";
import { createNutritionistAgent } from "@parenting/agent-nutritionist";
import { createParentSupportAgent } from "@parenting/agent-parent-support";
import { createPediatricianAgent } from "@parenting/agent-pediatrician";
import { createPsychologistAgent } from "@parenting/agent-psychologist";
import { createSafetyGuardAgent } from "@parenting/agent-safety-guard";
import { createSchoolReadinessAgent } from "@parenting/agent-school-readiness";
import { createSiblingAgent } from "@parenting/agent-sibling";
import { createSleepCoachAgent } from "@parenting/agent-sleep-coach";
import { createSocialAgent } from "@parenting/agent-social";
import type { ChildProfile } from "@parenting/memory";
import type { AgentStats, Feedback } from "@parenting/orchestrator";
import { OrchestratorCore } from "@parenting/orchestrator";
import { IndexedDbMemoryLayer } from "./memory-indexeddb.js";
import type { WebLlmRegistry } from "./web-convergence.js";
import {
	type MemoryLayerLike,
	type MemoryStats,
	WebMemoryLayer,
} from "./memory-web.js";

export interface WebOrchestrator {
	orchestrator: OrchestratorCore;
	memory: MemoryLayerLike;
	ask: (
		child: ChildProfile,
		question: string,
	) => ReturnType<OrchestratorCore["ask"]>;
	recordAgentFeedback: (
		childId: string,
		agentId: string,
		feedback: "up" | "down",
		sessionId?: string,
	) => Feedback | null;
	getAgentFeedbackStats: (agentId: string) => AgentStats;
	getMemoryStats: () => MemoryStats;
	listChildren: () => ChildProfile[];
	upsertChild: (profile: ChildProfile) => ChildProfile;
	close: () => void;
}

/** Create a fully-wired web orchestrator. Each call returns an isolated
 *  in-memory stack — no cross-test pollution. Uses WebMemoryLayer (pure
 *  in-memory Map) so no better-sqlite3 native module is needed. */
export function createWebOrchestrator(options?: {
	llmRegistry?: WebLlmRegistry;
}): WebOrchestrator {
	const memory = new WebMemoryLayer();
	const orchestrator = new OrchestratorCore({
		memory,
		maxAgentsPerAsk: 3,
		minConfidence: 0.3,
	});
	registerWebAgents(orchestrator, options?.llmRegistry);
	return wireStack(orchestrator, memory);
}

/** Get the list of registered agent ids for the UI to show. */
export function listWebAgentIds(): string[] {
	return [
		"pediatrician",
		"psychologist",
		"educator",
		"nutritionist",
		"sleep-coach",
		"family-mediator",
		"finance",
		"parent-support",
		"growth-tracker",
		"habit-builder",
		"knowledge-rag",
		"safety-guard",
		"social",
		"legal",
		"sibling",
		"school-readiness",
		"college-prep",
		"career",
	];
}

/**
 * Create a web orchestrator backed by IndexedDbMemoryLayer so child
 * profiles, facts, episodes, and sessions persist across browser reloads.
 * Falls back to a plain in-memory layer if IDB is unavailable (e.g. SSR).
 */
export async function createWebOrchestratorWithPersistence(
	dbName?: string,
	options?: { llmRegistry?: WebLlmRegistry },
): Promise<WebOrchestrator> {
	const memory = new IndexedDbMemoryLayer({ dbName: dbName ?? "parenting-memory" });
	await memory.ready();
	const stack = { memory, orchestrator: new OrchestratorCore({ memory, maxAgentsPerAsk: 3, minConfidence: 0.3 }) };
	registerWebAgents(stack.orchestrator, options?.llmRegistry);
	return wireStack(stack.orchestrator, stack.memory);
}

function wireOrchestrator(memory: MemoryLayerLike): WebOrchestrator {
	const orchestrator = new OrchestratorCore({
		memory,
		maxAgentsPerAsk: 3,
		minConfidence: 0.3,
	});
	registerWebAgents(orchestrator);
	return wireStack(orchestrator, memory);
}

function registerWebAgents(
	orchestrator: OrchestratorCore,
	llmRegistry?: WebLlmRegistry,
): void {
	orchestrator.registerAgent(createPediatricianAgent());
	orchestrator.registerAgent(createPsychologistAgent());
	orchestrator.registerAgent(createEducatorAgent());
	orchestrator.registerAgent(createNutritionistAgent());
	orchestrator.registerAgent(createSleepCoachAgent());
	orchestrator.registerAgent(createFamilyMediatorAgent());
	orchestrator.registerAgent(createFinanceAgent());
	orchestrator.registerAgent(createParentSupportAgent());
	orchestrator.registerAgent(createGrowthTrackerAgent());
	orchestrator.registerAgent(createHabitBuilderAgent());
	// Wire the LLM registry (if provided) into the knowledge-rag agent
	// so its "search" / "evidence" answers go through the provider
	// chain instead of just listing FAQ entries.
	const llmAdapter: Parameters<typeof createKnowledgeRAGAgent>[0] | undefined =
		llmRegistry
			? {
					llmGenerator: async (
						systemPrompt: string,
						userPrompt: string,
					): Promise<string> => {
						const r = await llmRegistry.complete(
							"knowledge-rag",
							`${systemPrompt}\n\n${userPrompt}`,
						);
						return r.content;
					},
					llmChainIds: () => {
						const s = llmRegistry.status;
						const ids: string[] = [];
						if (s.primaryProviderId) ids.push(s.primaryProviderId);
						ids.push(s.fallbackProviderId);
						return ids;
					},
				}
			: undefined;
	orchestrator.registerAgent(createKnowledgeRAGAgent(llmAdapter));
	orchestrator.registerAgent(createSafetyGuardAgent());
	orchestrator.registerAgent(createSocialAgent());
	orchestrator.registerAgent(createSchoolReadinessAgent());
	orchestrator.registerAgent(createCollegePrepAgent());
	orchestrator.registerAgent(createCareerAgent());
	orchestrator.registerAgent(createLegalAgent());
	orchestrator.registerAgent(createSiblingAgent());
}

function wireStack(
	orchestrator: OrchestratorCore,
	memory: MemoryLayerLike,
): WebOrchestrator {
	return {
		orchestrator,
		memory,
		ask: (child, question) => orchestrator.ask(question, child),
		recordAgentFeedback: (childId, agentId, feedback, sessionId) =>
			orchestrator.recordFeedback(
				childId,
				sessionId ?? "web-session",
				agentId,
				feedback === "up" ? 5 : 1,
			),
		getAgentFeedbackStats: (agentId) => orchestrator.getAgentStats(agentId),
		getMemoryStats: () => getMemoryStats(memory),
		listChildren: () => memory.listChildren(),
		upsertChild: (profile) => memory.upsertChild(profile),
		close: () => memory.close(),
	};
}

function getMemoryStats(memory: MemoryLayerLike): MemoryStats {
	return (
		memory.getMemoryStats?.() ?? {
			children: memory.listChildren().length,
			facts: 0,
			episodes: 0,
			sessions: 0,
			feedback: 0,
			unsyncedDeltas: memory.getDeltaStats().unsynced,
		}
	);
}
