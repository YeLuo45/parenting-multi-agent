/**
 * PediatricianAgent — child health triage, vaccines, milestones, medication.
 *
 * Phase 1: rule-based + keyword matching (no LLM call). Sufficient for
 * triage and basic info; real LLM integration in Phase 2.
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type {
	Agent,
	AgentContext,
	AgentReply,
	UrgencyLevel,
} from "@parenting/orchestrator";

import {
	VACCINE_SCHEDULE,
	getVaccinesForAge,
	getNextVaccine,
	triageSymptom,
	getMilestonesForAge,
	calculateDose,
	type VaccineInfo,
	type TriageRule,
	type Milestone,
} from "./knowledge.js";

export const PEDIATRICIAN_DISCLAIMER =
	"⚠️ 本回复仅供参考，不构成医疗建议。如有疑虑请及时就医或咨询儿科医生。";

// Exported for testing
export function formatMilestonesForTest(milestones: Milestone[], ageMonths: number): string {
	const byDomain = new Map<string, Milestone[]>();
	for (const m of milestones) {
		const list = byDomain.get(m.domain) ?? [];
		list.push(m);
		byDomain.set(m.domain, list);
	}
	const DOMAIN_NAMES: Record<Milestone["domain"], string> = {
		motor: "运动",
		language: "语言",
		social: "社交",
		cognitive: "认知",
	};
	const lines: string[] = [`${Math.floor(ageMonths)} 月龄宝宝典型发育里程碑：`];
	for (const [domain, list] of byDomain) {
		const domainName = DOMAIN_NAMES[domain as Milestone["domain"]] ?? domain;
		lines.push(`\n【${domainName}】`);
		for (const m of list) lines.push(`- ${m.description}`);
	}
	return lines.join("\n");
}

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function detectIntent(question: string): "vaccine" | "illness" | "milestone" | "medication" | "general" {
	const q = question.toLowerCase();
	if (/(疫苗|打针|vaccine|immuniz|接种)/i.test(q)) return "vaccine";
	if (
		/(发烧|fever|咳嗽|cough|感冒|腹泻|皮疹|呕吐|便秘|sick|ill|痛|呼吸困难|喘息)/i.test(q) &&
		!/(药|medication|dose|剂量|吃多少|美林|泰诺林|布洛芬|对乙酰|退烧药|aceta|ibu)/i.test(q)
	)
		return "illness";
	if (/(发育|里程碑|发展|长牙|走路|说话|milestone|development)/i.test(q)) return "milestone";
	if (
		/(药|medication|剂量|dose|吃多少|美林|泰诺林|布洛芬|对乙酰|退烧药|aceta|ibu)/i.test(q)
	)
		return "medication";
	return "general";
}

function formatVaccineList(vaccines: VaccineInfo[], ageMonths: number): string {
	const lines = vaccines.map((v) => `- ${v.name} (${v.nameEn}) — ${v.recommendedAgeMonths} 月龄`);
	return `宝宝 ${Math.floor(ageMonths)} 个月，已经/应该接种的疫苗：\n${lines.join("\n")}`;
}

function formatMilestones(milestones: Milestone[], ageMonths: number): string {
	if (milestones.length === 0) return `${Math.floor(ageMonths)} 月龄的发育里程碑数据库暂缺，建议咨询儿科医生。`;
	const byDomain = new Map<string, Milestone[]>();
	for (const m of milestones) {
		const list = byDomain.get(m.domain) ?? [];
		list.push(m);
		byDomain.set(m.domain, list);
	}
	const DOMAIN_NAMES: Record<Milestone["domain"], string> = {
		motor: "运动",
		language: "语言",
		social: "社交",
		cognitive: "认知",
	};
	const lines: string[] = [`${Math.floor(ageMonths)} 月龄宝宝典型发育里程碑：`];
	for (const [domain, list] of byDomain) {
		lines.push(`\n【${DOMAIN_NAMES[domain as Milestone["domain"]]}】`);
		for (const m of list) lines.push(`- ${m.description}`);
	}
	return lines.join("\n");
}

export class PediatricianAgent implements Agent {
	readonly id = "pediatrician";
	readonly name = "儿科医生";
	readonly topics = ["health", "illness", "vaccine", "development"] as const;
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
		const intent = detectIntent(question);

		switch (intent) {
			case "vaccine": {
				const past = getVaccinesForAge(months);
				const next = getNextVaccine(months);
				const content = [formatVaccineList(past, months), next ? `下一针：${next.name}（${next.nameEn}），建议月龄 ${next.recommendedAgeMonths} 个月` : "已完成所有基础疫苗计划"]
					.join("\n\n");
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${content}\n\n${PEDIATRICIAN_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "illness": {
				const rule = triageSymptom(question, months);
				if (!rule) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `无法确定具体症状，请补充描述：\n- 主要症状（发烧/咳嗽/皮疹...）\n- 持续时间\n- 体温（如发烧）\n- 精神状态\n\n${PEDIATRICIAN_DISCLAIMER}`,
						confidence: 0.5,
						urgency: "low",
					};
				}
				const isRedFlag = rule.urgency === "emergency" || rule.urgency === "high";
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${rule.advice}\n\n${PEDIATRICIAN_DISCLAIMER}`,
					confidence: 0.9,
					urgency: rule.urgency,
					redFlag: isRedFlag
						? {
								severity: rule.urgency,
								ruleId: "TRIAGE_" + rule.symptom.source.slice(0, 10),
								description: rule.redFlagDescription,
								action: "建议尽快就医",
							}
						: undefined,
				};
			}
			case "milestone": {
				const milestones = getMilestonesForAge(months);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatMilestones(milestones, months)}\n\n注：每个宝宝发育节奏不同，略有早晚一般正常。落后超过 2-3 个月建议咨询医生。\n\n${PEDIATRICIAN_DISCLAIMER}`,
					confidence: 0.8,
					urgency: "info",
				};
			}
			case "medication": {
				// Try to extract weight and drug
				const weightMatch = question.match(/(\d+(?:\.\d+)?)\s*(kg|公斤)/i);
				const drugMatch = /(acetaminophen|paracetamol|ibuprofen|布洛芬|对乙酰氨基酚|美林|泰诺林)/i.exec(question);
				if (!weightMatch) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `请提供宝宝体重（kg）和药名，我才能计算剂量。\n\n${PEDIATRICIAN_DISCLAIMER}`,
						confidence: 0.3,
						urgency: "info",
					};
				}
				if (!drugMatch) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `请提供药名（如美林、泰诺林、布洛芬、对乙酰氨基酚等）。\n\n${PEDIATRICIAN_DISCLAIMER}`,
						confidence: 0.3,
						urgency: "info",
					};
				}
				const weight = parseFloat(weightMatch[1]);
				const drugKey = /布洛芬|ibuprofen|美林/i.test(drugMatch[0]) ? "ibuprofen" : "acetaminophen";
				const result = calculateDose(drugKey, weight, months);
				if (!result.ok) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `❌ ${result.reason}\n\n${PEDIATRICIAN_DISCLAIMER}`,
						confidence: 0.7,
						urgency: "medium",
					};
				}
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${drugKey} 单次剂量：${result.singleDoseMg.toFixed(1)} mg（按 ${weight} kg 体重计算）\n\n${PEDIATRICIAN_DISCLAIMER}`,
					confidence: 0.75,
					urgency: "info",
				};
			}
			case "general":
			default: {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `我是儿科医生，可以帮你解答：\n- 疫苗接种时间\n- 常见疾病（发烧/咳嗽/腹泻/皮疹）护理\n- 发育里程碑\n- 用药剂量\n\n请告诉我你关心的问题。\n\n${PEDIATRICIAN_DISCLAIMER}`,
					confidence: 0.4,
					urgency: "info",
				};
			}
		}
	}
}

/** Default factory. */
export function createPediatricianAgent(): PediatricianAgent {
	return new PediatricianAgent();
}

/** Re-export knowledge utilities for advanced users. */
export {
	VACCINE_SCHEDULE,
	getVaccinesForAge,
	getNextVaccine,
	triageSymptom,
	getMilestonesForAge,
	calculateDose,
	type VaccineInfo,
	type TriageRule,
	type Milestone,
} from "./knowledge.js";
