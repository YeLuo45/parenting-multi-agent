/**
 * SiblingAgent — sibling rivalry, new baby adjustment, sharing, fighting.
 * Rule-based + keyword matching. No LLM call.
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";
import { getTipsForStage, matchTopic, type SiblingTip } from "./knowledge.js";

export const SIBLING_DISCLAIMER =
	"⚠️ 每个家庭和每个孩子都不同，以上建议为通用框架。具体问题请结合家庭情况和专业咨询。";

function formatTip(tip: SiblingTip): string {
	return [
		`👶👧 ${tip.summary}（${tip.ageRange}）`,
		"",
		...tip.advice.map((a) => `- ${a}`),
	].join("\n");
}

export class SiblingAgent implements Agent {
	readonly id = "sibling";
	readonly name = "兄弟姐妹顾问";
	readonly topics = ["family", "social"] as const;
	readonly stages = [
		"infant",
		"toddler",
		"preschool",
		"school_age",
		"tween",
		"teen",
	] as const;

	async respond(question: string, child: ChildProfile, _context: AgentContext): Promise<AgentReply> {
		const stage = child.stage ?? computeStage(child.birthDate);
		const topic = matchTopic(question);

		if (topic) {
			const tips = getTipsForStage(stage, topic);
			if (tips.length > 0) {
				const formatted = tips.map(formatTip).join("\n\n---\n\n");
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatted}\n\n${SIBLING_DISCLAIMER}`,
					confidence: 0.85,
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
				content: `我是兄弟姐妹关系顾问，可以帮你：\n${summary}\n\n请告诉我具体问题（如"手足之争"、"迎接二宝"、"打架"）。\n\n${SIBLING_DISCLAIMER}`,
				confidence: 0.4,
				urgency: "info",
			};
		}

		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是兄弟姐妹关系顾问，帮助应对二宝/手足竞争等。\n\n请告诉我具体问题。\n\n${SIBLING_DISCLAIMER}`,
			confidence: 0.3,
			urgency: "info",
		};
	}
}

export function createSiblingAgent(): SiblingAgent {
	return new SiblingAgent();
}

export {
	getTipsForStage,
	matchTopic,
	type SiblingTopic,
	type SiblingTip,
} from "./knowledge.js";