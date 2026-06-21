/**
 * TF-IDF vector retrieval — pure TypeScript implementation.
 *
 * Provides semantic ranking alongside the existing keyword scoreEntry.
 * Cosine similarity over TF-IDF vectors gives "soft semantic" matching
 * without external embedding dependencies.
 *
 * The vectorizer reuses the same Han tokenization as the keyword path,
 * so a token like "你好" splits into ["你", "好"] (two single-character
 * tokens) and is weighted by inverse document frequency across the
 * corpus. This handles both English and Han-script text consistently.
 */

import { scoreEntry, tokenize, type KnowledgeEntry } from "./knowledge.js";

/** A document's TF-IDF weight vector (sparse map). */
export type Vector = Map<string, number>;

/** Corpus-level IDF statistics used to score new queries. */
export interface TfIdfIndex {
	/** Map<token, log(N / df)> — inverse document frequency. */
	idf: Map<string, number>;
	/** Total number of documents used to build the index. */
	docCount: number;
	/** Map<entryId, docVector> — precomputed per-entry vectors. */
	docVectors: Map<string, Vector>;
}

export interface TfIdfOptions {
	/** Smoothing for IDF (default 1 — Laplace smoothing). */
	smoothing?: number;
}

const DEFAULT_SMOOTHING = 1;

/** Count term occurrences in a token list. */
function termFrequency(tokens: string[]): Map<string, number> {
	const tf = new Map<string, number>();
	for (const t of tokens) {
		tf.set(t, (tf.get(t) ?? 0) + 1);
	}
	return tf;
}

/** Cosine similarity between two sparse vectors. Returns 0 when either is empty. */
export function cosineSimilarity(a: Vector, b: Vector): number {
	if (a.size === 0 || b.size === 0) return 0;
	let dot = 0;
	let magA = 0;
	let magB = 0;
	for (const [term, wA] of a.entries()) {
		magA += wA * wA;
		const wB = b.get(term);
		if (wB !== undefined) dot += wA * wB;
	}
	for (const wB of b.values()) {
		magB += wB * wB;
	}
	const denom = Math.sqrt(magA) * Math.sqrt(magB);
	return denom === 0 ? 0 : dot / denom;
}

/** Compute a TF-IDF vector from a token list and idf map. */
export function vectorize(tokens: string[], idf: Map<string, number>): Vector {
	const v: Vector = new Map();
	const tf = termFrequency(tokens);
	const total = tokens.length;
	if (total === 0) return v;
	for (const [term, count] of tf.entries()) {
		const w = idf.get(term);
		if (w === undefined || w <= 0) continue;
		v.set(term, (count / total) * w);
	}
	return v;
}

/** Build a TF-IDF index over the given entries. */
export function buildTfIdfIndex(entries: KnowledgeEntry[], options: TfIdfOptions = {}): TfIdfIndex {
	const smoothing = options.smoothing ?? DEFAULT_SMOOTHING;
	const docCount = entries.length;
	const docFreq = new Map<string, number>();
	const docTokenLists: Array<{ id: string; tokens: string[] }> = [];

	for (const entry of entries) {
		const tokens = [
			...tokenize(entry.question),
			...entry.tags.flatMap((t) => tokenize(t)),
			...tokenize(entry.topic),
		];
		docTokenLists.push({ id: entry.id, tokens });
		const seen = new Set<string>();
		for (const t of tokens) {
			if (seen.has(t)) continue;
			seen.add(t);
			docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
		}
	}

	const idf = new Map<string, number>();
	for (const [term, df] of docFreq.entries()) {
		idf.set(term, Math.log((docCount + smoothing) / (df + smoothing)));
	}

	const docVectors = new Map<string, Vector>();
	for (const { id, tokens } of docTokenLists) {
		docVectors.set(id, vectorize(tokens, idf));
	}

	return { idf, docCount, docVectors };
}

/** Top-N entries ranked by cosine similarity between query and precomputed doc vector. */
export function searchByVector(
	entries: KnowledgeEntry[],
	query: string,
	topN = 3,
	options: TfIdfOptions = {},
): Array<{ entry: KnowledgeEntry; score: number }> {
	if (entries.length === 0) return [];
	const tokens = tokenize(query);
	if (tokens.length === 0) return [];
	const index = buildTfIdfIndex(entries, options);
	const qVec = vectorize(tokens, index.idf);
	const ranked: Array<{ entry: KnowledgeEntry; score: number }> = [];
	for (const entry of entries) {
		const dVec = index.docVectors.get(entry.id);
		/* v8 ignore next */
		if (!dVec) continue;
		const score = cosineSimilarity(qVec, dVec);
		if (score > 0) ranked.push({ entry, score });
	}
	ranked.sort((a, b) => b.score - a.score);
	return ranked.slice(0, topN);
}

/** Combined ranking: weighted blend of keyword score and vector score. */
export interface CombinedResult {
	entry: KnowledgeEntry;
	keywordScore: number;
	vectorScore: number;
	combined: number;
}

/** Blend keyword scoring (from scoreEntry) with TF-IDF vector similarity.
 *  Default weights: 0.6 keyword + 0.4 vector. Higher combined = more relevant. */
export function searchByRelevance(
	entries: KnowledgeEntry[],
	query: string,
	topN = 3,
	keywordWeight = 0.6,
): CombinedResult[] {
	if (entries.length === 0) return [];
	const tokens = tokenize(query);
	if (tokens.length === 0) return [];
	const index = buildTfIdfIndex(entries);
	const qVec = vectorize(tokens, index.idf);
	const results: CombinedResult[] = [];
	for (const entry of entries) {
		const keywordScore = scoreEntry(query, entry);
		/* v8 ignore next 2 */
		const dVec = index.docVectors.get(entry.id);
		const vectorScore = dVec ? cosineSimilarity(qVec, dVec) : 0;
		const combined = keywordWeight * keywordScore + (1 - keywordWeight) * vectorScore;
		if (combined > 0) results.push({ entry, keywordScore, vectorScore, combined });
	}
	results.sort((a, b) => b.combined - a.combined);
	return results.slice(0, topN);
}
