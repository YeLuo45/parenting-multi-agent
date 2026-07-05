/**
 * KnowledgeRAGAgent — evidence-based parenting knowledge retrieval.
 *
 * Phase 2 batch 2: deterministic in-memory retrieval. No LLM call.
 * Returns top-N matching knowledge entries with references.
 */

import {
	type ChildProfile,
	type ChildStage,
	computeStage,
} from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	byStage,
	type EvidenceLevel,
	formatReferences,
	KNOWLEDGE_BASE,
	type KnowledgeEntry,
	knowledgeStats,
	scoreEntry,
	searchKnowledge,
	searchKnowledgeIndex,
} from "./knowledge.js";

export const KNOWLEDGE_DISCLAIMER =
	"⚠️ 知识库内容仅供家长参考，不替代医生诊断。具体健康问题请咨询儿科医生或专科医师。";

/**
 * Minimal text-completion interface used by the RAG agent. Web/CLI/TUI
 * environments wire this to their LLM registry (e.g. by adapting
 * `WebLlmRegistry.complete()` to this signature). The agent makes
 * no assumptions about the underlying provider chain.
 */
export type KnowledgeLlmGenerator = (
	systemPrompt: string,
	userPrompt: string,
) => Promise<string>;

export interface KnowledgeRAGOptions {
	llmGenerator?: KnowledgeLlmGenerator;
	/** Returns the list of provider IDs tried on the last call (telemetry). */
	llmChainIds?: () => string[];
}

function evidenceLabel(level: EvidenceLevel): string {
	switch (level) {
		case "systematic_review":
			return "系统综述（最高级别证据）";
		case "rct":
			return "随机对照试验";
		case "cohort":
			return "队列研究";
		case "expert_opinion":
			return "专家共识";
		case "anecdotal":
			return "经验性";
	}
}

function formatEntry(entry: KnowledgeEntry, index: number): string {
	const stageTag = entry.stage.includes("any")
		? "全阶段"
		: entry.stage.join("/");
	return [
		`**${index}. ${entry.question}**`,
		`阶段: ${stageTag} | 证据等级: ${evidenceLabel(entry.evidence)}`,
		"",
		entry.answer,
		"",
		"📚 参考：",
		formatReferences(entry.references),
	].join("\n");
}

function detectKnowledgeIntent(
	question: string,
): "search" | "browse" | "evidence" | "general" {
	const q = question.toLowerCase();
	if (
		/(为什么|原理|原因|科学|证据|研究|统计|数据|evidence|why|how.*work|机制|mechanism)/i.test(
			q,
		)
	)
		return "evidence";
	if (/(列表|有什么|全部|所有|list|all|browse|catalog|清单|条目)/i.test(q))
		return "browse";
	// Search intent: anything that looks like a knowledge query — needs keywords OR question patterns
	if (
		/(科普|知识|文章|资料|搜索|搜|找|查询|查|看看|读|看看|查阅|知识库|百科|原理|知识库|reference|knowledge|article|search|应该|怎么|多久|是否|能|可以|哪些|什么是|怎么办|如何|why|how|what|should|can|may|does)/i.test(
			q,
		)
	)
		return "search";
	return "general";
}

export class KnowledgeRAGAgent implements Agent {
	readonly id = "knowledge-rag";
	readonly name = "知识库助手";
	readonly topics = ["knowledge"] as const;
	readonly stages = [
		"newborn",
		"infant",
		"toddler",
		"preschool",
		"school_age",
		"tween",
		"teen",
		"young_adult",
	] as const;
	private llmGenerator?: KnowledgeLlmGenerator;
	private llmChainIds?: () => string[];

	constructor(options: KnowledgeRAGOptions = {}) {
		this.llmGenerator = options.llmGenerator;
		this.llmChainIds = options.llmChainIds;
	}

	async respond(
		question: string,
		child: ChildProfile,
		_context: AgentContext,
	): Promise<AgentReply & { sourceChain?: string[] }> {
		const stage = child.stage ?? computeStage(child.birthDate);
		const intent = detectKnowledgeIntent(question);

		if (intent === "browse") {
			const stats = knowledgeStats();
			const stages = Object.entries(stats.byStage)
				.map(([s, n]) => `${s}: ${n}`)
				.join(" | ");
			const evidence = Object.entries(stats.byEvidence)
				.map(([e, n]) => `${e}: ${n}`)
				.join(" | ");
			const entries = byStage(KNOWLEDGE_BASE, stage);
			const top = entries
				.slice(0, 5)
				.map((e, i) => `${i + 1}. ${e.question}`)
				.join("\n");
			return {
				agentId: this.id,
				agentName: this.name,
				content: `📚 育儿知识库（共 ${stats.total} 条；本阶段 ${entries.length} 条）：\n\n${top}\n\n...还有 ${entries.length - 5} 条\n\n证据分布：${evidence}\n阶段覆盖：${stages}\n\n${KNOWLEDGE_DISCLAIMER}`,
				confidence: 0.7,
				urgency: "info",
			};
		}

		const stageFiltered = byStage(KNOWLEDGE_BASE, stage);
		const matches = searchKnowledge(question, stageFiltered, 3);

		// If no matches at all, show help (with low confidence for general queries, even lower for specific searches)
		if (matches.length === 0) {
			const helpText = `我是知识库助手，可以帮你：\n- 检索育儿知识（如"母乳喂养多久"、"发烧定义"）\n- 浏览知识库（输入"列表"）\n- 查看证据来源和推荐做法\n\n请输入问题或关键词。\n\n${KNOWLEDGE_DISCLAIMER}`;
			if (intent === "search" || intent === "evidence") {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `🔍 知识库中没有找到与"${question}"直接匹配的条目。\n\n您可以：\n1. 换个关键词（如"发烧"、"母乳"、"发脾气"）\n2. 输入"列表"查看全部 ${knowledgeStats().total} 条知识\n3. 咨询医生获取专业建议\n\n${KNOWLEDGE_DISCLAIMER}`,
					confidence: 0.3,
					urgency: "info",
				};
			}
			return {
				agentId: this.id,
				agentName: this.name,
				content: helpText,
				confidence: 0.5,
				urgency: "info",
			};
		}

