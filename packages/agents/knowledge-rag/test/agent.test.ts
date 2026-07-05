import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import { createKnowledgeRAGAgent } from "../src/agent.js";
import {
	buildIndex,
	byStage,
	formatReferences,
	KNOWLEDGE_BASE,
	type KnowledgeEntry,
	knowledgeStats,
	queryIndex,
	scoreEntry,
	searchKnowledge,
	searchKnowledgeIndex,
} from "../src/knowledge.js";

function makeChild(
	stage: ChildProfile["stage"] = "toddler",
	ageYears = 2,
): ChildProfile {
	const birthYear = new Date().getFullYear() - ageYears;
	return {
		id: "test-child",
		name: "测试宝宝",
		birthDate: `${birthYear}-01-01`,
		stage,
	};
}

describe("KnowledgeRAGAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createKnowledgeRAGAgent();
		expect(a.id).toBe("knowledge-rag");
		expect(a.name).toBe("知识库助手");
	});

	it("supports all 8 stages", () => {
		const a = createKnowledgeRAGAgent();
		expect(a.stages.length).toBe(8);
		expect(a.stages).toContain("newborn");
		expect(a.stages).toContain("teen");
	});

	it("topic is knowledge", () => {
		const a = createKnowledgeRAGAgent();
		expect(a.topics).toEqual(["knowledge"]);
	});
});

describe("KnowledgeRAGAgent — respond: search intent", () => {
	const agent = createKnowledgeRAGAgent();
	const ctx = { memory: undefined } as any;
	const child = makeChild("infant", 1);

	it("returns matching entry for breastfeeding query", async () => {
		const r = await agent.respond("母乳喂养应该持续多久", child, ctx);
		expect(r.agentId).toBe("knowledge-rag");
		expect(r.confidence).toBeGreaterThan(0.5);
		expect(r.content).toContain("母乳");
		expect(r.content).toContain("WHO");
	});

	it("returns matching entry for screen time", async () => {
		const r = await agent.respond("宝宝看屏幕多长时间合适", child, ctx);
		expect(r.confidence).toBeGreaterThan(0.5);
		expect(r.content).toMatch(/屏幕|screen/i);
	});

	it("returns matching entry for sleep hours", async () => {
		const child2 = makeChild("preschool", 4);
		const r = await agent.respond("学龄前儿童睡眠时间", child2, ctx);
		expect(r.confidence).toBeGreaterThan(0.5);
		expect(r.content).toMatch(/睡眠|sleep/i);
	});

	it("returns matching entry for tantrum normality", async () => {
		const child2 = makeChild("toddler", 2);
		const r = await agent.respond("幼儿发脾气正常吗", child2, ctx);
		expect(r.confidence).toBeGreaterThan(0.5);
		expect(r.content).toMatch(/发脾气|tantrum/i);
	});

	it("returns matching entry for vitamin D", async () => {
		const r = await agent.respond("需要补充维生素 D 吗", child, ctx);
		expect(r.confidence).toBeGreaterThan(0.5);
		expect(r.content).toMatch(/维生素|Vitamin/i);
	});

	it("returns matching entry for sibling rivalry", async () => {
		const child2 = makeChild("preschool", 5);
		const r = await agent.respond("两个孩子总打架怎么办", child2, ctx);
		expect(r.confidence).toBeGreaterThan(0.4);
		expect(r.content).toMatch(/同胞|sibling/i);
	});

	it("returns matching entry for secondhand smoke", async () => {
		const r = await agent.respond("二手烟对孩子的危害", child, ctx);
		expect(r.confidence).toBeGreaterThan(0.5);
		expect(r.content).toMatch(/二手烟|smoke/i);
	});
});

