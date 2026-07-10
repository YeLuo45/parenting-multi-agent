import { describe, expect, it } from "vitest";
import {
	buildKnowledgeProviderChain,
	defaultKnowledgeProviderChain,
	formatProvenance,
	generateAnswerWithProvider,
	KNOWLEDGE_BASE,
	type KnowledgeEntry,
	type KnowledgeProviderChain,
	RuleFallbackProvider,
	StubProvider,
} from "../src/index.js";

function makeEntry(): KnowledgeEntry {
	return KNOWLEDGE_BASE[0]!;
}

describe("RuleFallbackProvider", () => {
	it("returns a non-empty curated fallback", async () => {
		const p = new RuleFallbackProvider();
		const out = await p.invoke({
			systemPrompt: "sys",
			userPrompt: "usr",
		});
		expect(out.length).toBeGreaterThan(0);
	});

	it("ignores input payload", async () => {
		const p = new RuleFallbackProvider();
		const a = await p.invoke({ systemPrompt: "A", userPrompt: "X" });
		const b = await p.invoke({ systemPrompt: "B", userPrompt: "Y" });
		expect(a).toBe(b);
	});
});

describe("StubProvider", () => {
	it("returns custom body", async () => {
		const p = new StubProvider("minimax-m3", 10, "hello world");
		expect(await p.invoke({ systemPrompt: "", userPrompt: "" })).toBe(
			"hello world",
		);
	});

	it("uses default body with prefix when no body", async () => {
		const p = new StubProvider("xiaomi-mimo", 5);
		const out = await p.invoke({
			systemPrompt: "",
			userPrompt: "abcdefghij",
		});
		expect(out).toContain("xiaomi-mimo");
		expect(out).toContain("abcdefghij");
	});

	it("throws when shouldFail=true", async () => {
		const p = new StubProvider("minimax-m3", 1, "x", true);
		await expect(
			p.invoke({ systemPrompt: "", userPrompt: "" }),
		).rejects.toThrow();
	});
});

describe("buildKnowledgeProviderChain", () => {
	it("returns first provider result when it succeeds", async () => {
		const chain = buildKnowledgeProviderChain([
			new StubProvider("minimax-m3", 5, "top answer"),
			new StubProvider("xiaomi-mimo", 5, "fallback answer"),
		]);
		const r = await chain.complete({
			systemPrompt: "",
			userPrompt: "test",
		});
		expect(r?.providerId).toBe("minimax-m3");
		expect(r?.content).toBe("top answer");
	});

	it("falls through when first provider throws", async () => {
		const chain = buildKnowledgeProviderChain([
			new StubProvider("minimax-m3", 1, "x", true),
			new StubProvider("xiaomi-mimo", 1, "second"),
		]);
		const r = await chain.complete({
			systemPrompt: "",
			userPrompt: "test",
		});
		expect(r?.providerId).toBe("xiaomi-mimo");
	});

	it("falls through when first provider returns empty content", async () => {
		const chain = buildKnowledgeProviderChain([
			new StubProvider("minimax-m3", 1, ""),
			new StubProvider("xiaomi-mimo", 1, "got it"),
		]);
		const r = await chain.complete({
			systemPrompt: "",
			userPrompt: "test",
		});
		expect(r?.providerId).toBe("xiaomi-mimo");
	});

	it("returns null when all providers fail", async () => {
		const chain = buildKnowledgeProviderChain([
			new StubProvider("minimax-m3", 1, "x", true),
			new StubProvider("xiaomi-mimo", 1, "x", true),
		]);
		const r = await chain.complete({
			systemPrompt: "",
			userPrompt: "test",
		});
		expect(r).toBeNull();
	});

	it("records triedProviderIds in order", async () => {
		const chain = buildKnowledgeProviderChain([
			new StubProvider("a", 1, "first", true),
			new StubProvider("b", 1, "second"),
		]);
		await chain.complete({ systemPrompt: "", userPrompt: "" });
		const ids = chain.triedProviderIds();
		expect(ids).toEqual(["a", "b"]);
	});

	it("records latencyMs", async () => {
		const chain = buildKnowledgeProviderChain([
			new StubProvider("a", 30, "yes"),
		]);
		const r = await chain.complete({ systemPrompt: "", userPrompt: "" });
		expect(r?.latencyMs).toBeGreaterThanOrEqual(0);
	});

	it("empty providers list returns null", async () => {
		const chain = buildKnowledgeProviderChain([]);
		const r = await chain.complete({ systemPrompt: "", userPrompt: "" });
		expect(r).toBeNull();
	});

	it("triedProviderIds resets are observable via new chains", () => {
		const chain = buildKnowledgeProviderChain([
			new StubProvider("a", 1, "ok"),
		]);
		expect(chain.triedProviderIds()).toEqual([]);
	});
});

