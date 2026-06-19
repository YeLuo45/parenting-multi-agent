/**
 * PsychologistAgent — child emotions, behavior, developmental psychology.
 *
 * Phase 1: rule-based + keyword matching (no LLM call).
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	EMOTION_PATTERNS,
	BEHAVIOR_PROBLEMS,
	ERIKSON_STAGES,
	detectEmotions,
	matchBehaviorProblem,
	getEriksonStage,
	type BehaviorProblem,
	type Emotion,
	type EriksonStage,
} from "./knowledge.js";

export const PSYCHOLOGIST_DISCLAIMER =
	"⚠️ 本回复仅供参考，不构成心理咨询或诊疗建议。如有严重或持续问题，请联系专业儿童心理咨询师或医生。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

export function detectIntent(
	question: string,
): "emotion" | "behavior" | "development" | "self_harm" | "family" | "general" {
	const q = question.toLowerCase();
	if (/(自残|自杀|想死|自伤|self.harm|suicide|不想活|想消失)/i.test(q)) return "self_harm";
	if (
		/(发脾气|哭闹|tantrum|打人|咬人|咬|hit|biting|分离焦虑|挑食|偏食|睡眠倒退|夜醒|不肯睡|看手机|看视频|screen|黏人|同胞|兄弟姐妹|争宠|欺负|被欺负|抢|争|打架|欺负|被欺负|小弟弟|小姐姐|老大|老二|小的)/i.test(
			q,
		)
	)
		return "behavior";
	if (/(情绪|害怕|怕|哭|伤心|生气|emotion|afraid|scared|anxious|焦虑|嫉妒|吃醋|jealous)/i.test(q)) return "emotion";
	if (/(发育|发展|心理|发展心理学|erikson|依恋|attachment|青春期|叛逆|teen)/i.test(q)) return "development";
	if (/(家庭|夫妻|婆媳|祖辈|离婚|family|grandparent|divorce|爸爸|妈妈|夫妻关系)/i.test(q)) return "family";
	return "general";
}

function formatStrategies(problem: BehaviorProblem): string {
	const lines = [
		`📋 ${problem.name} (${problem.nameEn}) 应对策略：`,
		"",
	];
	problem.strategies.forEach((s, i) => {
		lines.push(`${i + 1}. ${s}`);
	});
	lines.push("");
	lines.push(`🆘 何时寻求专业帮助：${problem.professionalHelp}`);
	return lines.join("\n");
}

export { formatStrategies };

function formatErikson(stage: EriksonStage): string {
	return [
		`🧠 Erikson 心理社会发展阶段：${stage.ageRange}`,
		"",
		`核心冲突：${stage.psychosocialCrisis}`,
		`培养美德：${stage.virtue}`,
		"",
		`💡 家长指南：${stage.parentGuidance}`,
	].join("\n");
}

export class PsychologistAgent implements Agent {
	readonly id = "psychologist";
	readonly name = "儿童心理咨询师";
	readonly topics = ["emotion", "behavior", "development", "family"] as const;
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
			case "self_harm": {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `🚨 ${BEHAVIOR_PROBLEMS[8].name}\n\n${BEHAVIOR_PROBLEMS[8].strategies.join("\n")}\n\n${PSYCHOLOGIST_DISCLAIMER}`,
					confidence: 0.98,
					urgency: "emergency",
					redFlag: {
						severity: "emergency",
						ruleId: "PSY_B009",
						description: BEHAVIOR_PROBLEMS[8].name,
						action: "立即专业心理危机干预",
					},
				};
			}
			case "emotion": {
				const emotions = detectEmotions(question);
				if (emotions.length === 0) {
					return this.introReply();
				}
				const emotionNames: Record<Emotion, string> = {
					happy: "开心",
					sad: "伤心",
					angry: "生气",
					afraid: "害怕",
					anxious: "焦虑",
					frustrated: "挫败",
					ashamed: "羞愧",
					jealous: "嫉妒",
					calm: "平静",
					neutral: "中性",
				};
				const emotionList = emotions.map((e) => emotionNames[e]).join("、");
				const content = [
					`识别到的情绪：${emotionList}`,
					"",
					"💡 通用建议：",
					"1. 命名情绪：'我看到你现在很生气/难过'",
					"2. 验证情绪：'生气是正常的'",
					"3. 等情绪平稳再讨论或讲道理",
					"4. 教替代表达：'你可以跺脚/说'我生气了''",
					"5. 不否定情绪（'别哭了''有什么好怕的'会让孩子学会压抑）",
				].join("\n");
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${content}\n\n${PSYCHOLOGIST_DISCLAIMER}`,
					confidence: 0.8,
					urgency: "info",
				};
			}
			case "behavior": {
				const problem = matchBehaviorProblem(question, months);
				if (!problem) {
					return this.introReply();
				}
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatStrategies(problem)}\n\n${PSYCHOLOGIST_DISCLAIMER}`,
					confidence: 0.85,
					urgency: problem.urgency,
					redFlag: undefined,
				};
			}
			case "development": {
				const erikson = getEriksonStage(stage);
				if (!erikson) return this.introReply();
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatErikson(erikson)}\n\n${PSYCHOLOGIST_DISCLAIMER}`,
					confidence: 0.8,
					urgency: "info",
				};
			}
			case "family": {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `家庭关系对孩子的心理发展至关重要：\n\n1. 父母关系：父母间有冲突但能修复，孩子学会'关系可以修复'\n2. 隔代养育：与祖辈建立统一战线，但避免当着孩子面分歧\n3. 离婚/分居：告诉孩子'爸爸和妈妈分开住，但他们都爱你'\n4. 避免让孩子成为'传声筒'或'情绪容器'\n\n具体家庭场景请补充描述，我能给更针对性的建议。\n\n${PSYCHOLOGIST_DISCLAIMER}`,
					confidence: 0.7,
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
			content: `我是儿童心理咨询师，可以帮你解答：\n- 情绪问题（生气/害怕/焦虑/嫉妒）\n- 行为问题（发脾气/打人/咬人/挑食/睡眠）\n- 发展心理学（依恋/青春期/叛逆）\n- 家庭关系（夫妻/隔代/离婚）\n\n请告诉我具体场景。\n\n${PSYCHOLOGIST_DISCLAIMER}`,
			confidence: 0.4,
			urgency: "info",
		};
	}
}

export function createPsychologistAgent(): PsychologistAgent {
	return new PsychologistAgent();
}

export {
	EMOTION_PATTERNS,
	BEHAVIOR_PROBLEMS,
	ERIKSON_STAGES,
	detectEmotions,
	matchBehaviorProblem,
	getEriksonStage,
	type BehaviorProblem,
	type Emotion,
	type EmotionPattern,
	type EriksonStage,
} from "./knowledge.js";