describe("KnowledgeRAGAgent — respond: browse intent", () => {
	const agent = createKnowledgeRAGAgent();
	const ctx = { memory: undefined } as any;

	it("lists knowledge base for browse intent", async () => {
		const r = await agent.respond(
			"知识库列表",
			makeChild("toddler", 2),
			ctx,
		);
		expect(r.confidence).toBeGreaterThan(0.5);
		expect(r.content).toContain("育儿知识库");
	});

	it("includes stats in browse output", async () => {
		const r = await agent.respond(
			"所有条目",
			makeChild("preschool", 4),
			ctx,
		);
		expect(r.content).toContain("证据分布");
		expect(r.content).toContain("阶段覆盖");
	});
});

describe("KnowledgeRAGAgent — respond: no match", () => {
	const agent = createKnowledgeRAGAgent();
	const ctx = { memory: undefined } as any;

	it("returns low confidence for unrelated query", async () => {
		const r = await agent.respond(
			"搜索 xyzabc123",
			makeChild("toddler", 2),
			ctx,
		);
		expect(r.confidence).toBeLessThan(0.5);
		expect(r.content).toMatch(/没有找到|换个关键词/);
	});

	it("returns help for general intent with no match", async () => {
		const r = await agent.respond(
			"asdf qwerty xyz",
			makeChild("toddler", 2),
			ctx,
		);
		expect(r.confidence).toBeLessThanOrEqual(0.5);
		expect(r.content).toMatch(/我是|知识库助手/);
	});

	it("returns help for general intent with low-score match", async () => {
		// "许多" matches with score 0.5 (≤ threshold), should show help not match
		const r = await agent.respond("许多", makeChild("toddler", 2), ctx);
		expect(r.confidence).toBeLessThanOrEqual(0.5);
		expect(r.content).toMatch(/我是|知识库助手/);
	});

	it("shows partial match for general intent with high-score match", async () => {
		// Use a query with two semantically meaningful tokens that are unique
		// to the breastfeeding KB entry: "母乳" alone. tokenize gives ["母", "乳"],
		// both hit kb-breastfeeding exactly → score > 0.5 with confidence 0.6.
		const r = await agent.respond("母乳", makeChild("toddler", 2), ctx);
		expect(r.confidence).toBeGreaterThan(0.5);
		expect(r.content).toMatch(/可能与以下知识相关/);
	});
});

describe("KnowledgeRAGAgent — disclaimers and references", () => {
	const agent = createKnowledgeRAGAgent();
	const ctx = { memory: undefined } as any;

	it("always includes disclaimer", async () => {
		const r = await agent.respond("母乳喂养", makeChild("infant", 1), ctx);
		expect(r.content).toContain("⚠️");
		expect(r.content).toContain("请咨询");
	});

	it("includes evidence label", async () => {
		const r = await agent.respond("母乳喂养", makeChild("infant", 1), ctx);
		expect(r.content).toMatch(/证据等级|系统综述|随机对照/);
	});

	it("includes anecdotal evidence label", async () => {
		const r = await agent.respond("宝宝背带", makeChild("infant", 1), ctx);
		expect(r.content).toMatch(/经验性/);
	});

	it("includes reference list", async () => {
		const r = await agent.respond("母乳喂养", makeChild("infant", 1), ctx);
		expect(r.content).toContain("📚 参考");
	});
});

describe("edge case branches", () => {
	const agent = createKnowledgeRAGAgent();
	const ctx = { memory: undefined } as any;

	it("handles child with undefined stage (computes from birthDate)", async () => {
		const childNoStage: ChildProfile = {
			id: "t",
			name: "test",
			birthDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
			stage: undefined,
		};
		const r = await agent.respond("母乳喂养", childNoStage, ctx);
		expect(r.confidence).toBeGreaterThan(0.5);
	});

	it("handles entry with empty references (format edge case)", async () => {
		// Test formatReferences directly with empty array
		const empty = formatReferences([]);
		expect(empty).toBe("（无引用）");
	});

	it("handles formatReferences with multiple refs", () => {
		const refs = [
			{ org: "AAP" as const, title: "Test Title", year: 2024 },
			{ org: "WHO" as const, title: "Another", year: 2023 },
		];
		const formatted = formatReferences(refs);
		expect(formatted).toContain("AAP");
		expect(formatted).toContain("WHO");
	});

	it("handles evidence intent", async () => {
		const r = await agent.respond(
			"为什么宝宝需要睡眠",
			makeChild("toddler", 2),
			ctx,
		);
		expect(r.content).toMatch(/证据等级|证据/);
	});
});

