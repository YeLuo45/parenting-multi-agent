import { describe, expect, it } from "vitest";
import {
	buildE2eMainPathReport,
	buildRealLlmProviderChain,
	buildWebConvergenceSnapshot,
	createAnthropicCompatibleProvider,
	createMinimaxM3Provider,
	createOpenAICompatibleProvider,
	createRuleFallbackProvider,
	createWebLlmProvider,
	createXiaomiMiMoProvider,
	IndexedDbMemoryLayer,
	readEnv,
	registerWebLlmProviders,
} from "../src/index.js";
import { createFakeBackend } from "./_idb-fake.js";

describe("web convergence facade", () => {
	it("persists deletes for episodes and feedback in IndexedDB", async () => {
		const fake = createFakeBackend();
		const layer = new IndexedDbMemoryLayer({
			backend: fake.backend,
			dbName: "conv",
		});
		await layer.ready();
		const episode = layer.addEpisode("c1", "qa", { question: "Q" });
		const feedback = layer.addFeedback({
			childId: "c1",
			episodeId: episode.id,
			agentId: "educator",
			rating: 5,
		});
		await layer.flush();
		expect(fake.records.episodes.has(episode.id)).toBe(true);
		expect(fake.records.feedback.has(feedback.id)).toBe(true);
		expect(layer.deleteEpisode(episode.id)).toBe(true);
		expect(layer.deleteFeedback(feedback.id)).toBe(true);
		await layer.flush();
		expect(fake.records.episodes.has(episode.id)).toBe(false);
		expect(fake.records.feedback.has(feedback.id)).toBe(false);
	});

	it("builds a visible snapshot for sync queue and feedback analytics", async () => {
		const fake = createFakeBackend();
		const layer = new IndexedDbMemoryLayer({
			backend: fake.backend,
			dbName: "snapshot",
		});
		await layer.ready();
		layer.upsertChild({
			id: "c1",
			name: "Alice",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		layer.addFact("c1", "preference", "food", "apple");
		layer.addFeedback({
			childId: "c1",
			episodeId: "s1",
			agentId: "educator",
			rating: 5,
		});
		const snapshot = buildWebConvergenceSnapshot(layer);
		expect(snapshot.sync.status).toBe("pending");
		expect(snapshot.sync.unsynced).toBeGreaterThanOrEqual(3);
		expect(snapshot.sync.byTable.children).toBe(1);
		expect(snapshot.feedback[0]).toMatchObject({
			agentId: "educator",
			likes: 1,
			avgRating: 5,
		});
		expect(snapshot.memory.children).toBe(1);
	});

	it("builds snapshot from the minimal memory interface when helpers are absent", () => {
		const deltas = [
			{
				id: 1,
				tableName: "children",
				rowId: "c1",
				op: "upsert" as const,
				payload: {},
				syncedAt: null,
				createdAt: "2026-01-01T00:00:00.000Z",
			},
		];
		const snapshot = buildWebConvergenceSnapshot({
			listChildren: () => [
				{
					id: "c1",
					name: "C1",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
			],
			getDeltaStats: () => ({
				total: 1,
				unsynced: 1,
				byTable: { children: 1 },
				byOp: { upsert: 1 },
			}),
			getUnsyncedDeltas: () => deltas,
		} as never);
		expect(snapshot.memory).toMatchObject({
			children: 1,
			facts: 0,
			episodes: 0,
			sessions: 0,
			feedback: 0,
			unsyncedDeltas: 1,
		});
		expect(snapshot.sync).toMatchObject({
			total: 1,
			unsynced: 1,
			status: "pending",
			byTable: { children: 1 },
		});
		expect(snapshot.feedback).toEqual([]);
	});

	it("builds fallback snapshot with optional list helpers and synced queue", () => {
		const snapshot = buildWebConvergenceSnapshot({
			listChildren: () => [],
			listFacts: () => [
				{
					id: "f1",
					childId: "c1",
					category: "preference",
					key: "toy",
					value: {},
					createdAt: "2026-01-01T00:00:00.000Z",
				},
			],
			listEpisodes: () => [
				{
					id: "e1",
					childId: "c1",
					type: "qa",
					content: {},
					createdAt: "2026-01-01T00:00:00.000Z",
				},
			],
			listFeedback: () => [
				{
					id: "fb1",
					childId: "c1",
					episodeId: "e1",
					agentId: "educator",
					rating: 3,
					createdAt: "2026-01-01T00:00:00.000Z",
				},
			],
			getDeltaStats: () => ({
				total: 1,
				unsynced: 0,
				byTable: { children: 1 },
				byOp: { upsert: 1 },
			}),
			getUnsyncedDeltas: () => [],
		} as never);
		expect(snapshot.memory).toMatchObject({
			children: 0,
			facts: 1,
			episodes: 1,
			feedback: 1,
			unsyncedDeltas: 0,
		});
		expect(snapshot.sync.status).toBe("synced");
	});

	it("registers LLM providers with deterministic rule fallback", async () => {
		const fallback = createRuleFallbackProvider("rule-fallback");
		const remote = createWebLlmProvider({
			id: "mock-remote",
			endpoint: "https://llm.example/v1",
			apiKey: "test-key",
		});
		const registry = registerWebLlmProviders([remote, fallback]);
		expect(registry.status.primaryProviderId).toBe("mock-remote");
		expect(registry.status.fallbackProviderId).toBe("rule-fallback");
		expect(registry.status.ready).toBe(true);
		const reply = await registry.complete("pediatrician", "宝宝发烧怎么办");
		expect(reply.providerId).toBe("mock-remote");
		expect(reply.usedFallback).toBe(false);
		expect(reply.content).toContain("mock-remote");
	});

	it("falls back to rules when the configured LLM provider is not ready", async () => {
		const fallback = createRuleFallbackProvider("rule-fallback");
		const notReady = createWebLlmProvider({
			id: "missing-key",
			endpoint: "https://llm.example/v1",
		});
		const registry = registerWebLlmProviders([notReady, fallback]);
		const reply = await registry.complete(
			"safety-guard",
			"孩子误食药物怎么办",
		);
		expect(reply.providerId).toBe("rule-fallback");
		expect(reply.usedFallback).toBe(true);
		expect(registry.status.ready).toBe(false);
	});

	it("registers only the deterministic fallback when no primary provider is supplied", async () => {
		const registry = registerWebLlmProviders([]);
		expect(registry.status.primaryProviderId).toBeNull();
		expect(registry.status.fallbackProviderId).toBe("rule-fallback");
		const reply = await registry.complete("educator", "如何陪伴阅读");
		expect(reply.providerId).toBe("rule-fallback");
		expect(reply.usedFallback).toBe(true);
	});

	it("reports the add child to ask to feedback to memory-dashboard e2e path", () => {
		const report = buildE2eMainPathReport({
			children: 1,
			messages: 2,
			feedback: 1,
			memoryVisible: true,
			syncVisible: true,
			llmFallbackReady: true,
		});
		expect(report.ready).toBe(true);
		expect(report.steps.map((step) => step.id)).toEqual([
			"add-child",
			"ask-question",
			"record-feedback",
			"memory-dashboard",
			"sync-queue",
			"llm-fallback",
		]);
		expect(report.steps.every((step) => step.ok)).toBe(true);
	});
});

describe("createOpenAICompatibleProvider", () => {
	const openAiReply = (content: string) => ({
		choices: [{ message: { content } }],
	});

	it("posts to /chat/completions and reads choices[0].message.content", async () => {
		const calls: Array<{ url: string; body: unknown }> = [];
		const fetcher = (async (
			input: string | URL,
			init?: { method?: string; headers?: Record<string, string>; body?: string },
		) => {
			calls.push({
				url: String(input),
				body: JSON.parse(init?.body ?? "{}"),
			});
			return {
				status: 200,
				text: async () => JSON.stringify(openAiReply("来自 OpenAI 的回答")),
			};
		}) as unknown as Parameters<typeof createOpenAICompatibleProvider>[0]["fetcher"];
		const provider = createOpenAICompatibleProvider({
			id: "test-openai",
			endpoint: "https://llm.example/v1",
			apiKey: "sk-test",
			model: "gpt-x",
			systemPrompt: "You are helpful.",
			fetcher,
		});
		expect(provider.ready).toBe(true);
		const reply = await provider.complete("pediatrician", "宝宝发烧");
		expect(reply).toBe("来自 OpenAI 的回答");
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe("https://llm.example/v1/chat/completions");
		const body = calls[0]?.body as {
			model: string;
			messages: Array<{ role: string; content: string }>;
		};
		expect(body.model).toBe("gpt-x");
		expect(body.messages[0]?.role).toBe("system");
		expect(body.messages[1]?.content).toBe("宝宝发烧");
	});

	it("returns empty string on 4xx errors (caller can fall back)", async () => {
		const fetcher = (async () => ({
			status: 401,
			text: async () => JSON.stringify({ error: "invalid api key" }),
		})) as unknown as Parameters<typeof createOpenAICompatibleProvider>[0]["fetcher"];
		const provider = createOpenAICompatibleProvider({
			id: "test-openai",
			endpoint: "https://llm.example/v1",
			apiKey: "sk-bad",
			model: "gpt-x",
			fetcher,
		});
		expect(await provider.complete("pediatrician", "hi")).toBe("");
	});

	it("returns empty string when the response body is not JSON", async () => {
		const fetcher = (async () => ({
			status: 200,
			text: async () => "<html>oops</html>",
		})) as unknown as Parameters<typeof createOpenAICompatibleProvider>[0]["fetcher"];
		const provider = createOpenAICompatibleProvider({
			id: "test-openai",
			endpoint: "https://llm.example/v1",
			apiKey: "sk-test",
			model: "gpt-x",
			fetcher,
		});
		expect(await provider.complete("pediatrician", "hi")).toBe("");
	});

	it("returns empty string when the fetcher throws (network error)", async () => {
		const fetcher = (async () => {
			throw new Error("ECONNREFUSED");
		}) as unknown as Parameters<typeof createOpenAICompatibleProvider>[0]["fetcher"];
		const provider = createOpenAICompatibleProvider({
			id: "test-openai",
			endpoint: "https://llm.example/v1",
			apiKey: "sk-test",
			model: "gpt-x",
			fetcher,
		});
		expect(await provider.complete("pediatrician", "hi")).toBe("");
	});

	it("reports ready: false when the api key is missing", () => {
		const provider = createOpenAICompatibleProvider({
			id: "test-openai",
			endpoint: "https://llm.example/v1",
			model: "gpt-x",
		});
		expect(provider.ready).toBe(false);
	});

	it("returns empty string when no api key is set even after construction", async () => {
		const fetcher = (async () => {
			throw new Error("should not be called");
		}) as unknown as Parameters<typeof createOpenAICompatibleProvider>[0]["fetcher"];
		const provider = createOpenAICompatibleProvider({
			id: "test-openai",
			endpoint: "https://llm.example/v1",
			model: "gpt-x",
			fetcher,
		});
		expect(await provider.complete("pediatrician", "hi")).toBe("");
	});
});

describe("createAnthropicCompatibleProvider", () => {
	const anthropicReply = (text: string) => ({
		content: [{ type: "text", text }],
	});

	it("posts to /messages and reads content[0].text", async () => {
		const calls: Array<{ url: string; body: unknown; headers: Record<string, string> }> = [];
		const fetcher = (async (
			input: string | URL,
			init?: { method?: string; headers?: Record<string, string>; body?: string },
		) => {
			calls.push({
				url: String(input),
				body: JSON.parse(init?.body ?? "{}"),
				headers: (init?.headers ?? {}) as Record<string, string>,
			});
			return {
				status: 200,
				text: async () => JSON.stringify(anthropicReply("minimax-m3 的回答")),
			};
		}) as unknown as Parameters<typeof createAnthropicCompatibleProvider>[0]["fetcher"];
		const provider = createAnthropicCompatibleProvider({
			id: "minimax-m3",
			endpoint: "https://api.minimaxi.com/v1",
			apiKey: "minimax-key",
			model: "MiniMax-M3",
			fetcher,
		});
		expect(provider.ready).toBe(true);
		const reply = await provider.complete("pediatrician", "宝宝发烧");
		expect(reply).toBe("minimax-m3 的回答");
		expect(calls[0]?.url).toBe("https://api.minimaxi.com/v1/messages");
		expect(calls[0]?.headers["x-api-key"]).toBe("minimax-key");
		expect(calls[0]?.headers["anthropic-version"]).toBe("2023-06-01");
		const body = calls[0]?.body as {
			model: string;
			messages: Array<{ role: string; content: string }>;
		};
		expect(body.model).toBe("MiniMax-M3");
		expect(body.messages[0]?.role).toBe("user");
	});

	it("returns empty string on 4xx", async () => {
		const fetcher = (async () => ({
			status: 429,
			text: async () => JSON.stringify({ error: "rate limit" }),
		})) as unknown as Parameters<typeof createAnthropicCompatibleProvider>[0]["fetcher"];
		const provider = createAnthropicCompatibleProvider({
			id: "minimax-m3",
			endpoint: "https://api.minimaxi.com/v1",
			apiKey: "minimax-key",
			model: "MiniMax-M3",
			fetcher,
		});
		expect(await provider.complete("pediatrician", "hi")).toBe("");
	});
});

describe("createMinimaxM3Provider", () => {
	it("defaults to MiniMax-M3 model and the minimaxi.com endpoint", () => {
		const provider = createMinimaxM3Provider({ apiKey: "minimax-key" });
		expect(provider.id).toBe("minimax-m3");
		expect(provider.ready).toBe(true);
	});

	it("sends an Anthropic-format request with the parenting system prompt", async () => {
		const calls: Array<{ url: string; body: unknown }> = [];
		const fetcher = (async (
			input: string | URL,
			init?: { method?: string; headers?: Record<string, string>; body?: string },
		) => {
			calls.push({
				url: String(input),
				body: JSON.parse(init?.body ?? "{}"),
			});
			return {
				status: 200,
				text: async () =>
					JSON.stringify({
						content: [{ type: "text", text: "minimax-m3 测试回答" }],
					}),
			};
		}) as unknown as Parameters<typeof createMinimaxM3Provider>[0]["fetcher"];
		const provider = createMinimaxM3Provider({
			apiKey: "minimax-key",
			fetcher,
		});
		const reply = await provider.complete("pediatrician", "宝宝发烧");
		expect(reply).toBe("minimax-m3 测试回答");
		expect(calls[0]?.url).toContain("/v1/messages");
		const body = calls[0]?.body as { system: string };
		expect(body.system).toContain("育儿助手");
	});

	it("reports ready: false when MINIMAX_CN_API_KEY is missing", () => {
		// explicitly do not pass apiKey
		const provider = createMinimaxM3Provider({});
		expect(provider.ready).toBe(false);
	});
});

describe("createXiaomiMiMoProvider", () => {
	it("defaults to xiaomi-mimo id and the xiaomimimo endpoint", () => {
		const provider = createXiaomiMiMoProvider({ apiKey: "xiaomi-key" });
		expect(provider.id).toBe("xiaomi-mimo");
		expect(provider.ready).toBe(true);
	});

	it("posts to /chat/completions (OpenAI-compatible)", async () => {
		const calls: Array<{ url: string }> = [];
		const fetcher = (async (input: string | URL) => {
			calls.push({ url: String(input) });
			return {
				status: 200,
				text: async () =>
					JSON.stringify({
						choices: [{ message: { content: "xiaomi 回答" } }],
					}),
			};
		}) as unknown as Parameters<typeof createXiaomiMiMoProvider>[0]["fetcher"];
		const provider = createXiaomiMiMoProvider({
			apiKey: "xiaomi-key",
			fetcher,
		});
		expect(await provider.complete("pediatrician", "宝宝发烧")).toBe(
			"xiaomi 回答",
		);
		expect(calls[0]?.url).toContain("/v1/chat/completions");
	});
});

describe("buildRealLlmProviderChain", () => {
	it("skips tiers without an api key", () => {
		const chain = buildRealLlmProviderChain({
			minimax: {}, // no api key
			xiaomi: {}, // no api key
		});
		expect(chain.status.primaryProviderId).toBeNull();
		expect(chain.status.fallbackProviderId).toBe("rule-fallback");
	});

	it("uses minimax-m3 as primary when its key is available", () => {
		const chain = buildRealLlmProviderChain({
			minimax: { apiKey: "minimax-key" },
			xiaomi: { apiKey: "xiaomi-key" },
		});
		expect(chain.status.primaryProviderId).toBe("minimax-m3");
		expect(chain.status.fallbackProviderId).toBe("rule-fallback");
		expect(chain.status.ready).toBe(true);
	});

	it("falls back to xiaomi when minimax is not configured", () => {
		const chain = buildRealLlmProviderChain({
			minimax: {}, // no key
			xiaomi: { apiKey: "xiaomi-key" },
		});
		expect(chain.status.primaryProviderId).toBe("xiaomi-mimo");
	});

	it("complete() always returns the rule-fallback content when no key is set", async () => {
		const chain = buildRealLlmProviderChain({
			minimax: {},
			xiaomi: {},
		});
		const reply = await chain.complete("pediatrician", "宝宝发烧");
		expect(reply.providerId).toBe("rule-fallback");
		expect(reply.usedFallback).toBe(true);
		expect(reply.content).toContain("rule-based fallback");
	});

	it("automatic fallback to next tier when primary returns empty content (4xx / network)", async () => {
		// Primary (minimax) returns "" (auth failure, no content).
		// Chain should fall through to xiaomi (secondary).
		const fetcher = (async () => ({
			status: 401,
			text: async () => JSON.stringify({ error: "invalid api key" }),
		})) as unknown as Parameters<typeof createMinimaxM3Provider>[0]["fetcher"];
		const chain = buildRealLlmProviderChain({
			minimax: { apiKey: "minimax-bad", fetcher },
			xiaomi: { apiKey: "xiaomi-good" },
		});
		const reply = await chain.complete("pediatrician", "宝宝发烧");
		// Chain tried minimax (empty), fell back to xiaomi (ready+no fetcher → rule-fallback stub).
		// Either way usedFallback must be true (since minimax did not return real content).
		expect(reply.usedFallback).toBe(true);
		expect(reply.providerId).not.toBe("minimax-m3");
	});

	it("records the tried-providers chain in the completion", async () => {
		const fetcher = (async () => ({
			status: 401,
			text: async () => JSON.stringify({ error: "x" }),
		})) as unknown as Parameters<typeof createMinimaxM3Provider>[0]["fetcher"];
		const chain = buildRealLlmProviderChain({
			minimax: { apiKey: "k", fetcher },
			xiaomi: { apiKey: "k" },
		});
		const reply = await chain.complete("pediatrician", "宝宝发烧");
		// tried array lists every provider that was attempted before
		// the final one (which is reported in providerId).
		expect(Array.isArray(reply.triedProviderIds)).toBe(true);
		expect(reply.triedProviderIds).toContain("minimax-m3");
	});
});

describe("readEnv", () => {
	it("returns undefined when the env var is missing", () => {
		expect(readEnv("__PARENTING_TEST_DEFINITELY_MISSING__")).toBeUndefined();
	});
});
