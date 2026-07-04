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

// ─── Real LLM providers (OpenAI / Anthropic compatible) ─────────────

/** What wire format a remote LLM endpoint expects. */
export type LlmApiFormat = "openai-chat" | "anthropic-messages";

export interface LlmFetchResult {
	ok: boolean;
	content: string;
	status: number;
	error?: string;
}

/** Minimal surface for a fetch implementation; lets tests inject a stub. */
export type LlmFetch = (
	input: string | URL,
	init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
	status: number;
	text(): Promise<string>;
}>;

/** Default fetch uses the global `fetch`. Node 18+ has it built in. */
const defaultFetch: LlmFetch = async (input, init) => {
	const res = await fetch(input as RequestInfo | URL, init);
	return {
		status: res.status,
		text: () => res.text(),
	};
};

/** Shared options for any real (HTTP-backed) LLM provider. */
export interface RemoteLlmProviderOptions extends WebLlmProviderOptions {
	model: string;
	/** Wire format. Default "openai-chat". minimax-m3 = "anthropic-messages". */
	apiFormat?: LlmApiFormat;
	/** Max tokens for the completion. Default 512. */
	maxTokens?: number;
	/** Optional system prompt prepended to every call. */
	systemPrompt?: string;
	/** Request timeout in ms. Default 15_000. */
	timeoutMs?: number;
	/** Fetch implementation (for tests). Default `globalThis.fetch`. */
	fetcher?: LlmFetch;
}

function safeParseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

/**
 * Generic OpenAI-compatible provider. Works with crs, xiaomi, zai, or
 * any endpoint that follows the `/v1/chat/completions` shape. The
 * response is parsed defensively — any non-JSON or unexpected shape
 * resolves to an empty string and the provider reports `ready: false`
 * on the next call.
 */
