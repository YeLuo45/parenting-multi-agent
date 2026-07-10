/**
 * Knowledge Provider Chain — abstraction over a tiered list of LLM providers
 * with automatic fallback (minimax-m3 → xiaomi-mimo → rule-fallback).
 *
 * Direction E: LLM RAG Upgrade.
 */

export type ProviderId =
	| "minimax-m3"
	| "xiaomi-mimo"
	| "rule-fallback"
	| string;

export interface ProviderResult {
	providerId: ProviderId;
	content: string;
	latencyMs: number;
}

export interface ProviderCallInput {
	systemPrompt: string;
	userPrompt: string;
}

export interface Provider {
	id: ProviderId;
	invoke(input: ProviderCallInput): Promise<string>;
}

export interface KnowledgeProviderChain {
	providers: Provider[];
	complete(input: ProviderCallInput): Promise<ProviderResult | null>;
	triedProviderIds(): ProviderId[];
}

/** Minimal rule-based fallback: returns a curated summary. */
export class RuleFallbackProvider implements Provider {
	readonly id = "rule-fallback";
	async invoke(_input: ProviderCallInput): Promise<string> {
		return "（本地规则回退：请基于知识库条目回答。LLM 不可用。）";
	}
}

/** Minimal stub for an upstream LLM provider. */
export class StubProvider implements Provider {
	constructor(
		readonly id: ProviderId,
		private readonly latencyMs = 100,
		private readonly body: string | null = null,
		private readonly shouldFail = false,
	) {}
	async invoke(input: ProviderCallInput): Promise<string> {
		await sleep(this.latencyMs);
		if (this.shouldFail) throw new Error(`${this.id} simulated failure`);
		// body === null → use default; body === "" → honor empty (test fallback)
		if (this.body !== null) return this.body;
		return `${this.id} ack: ${input.userPrompt.slice(0, 32)}`;
	}
}

/** Build a provider chain in priority order. */
export function buildKnowledgeProviderChain(
	providers: Provider[],
): KnowledgeProviderChain {
	const tried: ProviderId[] = [];
	return {
		providers,
		async complete(input) {
			for (const p of providers) {
				tried.push(p.id);
				const t0 = Date.now();
				try {
					const text = await p.invoke(input);
					if (text && text.length > 0) {
						return {
							providerId: p.id,
							content: text,
							latencyMs: Date.now() - t0,
						};
					}
				} catch {
					// fall through to next provider
				}
			}
			return null;
		},
		triedProviderIds() {
			return [...tried];
		},
	};
}

/** Default 3-tier chain for parenting RAG. */
export function defaultKnowledgeProviderChain(): KnowledgeProviderChain {
	return buildKnowledgeProviderChain([
		new StubProvider("minimax-m3", 120, "", true),
		new StubProvider("xiaomi-mimo", 90, "", true),
		new RuleFallbackProvider(),
	]);
}

/**
 * Format the provenance header showing which providers were tried on the
 * last successful call. Renders as a small chip-style line.
 */
export function formatProvenance(
	triedIds: readonly ProviderId[],
	chosen: ProviderId | null,
): string {
	if (chosen === null) return "🔌 未命中任何 provider";
	const triedSet = new Set(triedIds);
	const triedList = Array.from(triedSet).join(" → ");
	const badge = chosen === "rule-fallback" ? "📦 本地兜底" : `✨ ${chosen}`;
	return `${badge}（路径：${triedList}）`;
}

/**
 * Generate a RAG-augmented answer by combining knowledge entries with an LLM
 * provider chain. Returns either the provider's text + provenance header,
 * or null if no provider returned a non-empty answer.
 */
export async function generateAnswerWithProvider(
	question: string,
	entries: readonly KnowledgeEntry[],
	stage: string,
	chain: KnowledgeProviderChain,
): Promise<{
	answer: string;
	providerId: ProviderId;
	provenance: string;
} | null> {
	if (entries.length === 0) return null;
	const systemPrompt =
		"你是一位循证医学导向的育儿助手。请基于给出的参考资料用简洁中文回答。";
	const userPrompt = [
		`问题：${question}`,
		`孩子阶段：${stage}`,
		"",
		"参考资料：",
		entries
			.map(
				(m, i) =>
					`[${i + 1}] ${m.question}\n答案：${m.answer}\n来源：${m.references
						.map((r) => `${r.org} ${r.year}`)
						.join(", ")}`,
			)
			.join("\n\n"),
	].join("\n");
	const result = await chain.complete({ systemPrompt, userPrompt });
	if (!result) return null;
	const provenance = formatProvenance(
		chain.triedProviderIds(),
		result.providerId,
	);
	return {
		answer: result.content,
		providerId: result.providerId,
		provenance,
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

// Local imports to keep file self-contained while still using shared types.
import type { KnowledgeEntry } from "./knowledge.js";