		// Has matches. For specific intents (search/evidence), use formatted multi-result format
		if (intent === "search" || intent === "evidence") {
			const ragReply = await this.tryRagReply(question, matches, {
				stage,
				intent,
			});
			if (ragReply) {
				const confidence =
					/* v8 ignore next */
					matches[0] ? scoreEntry(question, matches[0]) : 0.7;
				return {
					agentId: this.id,
					agentName: this.name,
					content: ragReply.content,
					confidence,
					urgency: "info",
					sourceChain: ragReply.sourceChain,
				};
			}
			// LLM path unavailable/empty → fall back to formatted FAQ list.
			const formatted = matches
				.map((m, i) => formatEntry(m, i + 1))
				.join("\n\n---\n\n");
			return {
				agentId: this.id,
				agentName: this.name,
				content: `🔍 为您找到 ${matches.length} 条相关知识：\n\n${formatted}\n\n${KNOWLEDGE_DISCLAIMER}`,
				confidence: 0.85,
				urgency: "info",
			};
		}

		// general: try best-effort search via inverted index, but only show results
		// if the top score is reasonably high. We use the inverted index here
		// because it's faster on large knowledge bases and re-uses the same
		// Han-tokenization rules as buildIndex.
		const stageFiltered2 = byStage(KNOWLEDGE_BASE, stage);
		const allMatches = searchKnowledgeIndex(stageFiltered2, question, 1);
		if (
			allMatches.length > 0 &&
			scoreEntry(question, allMatches[0]) > 0.5
		) {
			return {
				agentId: this.id,
				agentName: this.name,
				content: `🔍 您的问题可能与以下知识相关：\n\n${formatEntry(allMatches[0], 1)}\n\n${KNOWLEDGE_DISCLAIMER}\n\n提示：知识库助手最适合科普类问题，请用关键词（如"母乳"、"发烧"、"发脾气"）提问以获得更精准的结果。`,
				confidence: 0.6,
				urgency: "info",
			};
		}
		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是知识库助手，可以帮你：\n- 检索育儿知识（如"母乳喂养多久"、"发烧定义"）\n- 浏览知识库（输入"列表"）\n- 查看证据来源和推荐做法\n\n请输入问题或关键词。\n\n${KNOWLEDGE_DISCLAIMER}`,
			confidence: 0.3,
			urgency: "info",
		};
	}

	private async tryRagReply(
		question: string,
		matches: KnowledgeEntry[],
		ctx: {
			stage: ChildStage;
			intent: ReturnType<typeof detectKnowledgeIntent>;
		},
	): Promise<{ content: string; sourceChain?: string[] } | null> {
		if (!this.llmGenerator || matches.length === 0) return null;
		const systemPrompt =
			"你是一位循证医学导向的新手爸妈育儿助手，参考资料中每条 FAQ 都标注了来源（WHO/AAP/UpToDate 等）。请基于参考资料用简洁中文回答；如果参考资料不充分，请明确说明。回答末尾保留证据来源列表。";
		const userPrompt = [
			`问题：${question}`,
			`孩子阶段：${ctx.stage}`,
			"",
			"参考资料：",
			matches
				.map(
					(m, i) =>
						`[${i + 1}] ${m.question}\n答案：${m.answer}\n来源：${m.references.map((r) => `${r.org} ${r.year}`).join(", ")}\n证据等级：${m.evidence}`,
				)
				.join("\n\n"),
		].join("\n");
		try {
			const text = await this.llmGenerator(systemPrompt, userPrompt);
			if (!text) return null;
			const sourceChain = this.llmChainIds?.();
			return {
				content: text,
				...(sourceChain ? { sourceChain } : {}),
			};
		} catch {
			return null;
		}
	}
}

export function createKnowledgeRAGAgent(
	options: KnowledgeRAGOptions = {},
): KnowledgeRAGAgent {
	return new KnowledgeRAGAgent(options);
}

export {
	byStage,
	type EvidenceLevel,
	KNOWLEDGE_BASE,
	type KnowledgeEntry,
	knowledgeStats,
	type Reference,
	type SourceOrg,
	scoreEntry,
	searchKnowledge,
} from "./knowledge.js";