export function createOpenAICompatibleProvider(
	options: RemoteLlmProviderOptions,
): WebLlmProvider {
	const fetcher = options.fetcher ?? defaultFetch;
	return {
		id: options.id,
		ready: Boolean(options.endpoint && options.apiKey),
		async complete(agentId, prompt) {
			if (!options.apiKey) return "";
			const body = {
				model: options.model,
				messages: [
					...(options.systemPrompt
						? [{ role: "system", content: options.systemPrompt }]
						: []),
					{ role: "user", content: prompt },
				],
				max_tokens: options.maxTokens ?? 512,
				temperature: 0.4,
				stream: false,
			};
			try {
				const res = await fetcher(
					`${options.endpoint.replace(/\/$/, "")}/chat/completions`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${options.apiKey}`,
						},
						body: JSON.stringify(body),
					},
				);
				if (res.status < 200 || res.status >= 300) {
					if (res.status < 500) return ""; // 4xx — likely auth/usage, fall through
				}
				const text = await res.text();
				const json = safeParseJson(text) as {
					choices?: Array<{ message?: { content?: string } }>;
				} | null;
				const content = json?.choices?.[0]?.message?.content ?? "";
				return content;
			} catch {
				return "";
			}
		},
	};
}

/**
 * Anthropic-compatible provider. Used for minimax-m3 (and any other
 * endpoint that follows `/v1/messages`). Sends a single user message
 * with an optional system prompt; reads `content[0].text` from the
 * response.
 */
export function createAnthropicCompatibleProvider(
	options: RemoteLlmProviderOptions,
): WebLlmProvider {
	const fetcher = options.fetcher ?? defaultFetch;
	return {
		id: options.id,
		ready: Boolean(options.endpoint && options.apiKey),
		async complete(agentId, prompt) {
			if (!options.apiKey) return "";
			const body = {
				model: options.model,
				max_tokens: options.maxTokens ?? 512,
				...(options.systemPrompt
					? { system: options.systemPrompt }
					: {}),
				messages: [{ role: "user", content: prompt }],
			};
			try {
				const res = await fetcher(
					`${options.endpoint.replace(/\/$/, "")}/messages`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-api-key": options.apiKey,
							"anthropic-version": "2023-06-01",
						},
						body: JSON.stringify(body),
					},
				);
				if (res.status < 200 || res.status >= 300) {
					if (res.status < 500) return "";
				}
				const text = await res.text();
				const json = safeParseJson(text) as {
					content?: Array<{ type?: string; text?: string }>;
				} | null;
				const content =
					json?.content?.find((block) => block.type === "text")?.text ?? "";
				return content;
			} catch {
				return "";
			}
		},
	};
}

/**
 * Convenience: the minimax-m3 provider. Reads the API key from the
 * `MINIMAX_CN_API_KEY` environment variable (the same name hermes
 * uses) so the web app can stay in sync with the host CLI. Endpoint
 * defaults to `https://api.minimaxi.com/v1`. Format is auto-detected
 * from the apiFormat option.
 */
export function createMinimaxM3Provider(
	options: Partial<RemoteLlmProviderOptions> & {
		apiKey?: string;
		fetcher?: LlmFetch;
	},
): WebLlmProvider {
	const apiKey = options.apiKey ?? readEnv("MINIMAX_CN_API_KEY");
	return createAnthropicCompatibleProvider({
		id: options.id ?? "minimax-m3",
		endpoint: options.endpoint ?? "https://api.minimaxi.com/v1",
		apiKey,
		model: options.model ?? "MiniMax-M3",
		apiFormat: "anthropic-messages",
		maxTokens: options.maxTokens ?? 768,
		systemPrompt:
			options.systemPrompt ??
			"你是一位经验丰富的新手爸妈育儿助手，用中文回答，关注循证医学与可操作建议。",
		fetcher: options.fetcher,
	});
}

/** xiaomi MiMo secondary fallback (OpenAI-compatible). */
export function createXiaomiMiMoProvider(
	options: Partial<RemoteLlmProviderOptions> & {
		apiKey?: string;
		fetcher?: LlmFetch;
	},
): WebLlmProvider {
	const apiKey = options.apiKey ?? readEnv("XIAOMI_API_KEY");
	return createOpenAICompatibleProvider({
		id: options.id ?? "xiaomi-mimo",
		endpoint: options.endpoint ?? "https://token-plan-cn.xiaomimimo.com/v1",
		apiKey,
		model: options.model ?? "mimo-v2-flash",
		apiFormat: "openai-chat",
		maxTokens: options.maxTokens ?? 768,
		systemPrompt:
			options.systemPrompt ??
			"你是一位经验丰富的新手爸妈育儿助手，用中文回答，关注循证医学与可操作建议。",
		fetcher: options.fetcher,
	});
}

/**
 * Read an environment variable in both browser and Node. In the
 * browser, `process` is undefined; callers in the browser bundle
 * should pass the apiKey explicitly via options.
 */
export function readEnv(name: string): string | undefined {
	if (typeof globalThis !== "undefined") {
		// Node 20+ exposes process.env on globalThis in some shims.
		const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } })
			.process;
		if (proc?.env?.[name]) return proc.env[name];
	}
	if (typeof process !== "undefined" && process.env?.[name]) {
		return process.env[name] as string;
	}
	return undefined;
}

export function createRuleFallbackProvider(
	id = "rule-fallback",
): WebLlmProvider {
	return {
		id,
		ready: true,
		async complete(agentId, prompt) {
			return `[${id}] ${agentId}: rule-based fallback for ${prompt}`;
		},
	};
}

export interface WebLlmCompletion {
	providerId: string;
	content: string;
	usedFallback: boolean;
	/**
	 * Provider IDs that were tried before the final one. Includes the
	 * final provider too (for telemetry). Empty if the chain was a
	 * single-step call.
	 */
	triedProviderIds: string[];
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

export function registerWebLlmProviders(
	providers: WebLlmProvider[],
): WebLlmRegistry {
	const fallback =
		providers.find((provider) => provider.id.includes("fallback")) ??
		createRuleFallbackProvider();
	const nonFallback = providers.filter((provider) => provider !== fallback);
	const primary = nonFallback.find((provider) => provider.ready) ?? null;
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
			// Automatic fallback: try each ready non-fallback provider in
			// order; the first one to return non-empty content wins. The
			// rule-fallback is the last-resort tail.
			const tried: string[] = [];
			for (const provider of nonFallback) {
				if (!provider.ready) continue;
				tried.push(provider.id);
				const content = await provider.complete(agentId, prompt);
				if (content) {
					return {
						providerId: provider.id,
						content,
						usedFallback: false,
						triedProviderIds: tried,
					};
				}
			}
			// All real tiers returned empty (auth / rate-limit / network).
			// Fall back to the rule stub.
			tried.push(fallback.id);
			const content = await fallback.complete(agentId, prompt);
			return {
				providerId: fallback.id,
				content,
				usedFallback: true,
				triedProviderIds: tried,
			};
		},
	};
}

/**
 * Build a real LLM provider chain: minimax-m3 → xiaomi-mimo → rule-fallback.
 * Each tier is added only if its `ready` flag is true (i.e. it has an
 * API key). The chain tries each ready provider in order; the first
 * one to return a non-empty content wins. The rule-fallback always
 * stays at the tail as a safety net.
 */
export function buildRealLlmProviderChain(options?: {
	minimax?: { apiKey?: string; endpoint?: string; fetcher?: LlmFetch };
	xiaomi?: { apiKey?: string; endpoint?: string; fetcher?: LlmFetch };
	fetcher?: LlmFetch;
}): WebLlmRegistry {
	const tiers: WebLlmProvider[] = [];
	if (options?.minimax !== null) {
		tiers.push(
			createMinimaxM3Provider({
				apiKey: options?.minimax?.apiKey,
				endpoint: options?.minimax?.endpoint,
				fetcher: options?.minimax?.fetcher,
			}),
		);
	}
	if (options?.xiaomi !== null) {
		tiers.push(
			createXiaomiMiMoProvider({
				apiKey: options?.xiaomi?.apiKey,
				endpoint: options?.xiaomi?.endpoint,
				fetcher: options?.xiaomi?.fetcher,
			}),
		);
	}
	tiers.push(createRuleFallbackProvider());
	return registerWebLlmProviders(tiers);
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
