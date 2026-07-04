export {
	createKnowledgeRAGAgent,
	type KnowledgeLlmGenerator,
	type KnowledgeRAGOptions,
	KNOWLEDGE_DISCLAIMER,
	KnowledgeRAGAgent,
} from "./agent.js";

export {
	buildIndex,
	byStage,
	type EvidenceLevel,
	formatReferences,
	type HanTokenIndex,
	type KnowledgeEntry,
	KNOWLEDGE_BASE,
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

export const KNOWLEDGE_RAG_VERSION = "0.1.0";
