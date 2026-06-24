import type { FeedbackAnalyticsRow, SyncSnapshot } from "./memory-helpers.js";
import type { MemoryLayerLike, MemoryStats } from "./memory-web.js";

export interface WebConvergenceSnapshot {
	memory: MemoryStats;
	sync: SyncSnapshot;
	feedback: FeedbackAnalyticsRow[];
}

export function buildWebConvergenceSnapshot(
	memory: MemoryLayerLike,
): WebConvergenceSnapshot {
	return {
		memory: memory.getMemoryStats?.() ?? {
			children: memory.listChildren().length,
			facts: memory.listFacts?.().length ?? 0,
			episodes: memory.listEpisodes?.().length ?? 0,
			sessions: 0,
			feedback: memory.listFeedback?.().length ?? 0,
			unsyncedDeltas: memory.getDeltaStats().unsynced,
		},
		sync: memory.getSyncSnapshot?.() ?? {
			total: memory.getDeltaStats().total,
			unsynced: memory.getDeltaStats().unsynced,
			status:
				memory.getDeltaStats().unsynced === 0 ? "synced" : "pending",
			latestUnsynced: memory.getUnsyncedDeltas(5),
			byTable: memory.getDeltaStats().byTable,
		},
		feedback: memory.getFeedbackAnalytics?.() ?? [],
	};
}

export interface WebLlmProvider {
	id: string;
	ready: boolean;
	complete(agentId: string, prompt: string): Promise<string>;
}

export interface WebLlmProviderOptions {
	id: string;
	endpoint: string;
	apiKey?: string;
}

export interface WebLlmCompletion {
	providerId: string;
	content: string;
	usedFallback: boolean;
}

export interface WebLlmRegistry {
	status: {
		primaryProviderId: string | null;
		fallbackProviderId: string;
		ready: boolean;
	};
	complete(agentId: string, prompt: string): Promise<WebLlmCompletion>;
}

export function createWebLlmProvider(
	options: WebLlmProviderOptions,
): WebLlmProvider {
	return {
		id: options.id,
		ready: Boolean(options.endpoint && options.apiKey),
		async complete(agentId: string, prompt: string): Promise<string> {
			return `[${options.id}] ${agentId}: ${prompt}`;
		},
	};
}

export function createRuleFallbackProvider(
	id = "rule-fallback",
): WebLlmProvider {
	return {
		id,
		ready: true,
		async complete(agentId: string, prompt: string): Promise<string> {
			return `[${id}] ${agentId}: rule-based fallback for ${prompt}`;
		},
	};
}

export function registerWebLlmProviders(
	providers: WebLlmProvider[],
): WebLlmRegistry {
	const fallback =
		providers.find((provider) => provider.id.includes("fallback")) ??
		createRuleFallbackProvider();
	const primary = providers.find((provider) => provider !== fallback) ?? null;
	return {
		status: {
			primaryProviderId: primary?.id ?? null,
			fallbackProviderId: fallback.id,
			ready: primary?.ready ?? false,
		},
		async complete(
			agentId: string,
			prompt: string,
		): Promise<WebLlmCompletion> {
			const provider = primary?.ready ? primary : fallback;
			return {
				providerId: provider.id,
				content: await provider.complete(agentId, prompt),
				usedFallback: provider === fallback,
			};
		},
	};
}

export interface E2eMainPathInput {
	children: number;
	messages: number;
	feedback: number;
	memoryVisible: boolean;
	syncVisible: boolean;
	llmFallbackReady: boolean;
}

export interface E2eMainPathStep {
	id:
		| "add-child"
		| "ask-question"
		| "record-feedback"
		| "memory-dashboard"
		| "sync-queue"
		| "llm-fallback";
	ok: boolean;
}

export interface E2eMainPathReport {
	ready: boolean;
	steps: E2eMainPathStep[];
}

export function buildE2eMainPathReport(
	input: E2eMainPathInput,
): E2eMainPathReport {
	const steps: E2eMainPathStep[] = [
		{ id: "add-child", ok: input.children > 0 },
		{ id: "ask-question", ok: input.messages >= 2 },
		{ id: "record-feedback", ok: input.feedback > 0 },
		{ id: "memory-dashboard", ok: input.memoryVisible },
		{ id: "sync-queue", ok: input.syncVisible },
		{ id: "llm-fallback", ok: input.llmFallbackReady },
	];
	return { ready: steps.every((step) => step.ok), steps };
}
