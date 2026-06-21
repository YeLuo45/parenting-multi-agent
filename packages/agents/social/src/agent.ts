/**
 * SocialAgent — social skills, peer relationships, playdates, conflict resolution.
 *
 * Phase 3 direction 5: rule-based + keyword matching. No LLM call.
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";
import { getTipsForStage, matchTopic, type SocialTopic, type SocialTip } from "./knowledge.js";

export const SOCIAL_DISCLAIMER =
	"⚠️ 每个孩子的社交发展节奏不同，以上建议仅供参考。如社交困难严重影响孩子生活，建议咨询儿童心理咨询师。";

function formatTip(tip: SocialTip): string {
	return [
		`🤝 ${tip.summary}（${tip.ageRange}）`,
		"",
		...tip.advice.map((a) => `- ${a}`),
	].join("\n");
}

export class SocialAgent implements Agent {
	readonly id = "social";
	readonly name = "社交教练";
	readonly topics = ["social"] as const;
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
					content: `${formatted}\n\n${SOCIAL_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
		}

		// General fallback
		const allTips = getTipsForStage(stage);
		if (allTips.length > 0) {
			const summary = allTips.map((t) => `- ${t.summary}（${t.ageRange}）`).join("\n");
			return {
				agentId: this.id,
				agentName: this.name,
				content: `我是社交教练，可以帮你：\n${summary}\n\n请告诉我具体问题（如"孩子害羞"、"如何安排playdate"、"小朋友吵架怎么办"）。\n\n${SOCIAL_DISCLAIMER}`,
				confidence: 0.4,
				urgency: "info",
			};
		}

		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是社交教练，帮助孩子发展社交能力。\n\n请告诉我孩子的年龄和具体问题，我会提供建议。\n\n${SOCIAL_DISCLAIMER}`,
			confidence: 0.3,
			urgency: "info",
		};
	}
}

export function createSocialAgent(): SocialAgent {
	return new SocialAgent();
}

export {
	getTipsForStage,
	matchTopic,
	type SocialTopic,
	type SocialTip,
} from "./knowledge.js";