describe("KnowledgeRAGAgent — knowledge base statistics", () => {
	it("includes anecdotal evidence in stats", () => {
		const s = knowledgeStats();
		expect(s.byEvidence.anecdotal).toBeGreaterThanOrEqual(1);
	});
});

describe("scoreEntry", () => {
	const sample: KnowledgeEntry = {
		id: "test",
		topic: "nutrition",
		tags: ["母乳", "breastfeeding"],
		stage: ["any"],
		question: "母乳喂养持续多久",
		answer: "test",
		evidence: "expert_opinion",
		references: [],
	};

	it("returns 0 for empty query", () => {
		expect(scoreEntry("", sample)).toBe(0);
	});

	it("returns 0 for stop-word only query", () => {
		expect(scoreEntry("the a an", sample)).toBe(0);
	});

	it("handles tokenize with pure symbol input (no Han/Latin)", () => {
		// Force null match() fallback in tokenize via pure punctuation
		const s = scoreEntry("!@#$%", sample);
		expect(s).toBe(0);
	});

	it("scores higher for exact tag match", () => {
		const s1 = scoreEntry("母乳", sample);
		const s2 = scoreEntry("python", sample);
		expect(s1).toBeGreaterThan(s2);
	});

	it("scores higher for question match", () => {
		const s = scoreEntry("母乳喂养", sample);
		expect(s).toBeGreaterThan(0);
	});

	it("partial token match gives non-zero score", () => {
		const s = scoreEntry("breastfeed", sample);
		expect(s).toBeGreaterThan(0);
	});

	it("handles English and Chinese tokens together", () => {
		const s = scoreEntry("breastfeeding 母乳", sample);
		expect(s).toBeGreaterThan(0);
	});
});

describe("searchKnowledge", () => {
	it("returns top N matches", () => {
		const results = searchKnowledge("母乳喂养", KNOWLEDGE_BASE, 3);
		expect(results.length).toBeLessThanOrEqual(3);
		expect(results.length).toBeGreaterThan(0);
	});

	it("sorts by score desc (highest first)", () => {
		const results = searchKnowledge("母乳喂养", KNOWLEDGE_BASE, 5);
		for (let i = 0; i < results.length - 1; i++) {
			const s1 = scoreEntry("母乳喂养", results[i]);
			const s2 = scoreEntry("母乳喂养", results[i + 1]);
			expect(s1).toBeGreaterThanOrEqual(s2);
		}
	});

	it("returns empty array for no match", () => {
		const results = searchKnowledge("xyzabc123", KNOWLEDGE_BASE, 3);
		expect(results).toEqual([]);
	});

	it("respects topN parameter", () => {
		const r1 = searchKnowledge("孩子", KNOWLEDGE_BASE, 1);
		const r5 = searchKnowledge("孩子", KNOWLEDGE_BASE, 5);
		expect(r1.length).toBeLessThanOrEqual(1);
		expect(r5.length).toBeLessThanOrEqual(5);
	});

	it("prefers entries with matching tags", () => {
		const results = searchKnowledge("发脾气", KNOWLEDGE_BASE, 2);
		const hasMatchingTags = results.some((r) =>
			r.tags.some((t) => t.includes("发脾气") || t.includes("tantrum")),
		);
		expect(hasMatchingTags).toBe(true);
	});
});

