/**
 * CareerAgent — career exploration, internships, job search for older
 * teens and young adults. Rule-based + keyword matching. No LLM call.
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";
import { getTipsForStage, matchTopic, type CareerTip } from "./knowledge.js";

export const CAREER_DISCLAIMER =
	"⚠️ 职业发展因地区、行业、个人情况差异很大。以上为通用建议框架，请结合当地就业市场和专业咨询。";

function formatTip(tip: CareerTip): string {
	return [
		`💼 ${tip.summary}（${tip.ageRange}）`,
		"",
		...tip.advice.map((a) => `- ${a}`),
	].join("\n");
}

export class CareerAgent implements Agent {
	readonly id = "career";
	readonly name = "职业规划顾问";
	readonly topics = ["education"] as const;
	readonly stages = ["teen", "young_adult"] as const;

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
					content: `${formatted}\n\n${CAREER_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
		}

		const allTips = getTipsForStage(stage);
		if (allTips.length > 0) {
			const summary = allTips.map((t) => `- ${t.summary}（${t.ageRange}）`).join("\n");
			return {
				agentId: this.id,
				agentName: this.name,
				content: `我是职业规划顾问，可以帮你：\n${summary}\n\n请告诉我年龄和具体问题（如"职业探索"、"实习策略"、"简历写作"）。\n\n${CAREER_DISCLAIMER}`,
				confidence: 0.4,
				urgency: "info",
			};
		}

		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是职业规划顾问，帮助14-25岁年轻人的职业发展。\n\n请告诉我年龄和具体问题。\n\n${CAREER_DISCLAIMER}`,
			confidence: 0.3,
			urgency: "info",
		};
	}
}

export function createCareerAgent(): CareerAgent {
	return new CareerAgent();
}

export {
	getTipsForStage,
	matchTopic,
	type CareerTopic,
	type CareerTip,
} from "./knowledge.js";
