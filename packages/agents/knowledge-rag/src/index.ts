/**
 * @parenting/agent-knowledge-rag — evidence-based parenting knowledge retrieval.
 *
 * Phase 2 batch 2: deterministic in-memory retrieval. No LLM call.
 * Direction E: provider-chain LLM RAG with fallback tiers.
 */

export {
	createKnowledgeRAGAgent,
	KNOWLEDGE_DISCLAIMER,
	type KnowledgeLlmGenerator,
	KnowledgeRAGAgent,
	type KnowledgeRAGOptions,
} from "./agent.js";
export {
	buildIndex,
	byStage,
	type EvidenceLevel,
	formatReferences,
	type HanTokenIndex,
	KNOWLEDGE_BASE,
	type KnowledgeEntry,
	knowledgeStats,
	queryIndex,
	type Reference,
	type SourceOrg,
	scoreEntry,
	searchKnowledge,
	searchKnowledgeIndex,
	tokenize,
} from "./knowledge.js";
export {
	embedUrlFor,
	formatMediaList,
	getMediaById,
	getMediaForAge,
	getMediaForEntry,
	MEDIA_REFERENCES,
	type MediaKind,
	type MediaReference,
} from "./media.js";
export {
	buildKnowledgeProviderChain,
	defaultKnowledgeProviderChain,
	formatProvenance,
	generateAnswerWithProvider,
	type KnowledgeProviderChain,
	type Provider,
	type ProviderCallInput,
	type ProviderId,
	type ProviderResult,
	RuleFallbackProvider,
	StubProvider,
} from "./provider-chain.js";
export {
	buildTfIdfIndex,
	type CombinedResult,
	cosineSimilarity,
	searchByRelevance,
	searchByVector,
	type TfIdfIndex,
	type TfIdfOptions,
	type Vector,
	vectorize,
} from "./tfidf.js";
export {
	buildUtterance,
	DEFAULT_VOICES,
	detectTtsLang,
	pickVoiceForLang,
	QueueTtsAdapter,
	sanitizeForTts,
	summarizeForSpeech,
	type TtsAdapter,
	type TtsState,
	type TtsUtterance,
	type TtsVoice,
} from "./tts.js";

export const KNOWLEDGE_RAG_VERSION = "0.4.0";