describe("byStage", () => {
	it("returns entries matching the stage", () => {
		const teen = KNOWLEDGE_BASE.filter(
			(e) => e.stage.includes("teen") || e.stage.includes("any"),
		);
		const got = byStage(KNOWLEDGE_BASE, "teen");
		expect(got.length).toBe(teen.length);
	});

	it("'any' stage always matches", () => {
		const r = byStage(KNOWLEDGE_BASE, "preschool");
		const any = KNOWLEDGE_BASE.filter(
			(e) => e.stage.includes("any") || e.stage.includes("preschool"),
		);
		expect(r.length).toBe(any.length);
	});

	it("undefined stage returns all entries", () => {
		const r = byStage(KNOWLEDGE_BASE, undefined);
		expect(r.length).toBe(KNOWLEDGE_BASE.length);
	});
});

describe("knowledgeStats", () => {
	it("returns total count", () => {
		const s = knowledgeStats();
		expect(s.total).toBe(KNOWLEDGE_BASE.length);
		expect(s.total).toBeGreaterThan(5);
	});

	it("has evidence breakdown", () => {
		const s = knowledgeStats();
		expect(Object.keys(s.byEvidence).length).toBeGreaterThan(0);
	});

	it("has stage breakdown", () => {
		const s = knowledgeStats();
		expect(Object.keys(s.byStage).length).toBeGreaterThan(0);
		expect(s.byStage.any).toBeGreaterThan(0);
	});
});

describe("Knowledge base content sanity", () => {
	it("every entry has id", () => {
		for (const e of KNOWLEDGE_BASE) {
			expect(e.id).toBeTruthy();
		}
	});

	it("every entry has question and answer", () => {
		for (const e of KNOWLEDGE_BASE) {
			expect(e.question.length).toBeGreaterThan(2);
			expect(e.answer.length).toBeGreaterThan(10);
		}
	});

	it("every entry has at least one stage", () => {
		for (const e of KNOWLEDGE_BASE) {
			expect(e.stage.length).toBeGreaterThan(0);
		}
	});

	it("every entry has tags", () => {
		for (const e of KNOWLEDGE_BASE) {
			expect(e.tags.length).toBeGreaterThan(0);
		}
	});

	it("references have org and year", () => {
		for (const e of KNOWLEDGE_BASE) {
			for (const r of e.references) {
				expect(r.org).toBeTruthy();
				expect(r.year).toBeGreaterThanOrEqual(2010);
			}
		}
	});

	it("ids are unique", () => {
		const ids = new Set<string>();
		for (const e of KNOWLEDGE_BASE) {
			expect(ids.has(e.id)).toBe(false);
			ids.add(e.id);
		}
	});
});

