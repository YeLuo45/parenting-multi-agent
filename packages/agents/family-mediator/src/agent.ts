/**
 * FamilyMediatorAgent — couple, intergenerational, sibling dynamics.
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	FAMILY_GUIDANCE,
	getFamilyGuidance,
	matchFamilyIssue,
	type FamilyGuidance,
	type FamilyIssue,
} from "./knowledge.js";

export const FAMILY_MEDIATOR_DISCLAIMER =
	"⚠️ 本回复仅供参考。严重家庭冲突、虐待或离婚涉及法律问题，请咨询家庭律师/专业心理咨询师。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function detectIntent(question: string): "issue" | "communication" | "general" {
	const q = question.toLowerCase();
	if (/(沟通|交流|对话|communication)/i.test(q)) return "communication";
	if (
		/(夫妻|伴侣|婆媳|翁婿|祖辈|同胞|兄弟姐妹|离婚|单亲|重组|家庭|家人|吵架|conflict|family)/i.test(
			q,
		)
	)
		return "issue";
	return "general";
}

function formatGuidance(guidance: FamilyGuidance): string {
	const lines = [
		`👨‍👩‍👧 ${guidance.name}（${guidance.nameEn}）`,
		"",
		`${guidance.description}`,
		"",
		"💡 应对策略：",
		...guidance.strategies.map((s, i) => `${i + 1}. ${s}`),
		"",
		`🆘 何时寻求专业帮助：${guidance.whenToSeekHelp}`,
	];
	return lines.join("\n");
}

function formatCommunication(): string {
	const lines = [
		"🗣️ 家庭沟通原则：",
		"",
		"1. 定期家庭会议（每周 1 次，30 分钟）",
		"2. 轮流发言不打断",
		"3. 用 \"我\" 句式表达感受",
		"4. 先理解再被理解",
		"5. 认可情绪，不急于解决",
		"6. 孩子也参与，培养沟通习惯",
		"7. 配偶/家人间保持私下沟通",
		"8. 必要时寻求家庭咨询师帮助",
	];
	return lines.join("\n");
}

function formatList(): string {
	const lines = ["📚 我可以帮你处理这些家庭议题："];
	for (const g of FAMILY_GUIDANCE) {
		lines.push(`- ${g.name}（${g.nameEn}）`);
	}
	return lines.join("\n");
}

export class FamilyMediatorAgent implements Agent {
	readonly id = "family-mediator";
	readonly name = "家庭关系调解员";
	readonly topics = ["family"] as const;
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
		void ageInMonths(child.birthDate);
		const stage = child.stage ?? computeStage(child.birthDate);
		const intent = detectIntent(question);

		switch (intent) {
			case "issue": {
				const issue = matchFamilyIssue(question);
				if (!issue) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `请描述你的具体家庭情况，例如：夫妻冲突、隔代教养、同胞竞争、离婚等。\n\n${formatList()}\n\n${FAMILY_MEDIATOR_DISCLAIMER}`,
						confidence: 0.4,
						urgency: "info",
					};
				}
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatGuidance(issue)}\n\n${FAMILY_MEDIATOR_DISCLAIMER}`,
					confidence: 0.85,
					urgency: issue.urgency,
				};
			}
			case "communication":
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatCommunication()}\n\n${FAMILY_MEDIATOR_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			case "general":
			default:
				return {
					agentId: this.id,
					agentName: this.name,
					content: `我是家庭关系调解员，可以帮你：\n- 夫妻育儿冲突\n- 隔代教养分歧\n- 同胞竞争\n- 婆媳/翁婿关系\n- 单亲/重组家庭\n- 离婚适应\n- 家庭沟通技巧\n\n请告诉我你的具体问题。\n\n${FAMILY_MEDIATOR_DISCLAIMER}`,
					confidence: 0.4,
					urgency: "info",
				};
		}
	}
}

export function createFamilyMediatorAgent(): FamilyMediatorAgent {
	return new FamilyMediatorAgent();
}

export {
	FAMILY_GUIDANCE,
	getFamilyGuidance,
	matchFamilyIssue,
	type FamilyGuidance,
	type FamilyIssue,
} from "./knowledge.js";
