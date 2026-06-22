/**
 * ParentSupportAgent — parent burnout, self-care, mental health, isolation.
 */

import { type ChildProfile, computeStage } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	getAllHotlines,
	matchSupportIssue,
	type SupportGuidance,
} from "./knowledge.js";

export const PARENT_SUPPORT_DISCLAIMER =
	"⚠️ 本回复仅供参考。出现伤害自己或孩子的念头时，请立即拨打心理援助热线或就医。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function detectIntent(
	question: string,
): "issue" | "self_care" | "crisis" | "general" {
	const q = question.toLowerCase();
	if (/(想死|自伤|崩溃|危机|crisis|suicide|自残)/i.test(q)) return "crisis";
	if (/(自我关怀|自己|me.time|self.care|自私|休息|放松)/i.test(q))
		return "self_care";
	if (
		/(累|疲惫|焦虑|抑郁|压力|无助|孤立|孤独|内疚|burnout|anxiety|depress|isolat|guilt|exhausted|overwhelm|burned.out)/i.test(
			q,
		)
	)
		return "issue";
	return "general";
}

function formatGuidance(guidance: SupportGuidance): string {
	const lines = [
		`🤗 ${guidance.name}（${guidance.nameEn}）`,
		"",
		`${guidance.description}`,
		"",
		"💡 应对策略：",
		...guidance.strategies.map((s, i) => `${i + 1}. ${s}`),
		"",
		`🆘 何时寻求专业帮助：${guidance.whenToSeekHelp}`,
	];
	if (guidance.hotline && guidance.hotline.length > 0) {
		lines.push("", "📞 心理援助热线：");
		guidance.hotline.forEach((h) => {
			lines.push(`- ${h.region}：${h.number}`);
		});
	}
	return lines.join("\n");
}

function formatSelfCare(): string {
	const lines = [
		"🌿 父母自我关怀清单：",
		"",
		"【身体】",
		"- 每天 6-7 小时睡眠（轮流值夜）",
		"- 每天 30 分钟运动（散步即可）",
		"- 健康饮食，不节食",
		"",
		"【心理】",
		"- 每周 1 次和朋友/家人深度交流",
		"- 每天 15 分钟独处时间",
		"- 写育儿日记（释放情绪）",
		"",
		"【社交】",
		"- 保留 1-2 个朋友关系",
		"- 偶尔约会伴侣",
		"- 加入父母社群",
		"",
		"【专业】",
		"- 必要时看心理咨询师（正常，不丢人）",
		"- 定期体检（不要只顾孩子）",
	];
	return lines.join("\n");
}

function formatCrisis(): string {
	const hotlines = getAllHotlines();
	const unique = Array.from(
		new Map(hotlines.map((h) => [h.number, h])).values(),
	);
	const lines = [
		"🚨 你现在感到很难受，请立即寻求帮助：",
		"",
		"📞 心理援助热线（24 小时）：",
		...unique.map((h) => `- ${h.region}：${h.number}`),
		"",
		"🏥 就近医院精神科/心理科",
		"👨‍👩‍👧 告诉信任的家人或朋友",
		"",
		"你不是一个人，寻求帮助是勇敢的选择。",
	];
	return lines.join("\n");
}

export class ParentSupportAgent implements Agent {
	readonly id = "parent-support";
	readonly name = "父母支持顾问";
	readonly topics = ["parent_support"] as const;
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

	async respond(
		question: string,
		child: ChildProfile,
		_context: AgentContext,
	): Promise<AgentReply> {
		void ageInMonths(child.birthDate);
		const _stage = child.stage ?? computeStage(child.birthDate);
		const intent = detectIntent(question);

		switch (intent) {
			case "crisis":
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatCrisis()}\n\n${PARENT_SUPPORT_DISCLAIMER}`,
					confidence: 0.95,
					urgency: "emergency",
					redFlag: {
						severity: "emergency",
						ruleId: "PSY_CRISIS",
						description: "用户表达了危机想法",
						action: "立即拨打心理热线或就医",
					},
				};
			case "self_care":
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatSelfCare()}\n\n${PARENT_SUPPORT_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			case "issue": {
				const issue = matchSupportIssue(question);
				if (issue === null) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `请告诉我你的具体感受。\n\n${formatSelfCare()}\n\n${PARENT_SUPPORT_DISCLAIMER}`,
						confidence: 0.4,
						urgency: "info",
					};
				}
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatGuidance(issue)}\n\n${PARENT_SUPPORT_DISCLAIMER}`,
					confidence: 0.85,
					urgency: issue.urgency,
					redFlag:
						issue.urgency === "high"
							? {
									severity: "high",
									ruleId: issue.id,
									description: issue.name,
									action: issue.whenToSeekHelp,
								}
							: undefined,
				};
			}
			default:
				return {
					agentId: this.id,
					agentName: this.name,
					content: `我是父母支持顾问，可以帮你：\n- 父母倦怠/疲惫\n- 育儿焦虑\n- 产后/父母抑郁\n- 育儿内疚\n- 孤立/孤独\n- 伴侣关系\n- 自我关怀\n- 危机时刻的资源\n\n请告诉我你的感受。\n\n${PARENT_SUPPORT_DISCLAIMER}`,
					confidence: 0.4,
					urgency: "info",
				};
		}
	}
}

export function createParentSupportAgent(): ParentSupportAgent {
	return new ParentSupportAgent();
}

export {
	getAllHotlines,
	getSupportGuidance,
	matchSupportIssue,
	SUPPORT_GUIDANCE,
	type SupportGuidance,
	type SupportTopic,
} from "./knowledge.js";