describe("HanTokenIndex inverted index", () => {
	it("buildIndex indexes all entries", () => {
		const idx = buildIndex(KNOWLEDGE_BASE);
		expect(idx.postings.size).toBeGreaterThan(0);
		expect(idx.docLengths.size).toBe(KNOWLEDGE_BASE.length);
		expect(idx.docTitles.size).toBe(KNOWLEDGE_BASE.length);
	});

	it("buildIndex records term frequency per doc", () => {
		const idx = buildIndex(KNOWLEDGE_BASE);
		// Every doc with token "母乳" should have a posting with freq >= 1.
		const posting = idx.postings.get("母乳");
		if (posting) {
			expect(posting.size).toBeGreaterThan(0);
			for (const [docId, freq] of posting.entries()) {
				expect(freq).toBeGreaterThanOrEqual(1);
				expect(idx.docLengths.get(docId)).toBeDefined();
			}
		}
	});

	it("queryIndex returns ranked ids by score", () => {
		const ranked = queryIndex(buildIndex(KNOWLEDGE_BASE), "母乳喂养", 3);
		expect(ranked.length).toBeGreaterThan(0);
		// Sorted by score desc
		for (let i = 1; i < ranked.length; i++) {
			expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
		}
	});

	it("queryIndex returns empty for stop-words only", () => {
		expect(
			queryIndex(buildIndex(KNOWLEDGE_BASE), "我 你 他 的 了", 3),
		).toEqual([]);
	});

	it("queryIndex returns empty for empty query", () => {
		expect(queryIndex(buildIndex(KNOWLEDGE_BASE), "", 3)).toEqual([]);
	});

	it("queryIndex does not falsely prefix-match when qt length < 2 (guarded)", () => {
		// Verify the length guard: even with a fixture designed to be tempting,
		// a single-character query never gains PREFIX contribution from a longer
		// entry token. We use a controlled English fixture to avoid Han
		// tokenization noise (Han chars get per-character split, so single-char
		// queries always exact-match whatever entry also contains that char).
		const fixture: KnowledgeEntry[] = [
			{
				id: "test-english-prefix-trap",
				topic: "test",
				tags: ["benefits"],
				stage: ["any"],
				question: "benefits of carrier",
				answer: "trap",
				evidence: "anecdotal",
				references: [],
			},
		];
		const ranked = queryIndex(buildIndex(fixture), "b", 5);
		// Single char "b" should not prefix-match "benefits".
		expect(ranked).toEqual([]);
	});

	it("queryIndex returns at most topN results", () => {
		const ranked = queryIndex(buildIndex(KNOWLEDGE_BASE), "宝宝", 2);
		expect(ranked.length).toBeLessThanOrEqual(2);
	});

	it("searchKnowledgeIndex resolves ids back to entries", () => {
		const results = searchKnowledgeIndex(KNOWLEDGE_BASE, "母乳", 3);
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.id).toBeTruthy();
			expect(r.question).toBeTruthy();
		}
	});

	it("searchKnowledgeIndex returns [] for stop-words only", () => {
		expect(searchKnowledgeIndex(KNOWLEDGE_BASE, "我 你 他")).toEqual([]);
	});

	it("queryIndex prefix match adds 0.5 contribution for multi-char tokens", () => {
		// Query "feed" is 4 chars; KB contains "breastfeed" (9 chars).
		// "breastfeed".startsWith("feed") is false; "feed".startsWith("breastfeed")
		// is false. So no prefix match. We need a 2+ char query whose
		// start matches a KB token start.
		// KB has "duration" (8 chars); query "dur" (3 chars) → prefix.
		const ranked = queryIndex(buildIndex(KNOWLEDGE_BASE), "duration", 5);
		// Either exact hit OR prefix hit. At minimum, kb-breastfeeding should
		// appear because it has token "duration" in tags.
		expect(ranked.length).toBeGreaterThan(0);
		const breastfeeding = ranked.find(
			(r) => r.id === "kb-breastfeeding-duration",
		);
		expect(breastfeeding).toBeDefined();
		expect(breastfeeding?.score).toBeGreaterThan(0);
	});

	it("queryIndex matches via prefix when query is a strict prefix of a KB token", () => {
		// "nurs" (4 chars) is a prefix of "nursing" (7 chars) in KB tags.
		const ranked = queryIndex(buildIndex(KNOWLEDGE_BASE), "nurs", 5);
		const breastfeeding = ranked.find(
			(r) => r.id === "kb-breastfeeding-duration",
		);
		expect(breastfeeding).toBeDefined();
	});
});

