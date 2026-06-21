/**
 * Tests for TF-IDF vector retrieval layer.
 */
import { describe, expect, it } from "vitest";
import {
	buildTfIdfIndex,
	cosineSimilarity,
	searchByRelevance,
	searchByVector,
	vectorize,
	type KnowledgeEntry,
} from "../src/index.js";

function makeEntry(overrides: Partial<KnowledgeEntry> & Pick<KnowledgeEntry, "id">): KnowledgeEntry {
	return {
		id: overrides.id,
		topic: overrides.topic ?? "test",
		tags: overrides.tags ?? [],
		stage: overrides.stage ?? ["any"],
		question: overrides.question ?? "",
		answer: overrides.answer ?? "",
		evidence: overrides.evidence ?? "anecdotal",
		references: overrides.references ?? [],
	};
}

const BREASTFEEDING: KnowledgeEntry = makeEntry({
	id: "bf",
	question: "How long to breastfeed?",
	topic: "nutrition",
	tags: ["breastfeeding", "nursing", "duration", "母乳", "喂养", "breastfeeding"],
});

const SCREEN: KnowledgeEntry = makeEntry({
	id: "screen",
	question: "Screen time for children?",
	topic: "habits",
	tags: ["screen", "time", "media", "电视", "手机", "tablet"],
});

const SLEEP: KnowledgeEntry = makeEntry({
	id: "sleep",
	question: "How much sleep do children need?",
	topic: "sleep",
	tags: ["sleep", "hours", "bedtime", "睡眠", "小时"],
});

describe("termFrequency", () => {
	it("counts unique terms", () => {
		const idx = buildTfIdfIndex([BREASTFEEDING, SCREEN, SLEEP]);
		expect(idx.idf.size).toBeGreaterThan(0);
	});
});

describe("cosineSimilarity", () => {
	it("returns 0 for empty vectors", () => {
		expect(cosineSimilarity(new Map(), new Map())).toBe(0);
		expect(cosineSimilarity(new Map([["a", 1]]), new Map())).toBe(0);
	});

	it("returns 1 for identical vectors", () => {
		const v = new Map([["a", 1], ["b", 2]]);
		expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
	});

	it("returns 0 for orthogonal vectors", () => {
		const a = new Map([["a", 1]]);
		const b = new Map([["b", 1]]);
		expect(cosineSimilarity(a, b)).toBe(0);
	});

	it("computes non-trivial similarity", () => {
		const a = new Map([["x", 3], ["y", 2]]);
		const b = new Map([["x", 2], ["y", 1], ["z", 0.5]]);
		const sim = cosineSimilarity(a, b);
		expect(sim).toBeGreaterThan(0);
		expect(sim).toBeLessThan(1);
	});

	it("returns 0 when denominator is 0 (zero-magnitude vector)", () => {
		// Two vectors with the same zero-magnitude weight (e.g. all zero weights).
		// We use a Map with 0 values to force magnitude to 0.
		const a = new Map<string, number>();
		const b = new Map<string, number>();
		// Force magnitude 0 by removing all entries (already empty) — covers
		// the early-return branch above. For denom === 0 branch, we use
		// tokens whose entries happen to be removed, leaving an empty vector.
		// Since we cannot easily simulate "denom === 0 with non-empty maps",
		// we assert the empty-vector path returns 0 explicitly:
		expect(cosineSimilarity(a, b)).toBe(0);
		// Same-key zero-weight vectors would have denom=0; assert via removal:
		const z1 = new Map([["x", 0]]);
		const z2 = new Map([["x", 0]]);
		// magA = 0 + 0 = 0, so denom = 0; result should be 0.
		// Note: V8 branch tracking may not see this as covering the ternary
		// since z1.size > 0. The early-return at the top handles size === 0
		// (already covered), so we use the size === 0 path to satisfy branches.
		expect(z1.size).toBeGreaterThan(0); // not the early-return
		// The ternary denom === 0 ? 0 : dot / denom is reached when both
		// vectors have size > 0 but all weights are 0.
		// Compute manually: dot = 0*0 = 0, magA = 0, magB = 0, denom = 0.
		const result = cosineSimilarity(z1, z2);
		expect(result).toBe(0);
	});
});

describe("vectorize", () => {
	it("returns empty vector for empty tokens", () => {
		const idx = buildTfIdfIndex([BREASTFEEDING]);
		expect(vectorize([], idx.idf).size).toBe(0);
	});

	it("skips tokens with non-positive IDF", () => {
		const idx = buildTfIdfIndex([BREASTFEEDING]);
		const v = vectorize(["nonexistent_token_xyz"], idx.idf);
		expect(v.size).toBe(0);
	});

	it("produces weighted vector for matching tokens", () => {
		const idx = buildTfIdfIndex([BREASTFEEDING, SCREEN]);
		const v = vectorize(["breastfeeding", "nursing"], idx.idf);
		expect(v.size).toBeGreaterThan(0);
	});
});

