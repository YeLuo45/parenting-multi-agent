/**
 * CollegePrepAgent — academic planning, SAT/ACT, essays, applications for teens.
 * Rule-based + keyword matching. No LLM call.
 */

import { type ChildProfile, computeStage } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";
import {
	type CollegePrepTip,
	getTipsForStage,
	matchTopic,
} from "./knowledge.js";

export const COLLEGE_PREP_DISCLAIMER =
	"⚠️ 大学申请因地区、国家、个人情况差异较大。以上建议为通用框架，具体决策请结合当地升学政策和专业咨询。";

function formatTip(tip: CollegePrepTip): string {
	return [
		`🎓 ${tip.summary}（${tip.ageRange}）`,
		"",
		...tip.advice.map((a) => `- ${a}`),
	].join("\n");
}

export class CollegePrepAgent implements Agent {
	readonly id = "college-prep";
	readonly name = "大学申请顾问";
	readonly topics = ["education"] as const;
	readonly stages = ["tween", "teen", "young_adult"] as const;

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
					content: `${formatted}\n\n${COLLEGE_PREP_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
		}

		const allTips = getTipsForStage(stage);
		if (allTips.length > 0) {
			const summary = allTips
				.map((t) => `- ${t.summary}（${t.ageRange}）`)
				.join("\n");
			return {
				agentId: this.id,
				agentName: this.name,
				content: `我是大学申请顾问，可以帮你：\n${summary}\n\n请告诉我孩子的年级和具体问题（如"SAT备考"、"文书写作"、"选校"）。\n\n${COLLEGE_PREP_DISCLAIMER}`,
				confidence: 0.4,
				urgency: "info",
			};
		}

		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是大学申请顾问，帮助13-18岁孩子的大学规划。\n\n请告诉我孩子的年级和具体问题。\n\n${COLLEGE_PREP_DISCLAIMER}`,
			confidence: 0.3,
			urgency: "info",
		};
	}
}

export function createCollegePrepAgent(): CollegePrepAgent {
	return new CollegePrepAgent();
}

export {
	type CollegePrepTip,
	type CollegePrepTopic,
	getTipsForStage,
	matchTopic,
} from "./knowledge.js";
