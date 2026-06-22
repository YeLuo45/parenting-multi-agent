/**
 * LegalAgent — custody, support, adoption, immigration, school law.
 * Rule-based + keyword matching. No LLM call.
 */

import { type ChildProfile, computeStage } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";
import { getTipsForStage, type LegalTip, matchTopic } from "./knowledge.js";

export const LEGAL_DISCLAIMER =
	"⚠️ 本智能体提供通用法律信息，不构成法律意见。具体案件请咨询当地持牌律师。";

function formatTip(tip: LegalTip): string {
	return [
		`⚖️ ${tip.summary}（${tip.ageRange}，${tip.jurisdiction}）`,
		"",
		...tip.advice.map((a) => `- ${a}`),
	].join("\n");
}

export class LegalAgent implements Agent {
	readonly id = "legal";
	readonly name = "法律顾问";
	readonly topics = ["family"] as const;
	readonly stages = [
		"infant",
		"toddler",
		"preschool",
		"school_age",
		"tween",
		"teen",
		"young_adult",
	] as const;

	async respond(
		question: string,
		child: ChildProfile,
		_context: AgentContext,
	): Promise<AgentReply> {
		const stage = child.stage ?? computeStage(child.birthDate);
		const topic = matchTopic(question);

		if (topic) {
			const tips = getTipsForStage(stage, topic);
			if (tips.length > 0) {
				const formatted = tips.map(formatTip).join("\n\n---\n\n");
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatted}\n\n${LEGAL_DISCLAIMER}`,
					confidence: 0.8,
					urgency: "info",
				};
			}
		}

		const allTips = getTipsForStage(stage);
		if (allTips.length > 0) {
			const summary = allTips.map((t) => `- ${t.summary}`).join("\n");
			return {
				agentId: this.id,
				agentName: this.name,
				content: `我是法律顾问，可以帮你：\n${summary}\n\n请告诉我具体问题（如"监护权"、"抚养费"、"收养"）。\n\n${LEGAL_DISCLAIMER}`,
				confidence: 0.4,
				urgency: "info",
			};
		}

		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是法律顾问，提供儿童相关法律通用信息。\n\n请告诉我具体问题。\n\n${LEGAL_DISCLAIMER}`,
			confidence: 0.3,
			urgency: "info",
		};
	}
}

export function createLegalAgent(): LegalAgent {
	return new LegalAgent();
}

export {
	getTipsForStage,
	type LegalTip,
	type LegalTopic,
	matchTopic,
} from "./knowledge.js";
