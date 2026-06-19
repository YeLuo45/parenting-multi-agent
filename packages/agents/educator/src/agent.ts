/**
 * EducatorAgent — schooling, learning style, interest tracking, activity suggestions.
 *
 * Phase 1: rule-based + keyword matching (no LLM call).
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	EDU_STAGES,
	LEARNING_STYLES,
	INTERESTS,
	getEduStage,
	detectLearningStyle,
	detectInterests,
	suggestActivities,
	type EduStageInfo,
	type InterestCategory,
	type LearningStyle,
	type LearningStylePattern,
} from "./knowledge.js";

export const EDUCATOR_DISCLAIMER =
	"⚠️ 本回复仅供参考。每个孩子的发展节奏不同，具体教育选择请结合孩子兴趣和家庭情况。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function detectIntent(question: string): "stage" | "style" | "interest" | "activity" | "subject" | "general" {
	const q = question.toLowerCase();
	// subject comes first to avoid "怎么学数学" being misclassified as style
	if (/(数学|语文|英语|英文|物理|化学|数学题|怎么学|学不会|不爱学习)/i.test(q))
		return "subject";
	if (/(学习风格|学习类型|visual|auditory|kinesthetic|视觉|听觉|动觉|怎么记)/i.test(q)) return "style";
	// activity comes before interest because "怎么做" with interest word should still be activity
	if (/(做什么|玩什么|活动|怎么玩|做什么好|建议|recommend|suggest)/i.test(q)) return "activity";
	if (
		/(兴趣班|课外班|兴趣|班|课程|stem|编程|艺术|画画|乐器|钢琴|游泳|体育|积木|lego|绘画|机器人)/i.test(
			q,
		)
	)
		return "interest";
	if (/(学校|学什么|几岁|阶段|学龄前|幼小衔接|小学|初中|高中|大学|school|kindergarten|elementary|middle|high|college|grade)/i.test(q))
		return "stage";
	return "general";
}

function formatEduStage(stage: EduStageInfo): string {
	const lines = [
		`📚 ${stage.name} (${stage.nameEn})`,
		`年龄段：${stage.ageRange}`,
		"",
		"【特点】",
		...stage.characteristics.map((c) => `- ${c}`),
		"",
		"【适合活动】",
		...stage.activities.map((a) => `- ${a}`),
		"",
		"【关键能力】",
		...stage.keySkills.map((s) => `- ${s}`),
	];
	if (stage.readingLevel) {
		lines.push("", `【阅读水平】${stage.readingLevel}`);
	}
	if (stage.schoolSubjects.length > 0) {
		lines.push("", `【学校科目】${stage.schoolSubjects.join("、")}`);
	}
	return lines.join("\n");
}

function formatLearningStyle(style: LearningStyle): string {
	const info = LEARNING_STYLES.find((s) => s.style === style)!;
	const lines = [
		`🎯 学习风格：${info.name} (${info.nameEn})`,
		"",
		"【特点】",
		...info.characteristics.map((c) => `- ${c}`),
		"",
		"【学习策略】",
		...info.strategies.map((s) => `- ${s}`),
	];
	return lines.join("\n");
}

function formatInterests(interests: InterestCategory[]): string {
	if (interests.length === 0) return "未识别到具体兴趣";
	const lines = [`🎨 识别到的兴趣方向：`];
	for (const cat of interests) {
		const info = INTERESTS.find((i) => i.category === cat);
		if (info) {
			lines.push("", `【${info.name} (${info.nameEn})】`);
			lines.push(...info.activities.map((a) => `- ${a}`));
		}
	}
	return lines.join("\n");
}

export class EducatorAgent implements Agent {
	readonly id = "educator";
	readonly name = "教育规划师";
	readonly topics = ["education", "school", "development"] as const;
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
		const months = ageInMonths(child.birthDate);
		const stage = child.stage ?? computeStage(child.birthDate);
		const intent = detectIntent(question);

		switch (intent) {
			case "stage": {
				const eduStage = getEduStage(months);
				if (!eduStage) {
					return this.introReply();
				}
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatEduStage(eduStage)}\n\n${EDUCATOR_DISCLAIMER}`,
					confidence: 0.9,
					urgency: "info",
				};
			}
			case "style": {
				const style = detectLearningStyle(question);
				if (!style) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `请描述孩子的学习特点，例如：\n- 是否记得脸不记得名字（视觉型）\n- 是否喜欢讨论/自言自语（听觉型）\n- 是否坐不住/动手学得快（动觉型）\n- 是否喜欢记笔记（读写型）\n\n${EDUCATOR_DISCLAIMER}`,
						confidence: 0.3,
						urgency: "info",
					};
				}
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatLearningStyle(style)}\n\n${EDUCATOR_DISCLAIMER}`,
					confidence: 0.8,
					urgency: "info",
				};
			}
			case "interest": {
				const interests = detectInterests(question);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatInterests(interests)}\n\n${EDUCATOR_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "activity": {
				const interests = detectInterests(question);
				const finalInterests: InterestCategory[] =
					interests.length > 0 ? interests : ["stem", "arts"];
				const suggestions = suggestActivities(finalInterests, months, 30);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `🎯 30 分钟活动建议（${Math.floor(months)} 月龄）：\n${suggestions.map((s) => `- ${s}`).join("\n")}\n\n${EDUCATOR_DISCLAIMER}`,
					confidence: 0.75,
					urgency: "info",
				};
			}
			case "subject": {
				const eduStage = getEduStage(months);
				if (!eduStage || eduStage.schoolSubjects.length === 0) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `学龄前（${Math.floor(months)} 月龄）还没有正式学校科目，建议通过游戏和绘本培养兴趣。\n\n${EDUCATOR_DISCLAIMER}`,
						confidence: 0.7,
						urgency: "info",
					};
				}
				return {
					agentId: this.id,
					agentName: this.name,
					content: `📚 ${eduStage.name}阶段学校科目：\n${eduStage.schoolSubjects.map((s) => `- ${s}`).join("\n")}\n\n${EDUCATOR_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "general":
			default:
				return this.introReply();
		}
	}

	private introReply(): AgentReply {
		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是教育规划师，可以帮你：\n- 了解不同年龄阶段的学习特点\n- 识别孩子的学习风格（视觉/听觉/动觉/读写）\n- 兴趣方向（STEM/艺术/运动/语言/音乐/社交）\n- 推荐适合的活动\n\n请告诉我孩子的年龄和你关心的问题。\n\n${EDUCATOR_DISCLAIMER}`,
			confidence: 0.4,
			urgency: "info",
		};
	}
}

export function createEducatorAgent(): EducatorAgent {
	return new EducatorAgent();
}

export {
	EDU_STAGES,
	LEARNING_STYLES,
	INTERESTS,
	getEduStage,
	detectLearningStyle,
	detectInterests,
	suggestActivities,
	type EduStage,
	type EduStageInfo,
	type LearningStyle,
	type LearningStylePattern,
	type InterestCategory,
	type InterestInfo,
} from "./knowledge.js";
