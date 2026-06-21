/**
 * In-process orchestrator factory for the web dashboard.
 *
 * Creates an OrchestratorCore backed by a WebMemoryLayer (pure in-memory,
 * no native SQLite) with all 12 specialist agents registered. The web app
 * uses this to run the real parenting multi-agent stack directly in the
 * browser, without an HTTP server or native dependencies.
 */
import { OrchestratorCore } from "@parenting/orchestrator";
import type { ChildProfile } from "@parenting/memory";
import { WebMemoryLayer, type MemoryLayerLike } from "./memory-web.js";
import { createPediatricianAgent } from "@parenting/agent-pediatrician";
import { createPsychologistAgent } from "@parenting/agent-psychologist";
import { createEducatorAgent } from "@parenting/agent-educator";
import { createNutritionistAgent } from "@parenting/agent-nutritionist";
import { createSleepCoachAgent } from "@parenting/agent-sleep-coach";
import { createFamilyMediatorAgent } from "@parenting/agent-family-mediator";
import { createFinanceAgent } from "@parenting/agent-finance";
import { createParentSupportAgent } from "@parenting/agent-parent-support";
import { createGrowthTrackerAgent } from "@parenting/agent-growth-tracker";
import { createHabitBuilderAgent } from "@parenting/agent-habit-builder";
import { createKnowledgeRAGAgent } from "@parenting/agent-knowledge-rag";
import { createSafetyGuardAgent } from "@parenting/agent-safety-guard";
import { createSocialAgent } from "@parenting/agent-social";
import { createLegalAgent } from "@parenting/agent-legal";
import { createSiblingAgent } from "@parenting/agent-sibling";
import { createSchoolReadinessAgent } from "@parenting/agent-school-readiness";
import { createCollegePrepAgent } from "@parenting/agent-college-prep";
import { createCareerAgent } from "@parenting/agent-career";

export interface WebOrchestrator {
	orchestrator: OrchestratorCore;
	memory: MemoryLayerLike;
	ask: (child: ChildProfile, question: string) => ReturnType<OrchestratorCore["ask"]>;
	listChildren: () => ChildProfile[];
	upsertChild: (profile: ChildProfile) => ChildProfile;
	close: () => void;
}

/** Create a fully-wired web orchestrator. Each call returns an isolated
 *  in-memory stack — no cross-test pollution. Uses WebMemoryLayer (pure
 *  in-memory Map) so no better-sqlite3 native module is needed. */
export function createWebOrchestrator(): WebOrchestrator {
	const memory = new WebMemoryLayer();
	const orchestrator = new OrchestratorCore({ memory, maxAgentsPerAsk: 3, minConfidence: 0.3 });
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
	orchestrator.registerAgent(createKnowledgeRAGAgent());
	orchestrator.registerAgent(createSafetyGuardAgent());
	orchestrator.registerAgent(createSocialAgent());
	orchestrator.registerAgent(createSchoolReadinessAgent());
	orchestrator.registerAgent(createCollegePrepAgent());
	orchestrator.registerAgent(createCareerAgent());
orchestrator.registerAgent(createLegalAgent());
	orchestrator.registerAgent(createSiblingAgent());
	return {
		orchestrator,
		memory,
		ask: (child, question) => orchestrator.ask(question, child),
		listChildren: () => memory.listChildren(),
		upsertChild: (profile) => memory.upsertChild(profile),
		close: () => memory.close(),
	};
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