describe("defaultKnowledgeProviderChain", () => {
	it("falls back to rule-fallback when upper tiers fail", async () => {
		const chain = defaultKnowledgeProviderChain();
		const r = await chain.complete({
			systemPrompt: "",
			userPrompt: "test",
		});
		expect(r?.providerId).toBe("rule-fallback");
	});

	it("exposes 3 providers in priority order", () => {
		const chain = defaultKnowledgeProviderChain();
		expect(chain.providers).toHaveLength(3);
		expect(chain.providers[0]?.id).toBe("minimax-m3");
		expect(chain.providers[1]?.id).toBe("xiaomi-mimo");
		expect(chain.providers[2]?.id).toBe("rule-fallback");
	});
});

describe("formatProvenance", () => {
	it("shows chosen provider with emoji badge", () => {
		const out = formatProvenance(["minimax-m3"], "minimax-m3");
		expect(out).toContain("minimax-m3");
		expect(out).toContain("✨");
	});

	it("shows fallback badge for rule-fallback", () => {
		const out = formatProvenance(
			["minimax-m3", "xiaomi-mimo", "rule-fallback"],
			"rule-fallback",
		);
		expect(out).toContain("📦");
		expect(out).toContain("rule-fallback");
	});

	it("dedupes tried providers in path", () => {
		const out = formatProvenance(
			["minimax-m3", "minimax-m3", "rule-fallback"],
			"rule-fallback",
		);
		const matches = out.match(/minimax-m3/g) || [];
		expect(matches.length).toBe(1);
	});

	it("returns 'no provider' when chosen is null", () => {
		expect(formatProvenance([], null)).toContain("未命中");
	});
});

describe("generateAnswerWithProvider", () => {
	const chain: KnowledgeProviderChain = buildKnowledgeProviderChain([
		new StubProvider("minimax-m3", 5, "LLM 答案: 母乳最好 6 个月"),
	]);

	it("returns answer + provenance for valid inputs", async () => {
		const r = await generateAnswerWithProvider(
			"母乳多久?",
			[makeEntry()],
			"infant",
			chain,
		);
		expect(r).not.toBeNull();
		expect(r?.answer).toContain("母乳");
		expect(r?.providerId).toBe("minimax-m3");
		expect(r?.provenance).toContain("minimax-m3");
	});

	it("returns null when entries is empty", async () => {
		const r = await generateAnswerWithProvider(
			"任何问题",
			[],
			"infant",
			chain,
		);
		expect(r).toBeNull();
	});

	it("falls back when all providers fail", async () => {
		const failing = buildKnowledgeProviderChain([
			new StubProvider("minimax-m3", 1, "x", true),
			new RuleFallbackProvider(),
		]);
		const r = await generateAnswerWithProvider(
			"q",
			[makeEntry()],
			"infant",
			failing,
		);
		expect(r?.providerId).toBe("rule-fallback");
		expect(r?.provenance).toContain("📦");
	});

	it("includes multiple references in user prompt", async () => {
		const entry = makeEntry();
		entry.references.push({
			org: "AAP",
			year: 2022,
			title: "Breastfeeding",
			url: "https://www.aap.org/",
		});
		const r = await generateAnswerWithProvider(
			"q",
			[entry],
			"infant",
			chain,
		);
		expect(r).not.toBeNull();
	});

	it("works with knowledge-base real entry", async () => {
		const entry = KNOWLEDGE_BASE[0];
		if (!entry) throw new Error("expected at least one knowledge entry");
		const r = await generateAnswerWithProvider(
			entry.question,
			[entry],
			"infant",
			chain,
		);
		expect(r).not.toBeNull();
	});

	it("returns null when chain.complete returns null", async () => {
		const failingChain = buildKnowledgeProviderChain([
			new StubProvider("a", 1, "x", true),
			new StubProvider("b", 1, "x", true),
		]);
		const r = await generateAnswerWithProvider(
			"q",
			[makeEntry()],
			"infant",
			failingChain,
		);
		expect(r).toBeNull();
	});
});

describe("provider-chain integration: latency budgets", () => {
	it("default chain falls through fast", async () => {
		const chain = defaultKnowledgeProviderChain();
		const t0 = Date.now();
		await chain.complete({ systemPrompt: "", userPrompt: "" });
		const elapsed = Date.now() - t0;
		expect(elapsed).toBeLessThan(5000);
	});
});