describe("buildTfIdfIndex", () => {
	it("computes docCount from input size", () => {
		const idx = buildTfIdfIndex([BREASTFEEDING, SCREEN]);
		expect(idx.docCount).toBe(2);
	});

	it("handles empty entries", () => {
		const idx = buildTfIdfIndex([]);
		expect(idx.docCount).toBe(0);
		expect(idx.idf.size).toBe(0);
		expect(idx.docVectors.size).toBe(0);
	});

	it("precomputes docVectors for all entries", () => {
		const idx = buildTfIdfIndex([BREASTFEEDING, SCREEN, SLEEP]);
		expect(idx.docVectors.size).toBe(3);
	});

	it("respects smoothing option", () => {
		const a = buildTfIdfIndex([BREASTFEEDING, SCREEN, SLEEP], { smoothing: 0 });
		const b = buildTfIdfIndex([BREASTFEEDING, SCREEN, SLEEP], { smoothing: 5 });
		// Different smoothing affects IDF values.
		const idfA = a.idf.get("breastfeeding") ?? 0;
		const idfB = b.idf.get("breastfeeding") ?? 0;
		expect(idfA).not.toBe(idfB);
	});
});

describe("searchByVector", () => {
	const entries = [BREASTFEEDING, SCREEN, SLEEP];

	it("returns empty for empty entries", () => {
		expect(searchByVector([], "anything")).toEqual([]);
	});

	it("returns empty for empty query", () => {
		expect(searchByVector(entries, "")).toEqual([]);
	});

	it("returns empty for query with no tokens", () => {
		expect(searchByVector(entries, "  ")).toEqual([]);
	});

	it("ranks the most relevant entry first", () => {
		const ranked = searchByVector(entries, "breastfeeding duration", 3);
		expect(ranked.length).toBeGreaterThan(0);
		expect(ranked[0].entry.id).toBe("bf");
		expect(ranked[0].score).toBeGreaterThan(0);
	});

	it("respects topN limit", () => {
		const ranked = searchByVector(entries, "sleep children", 1);
		expect(ranked.length).toBe(1);
	});

	it("returns results sorted by descending score", () => {
		const ranked = searchByVector(entries, "children sleep screen time", 3);
		for (let i = 1; i < ranked.length; i++) {
			expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
		}
	});

	it("handles Han script queries", () => {
		const ranked = searchByVector(entries, "母乳喂养", 3);
		expect(ranked[0].entry.id).toBe("bf");
	});

	it("handles mixed CJK + English", () => {
		const ranked = searchByVector(entries, "breastfeeding 母乳", 3);
		expect(ranked[0].entry.id).toBe("bf");
	});
});

describe("searchByRelevance", () => {
	const entries = [BREASTFEEDING, SCREEN, SLEEP];

	it("returns empty for empty entries", () => {
		expect(searchByRelevance([], "q")).toEqual([]);
	});

	it("returns empty for empty query", () => {
		expect(searchByRelevance(entries, "")).toEqual([]);
	});

	it("blends keyword and vector scores", () => {
		const results = searchByRelevance(entries, "breastfeeding", 3);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].keywordScore).toBeGreaterThan(0);
		expect(results[0].vectorScore).toBeGreaterThan(0);
	});

	it("respects custom keywordWeight", () => {
		const keywordHeavy = searchByRelevance(entries, "breastfeeding", 3, 0.9);
		const vectorHeavy = searchByRelevance(entries, "breastfeeding", 3, 0.1);
		// Both should rank the breastfeeding entry first.
		expect(keywordHeavy[0].entry.id).toBe("bf");
		expect(vectorHeavy[0].entry.id).toBe("bf");
		// Combined scores should differ.
		expect(keywordHeavy[0].combined).not.toBe(vectorHeavy[0].combined);
	});

	it("returns results sorted by descending combined score", () => {
		const results = searchByRelevance(entries, "sleep children screen", 3);
		for (let i = 1; i < results.length; i++) {
			expect(results[i - 1].combined).toBeGreaterThanOrEqual(results[i].combined);
		}
	});

	it("respects topN limit", () => {
		const results = searchByRelevance(entries, "anything", 1);
		expect(results.length).toBeLessThanOrEqual(1);
	});

	it("skips entries with zero combined score", () => {
		const results = searchByRelevance(entries, "unrelated_term_xyz", 3);
		// Should be empty since no entry matches the unrelated term.
		expect(results).toEqual([]);
	});

	it("combines scores for high-relevance query", () => {
		const results = searchByRelevance(entries, "breastfeeding duration nursing", 3);
		expect(results[0].entry.id).toBe("bf");
		expect(results[0].combined).toBeGreaterThan(0.5);
	});

	it("filters out entries with zero combined score", () => {
		// Use an entry that has no keyword or vector match for the unrelated term.
		const unrelated: KnowledgeEntry = makeEntry({
			id: "unrelated",
			question: "completely different question about zzzzz",
			topic: "z",
			tags: ["zzzzz"],
		});
		const results = searchByRelevance([unrelated], "breastfeeding", 3);
		// No entry should match "breastfeeding" — combined score is 0.
		expect(results).toEqual([]);
	});
});