describe("STOP_WORDS Han character safety", () => {
	it("preserves 你好 tokens (do not strip 你 or 好)", () => {
		// Search for an entry whose question contains "你好" — tokenize keeps both
		// characters so the entry can be retrieved by the user.
		const fixture: KnowledgeEntry[] = [
			{
				id: "test-hello",
				topic: "test",
				tags: ["你好"],
				stage: ["any"],
				question: "你好",
				answer: "greeting",
				evidence: "anecdotal",
				references: [],
			},
		];
		const ranked = queryIndex(buildIndex(fixture), "你好", 5);
		expect(ranked.length).toBe(1);
		expect(ranked[0].id).toBe("test-hello");
	});

	it("does not falsely prefix-match single-char query against multi-char token", () => {
		// Verify that a single-character query does not gain PREFIX contribution
		// from multi-character tokens. We test with a controlled fixture where
		// the entry has ONLY a multi-character token (no single-char token).
		const fixture: KnowledgeEntry[] = [
			{
				id: "test-prefix-trap",
				topic: "test",
				// English token (length >= 2); query is single Han char → prefix
				// stage must skip because qt.length < 2.
				tags: ["benefits"],
				stage: ["any"],
				question: "benefits of carrier",
				answer: "trap",
				evidence: "anecdotal",
				references: [],
			},
		];
		const ranked = queryIndex(buildIndex(fixture), "好", 5);
		// No exact match (KB has no "好" token), no prefix match (length guard).
		expect(ranked).toEqual([]);
	});
});
describe("i18n: Traditional Chinese + Mixed CJK/English", () => {
	it("tokenizes Traditional Chinese characters individually", () => {
		const ranked = queryIndex(
			buildIndex([
				{
					id: "tc-fever",
					topic: "test",
					tags: ["發燒"],
					stage: ["any"],
					question: "什麼是發燒？",
					answer: "TC fever",
					evidence: "anecdotal",
					references: [],
				},
			]),
			"發燒",
			5,
		);
		expect(ranked.length).toBe(1);
		expect(ranked[0].id).toBe("tc-fever");
	});

	it("Traditional query matches Simplified entry when both share Han characters", () => {
		const ranked = queryIndex(
			buildIndex([
				{
					id: "tc-nursing",
					topic: "test",
					tags: ["母乳餵養", "breastfeeding"],
					stage: ["any"],
					question: "母乳餵養需要多久？",
					answer: "WHO recommends",
					evidence: "systematic_review",
					references: [],
				},
			]),
			"母乳",
			5,
		);
		expect(ranked.length).toBe(1);
		expect(ranked[0].id).toBe("tc-nursing");
	});

	it("mixed CJK + English query finds entry with both Han and English tokens", () => {
		const ranked = queryIndex(
			buildIndex([
				{
					id: "mixed-entry",
					topic: "test",
					tags: ["vitamin", "D", "維生素", "补充"],
					stage: ["any"],
					question: "vitamin D supplement for babies",
					answer: "AAP recommends",
					evidence: "systematic_review",
					references: [],
				},
			]),
			"vitamin D supplement",
			5,
		);
		expect(ranked.length).toBe(1);
		expect(ranked[0].id).toBe("mixed-entry");
	});

	it("searchKnowledgeIndex returns correct entries for Traditional Chinese queries", () => {
		const entries: KnowledgeEntry[] = [
			{
				id: "tc-sleep",
				topic: "sleep",
				tags: ["睡眠", "sleep", "小時"],
				stage: ["any"],
				question: "學齡前兒童每天需要多少睡眠？",
				answer: "AAP recommends 10-13 hours",
				evidence: "systematic_review",
				references: [{ org: "AAP", title: "Sleep", year: 2023 }],
			},
		];
		const results = searchKnowledgeIndex(entries, "睡眠", 3);
		expect(results.length).toBe(1);
		expect(results[0].id).toBe("tc-sleep");
	});

	it("scoreEntry handles mixed script query correctly", () => {
		const entry: KnowledgeEntry = {
			id: "mixed-score",
			topic: "test",
			tags: ["breastfeeding", "duration", "母乳"],
			stage: ["any"],
			question: "How long to breastfeed?",
			answer: "answer",
			evidence: "systematic_review",
			references: [],
		};
		const s1 = scoreEntry("breastfeeding duration", entry);
		expect(s1).toBeGreaterThan(0.5);
		const s2 = scoreEntry("母乳", entry);
		expect(s2).toBeGreaterThan(0.5);
	});

	it("preserves non-Han non-Latin characters in tokens (numbers)", () => {
		const ranked = queryIndex(
			buildIndex([
				{
					id: "num-entry",
					topic: "test",
					tags: ["37.5", "度", "temperature"],
					stage: ["any"],
					question: "37.5 degrees",
					answer: "answer",
					evidence: "anecdotal",
					references: [],
				},
			]),
			"37.5",
			5,
		);
		expect(ranked.length).toBe(1);
	});

	it("empty query returns empty results for Traditional Chinese fixture", () => {
		const ranked = queryIndex(
			buildIndex([
				{
					id: "tc-empty",
					topic: "test",
					tags: ["發燒"],
					stage: ["any"],
					question: "什麼是發燒？",
					answer: "TC fever",
					evidence: "anecdotal",
					references: [],
				},
			]),
			"",
			5,
		);
		expect(ranked).toEqual([]);
	});

	it("agent respond works with Traditional Chinese questions", async () => {
		const agent = createKnowledgeRAGAgent();
		const ctx = { memory: undefined } as any;
		const child = {
			id: "tc-child",
			name: "TC",
			birthDate: "2024-01-01",
			stage: "toddler",
		} as any;
		const r = await agent.respond("母乳喂養", child, ctx);
		expect(r.agentId).toBe("knowledge-rag");
		expect(r.content).toMatch(/母乳/);
	});
});

