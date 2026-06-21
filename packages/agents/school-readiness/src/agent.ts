/**
 * SchoolReadinessAgent — pre-K/kindergarten readiness, early literacy,
 * school transitions. Rule-based + keyword matching. No LLM call.
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";
import { getTipsForStage, matchTopic, type ReadinessTip } from "./knowledge.js";

export const SCHOOL_READINESS_DISCLAIMER =
	"⚠️ 每个孩子的发展节奏不同，以上建议仅供参考。如对孩子的发展有疑虑，请咨询儿科医生或儿童发展专家。";

function formatTip(tip: ReadinessTip): string {
	return [
		`🎒 ${tip.summary}（${tip.ageRange}）`,
		"",
		...tip.advice.map((a) => `- ${a}`),
	].join("\n");
}

export class SchoolReadinessAgent implements Agent {
	readonly id = "school-readiness";
	readonly name = "入学准备顾问";
	readonly topics = ["education"] as const;
	readonly stages = ["toddler", "preschool", "school_age"] as const;

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
					content: `${formatted}\n\n${SCHOOL_READINESS_DISCLAIMER}`,
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
				content: `我是入学准备顾问，可以帮你：\n${summary}\n\n请告诉我孩子的年龄和具体问题（如"幼儿园入学准备"、"幼小衔接"、"早期阅读"）。\n\n${SCHOOL_READINESS_DISCLAIMER}`,
				confidence: 0.4,
				urgency: "info",
			};
		}

		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是入学准备顾问，帮助3-6岁孩子的学校准备。\n\n请告诉我孩子的年龄和具体问题。\n\n${SCHOOL_READINESS_DISCLAIMER}`,
			confidence: 0.3,
			urgency: "info",
		};
	}
}

export function createSchoolReadinessAgent(): SchoolReadinessAgent {
	return new SchoolReadinessAgent();
}

export {
	getTipsForStage,
	matchTopic,
	type ReadinessTopic,
	type ReadinessTip,
} from "./knowledge.js";
