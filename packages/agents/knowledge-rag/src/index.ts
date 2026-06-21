export {
	KnowledgeRAGAgent,
	createKnowledgeRAGAgent,
	KNOWLEDGE_DISCLAIMER,
} from "./agent.js";

export {
	KNOWLEDGE_BASE,
	byStage,
	searchKnowledge,
	searchKnowledgeIndex,
	buildIndex,
	queryIndex,
	scoreEntry,
	tokenize,
	knowledgeStats,
	formatReferences,
	type EvidenceLevel,
	type SourceOrg,
	type Reference,
	type KnowledgeEntry,
	type HanTokenIndex,
} from "./knowledge.js";

export {
	buildTfIdfIndex,
	searchByVector,
	searchByRelevance,
	vectorize,
	cosineSimilarity,
	type Vector,
	type TfIdfIndex,
	type TfIdfOptions,
	type CombinedResult,
} from "./tfidf.js";

export const KNOWLEDGE_RAG_VERSION = "0.1.0";