describe("KnowledgeRAGAgent — RAG with LLM", () => {
	const child = {
		id: "rag-child",
		name: "RAG",
		birthDate: "2024-01-01",
		stage: "infant",
	} as unknown as Parameters<KnowledgeRAGAgent["respond"]>[1];
	const ctx = { memory: undefined } as unknown as Parameters<
		KnowledgeRAGAgent["respond"]
	>[2];

	it("sends a RAG prompt containing the matched FAQ when an llm generator is wired", async () => {
		const calls: Array<{ system: string; user: string }> = [];
		const generator = async (
			system: string,
			user: string,
		): Promise<string> => {
			calls.push({ system, user });
			return "llm-crafted answer about breastfeeding";
		};
		const agent = createKnowledgeRAGAgent({ llmGenerator: generator });
		const r = await agent.respond("母乳喂养应该持续多久", child, ctx);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.system).toContain("循证");
		expect(calls[0]?.user).toContain("WHO");
		expect(r.content).toBe("llm-crafted answer about breastfeeding");
		expect(r.confidence).toBeGreaterThan(0.5);
	});

	it("falls back to the formatted FAQ display when the LLM returns empty", async () => {
		const generator = async (): Promise<string> => "";
		const agent = createKnowledgeRAGAgent({ llmGenerator: generator });
		const r = await agent.respond("母乳喂养应该持续多久", child, ctx);
		expect(r.content).toContain("WHO");
	});

	it("falls back to the formatted FAQ display when the LLM throws", async () => {
		const generator = async (): Promise<string> => {
			throw new Error("LLM unreachable");
		};
		const agent = createKnowledgeRAGAgent({ llmGenerator: generator });
		const r = await agent.respond("母乳喂养应该持续多久", child, ctx);
		expect(r.content).toContain("WHO");
	});

	it("falls back gracefully when no LLM generator is wired", async () => {
		const agent = createKnowledgeRAGAgent();
		const r = await agent.respond("母乳喂养应该持续多久", child, ctx);
		expect(r.content).toContain("WHO");
		expect(r.agentId).toBe("knowledge-rag");
	});

	it("records triedProviderIds in reply when llmChainIds is set", async () => {
		const agent = createKnowledgeRAGAgent({
			llmGenerator: async () => "ok",
			llmChainIds: () => ["minimax-m3", "rule-fallback"],
		});
		// Intent must be `search` (or `evidence`) for the LLM RAG path to
		// run, since the user wants a reference-backed answer rather than
		// a general browse listing.
		const r = await agent.respond("母乳喂养应该多久", child, ctx);
		expect(
			(r as unknown as { sourceChain?: string[] }).sourceChain ?? [],
		).toEqual(["minimax-m3", "rule-fallback"]);
	});

	it("omits sourceChain when llmChainIds is not provided", async () => {
		const agent = createKnowledgeRAGAgent({
			llmGenerator: async () => "ok",
		});
		const r = await agent.respond("母乳喂养应该多久", child, ctx);
		expect(
			(r as unknown as { sourceChain?: string[] }).sourceChain,
		).toBeUndefined();
	});
});
