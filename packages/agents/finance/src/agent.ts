/**
 * FinanceAgent — education funds, insurance, school fees, budgeting.
 */

import { type ChildProfile, computeStage } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	calculateFundValue,
	type EducationFundPlan,
	estimateTotalEducationCost,
	getEssentialInsurance,
	getRecommendedPlan,
	getSchoolFee,
	INSURANCE_TYPES,
	type SchoolFee,
} from "./knowledge.js";

export const FINANCE_DISCLAIMER =
	"⚠️ 本回复仅供参考，不构成理财或保险建议。具体方案请咨询注册理财师/保险经纪人/税务师。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function detectIntent(
	question: string,
): "fund" | "insurance" | "fees" | "total" | "general" {
	const q = question.toLowerCase();
	if (/(教育金|基金|储蓄|存款|定投|投资|saving|fund|invest)/i.test(q))
		return "fund";
	if (/(保险|insurance|重疾|意外险|医疗险|医保|社保|保单)/i.test(q))
		return "insurance";
	if (/(总费用|总成本|总共|total|大学费用|留学费用)/i.test(q)) return "total";
	if (/(学费|费用|多少钱|公立|私立|school.fee|tuition|支出)/i.test(q))
		return "fees";
	return "general";
}

function formatFundPlan(plan: EducationFundPlan, _ageMonths: number): string {
	const value = Math.round(calculateFundValue(plan));
	const lines = [
		`💰 推荐教育金计划：${plan.name}`,
		"",
		`${plan.description}`,
		`月投金额：${plan.monthlyAmount} 元`,
		`到期年限：${plan.yearsToMaturity} 年`,
		`预期年化：${plan.expectedAnnualReturn}%`,
		`预计总收益：${value.toLocaleString()} 元（按复利计算）`,
		"",
		"优点：",
		...plan.pros.map((p) => `- ${p}`),
		"",
		"缺点：",
		...plan.cons.map((c) => `- ${c}`),
	];
	return lines.join("\n");
}

function formatInsurance(): string {
	const essentials = getEssentialInsurance();
	const recommended = INSURANCE_TYPES.filter(
		(i) => i.priority === "recommended",
	);
	const lines = [
		"🛡️ 儿童保险优先级建议：",
		"",
		"【必备】",
		...essentials.map((i) => `- ${i.name}（${i.typicalCost}）：${i.notes}`),
		"",
		"【推荐】",
		...recommended.map(
			(i) => `- ${i.name}（${i.typicalCost}）：${i.notes}`,
		),
		"",
		"建议：先办理少儿医保 → 意外险 → 重疾险，按预算选择。",
	];
	return lines.join("\n");
}

function formatFees(fee: SchoolFee): string {
	const lines = [
		`🏫 ${fee.stage}（${fee.ageRange}）学费估算：`,
		"",
		`公立学校：${fee.publicSchool.toLocaleString()} 元/年`,
		`私立学校：${fee.privateSchool.toLocaleString()} 元/年`,
		`课外兴趣班：${fee.extracurricular.toLocaleString()} 元/年`,
		"",
		`公立总计：${(fee.publicSchool + fee.extracurricular).toLocaleString()} 元/年`,
		`私立总计：${(fee.privateSchool + fee.extracurricular).toLocaleString()} 元/年`,
	];
	return lines.join("\n");
}

function formatTotal(tier: "public" | "private" | "study_abroad"): string {
	const total = estimateTotalEducationCost(tier);
	const tierName =
		tier === "public" ? "公立" : tier === "private" ? "私立" : "留学";
	return [
		`📊 ${tierName}路径教育总成本估算（出生到大学）：`,
		"",
		`约 ${total.toLocaleString()} 元（${(total / 10000).toFixed(1)} 万元）`,
		"",
		"包含：幼儿园 + 小学 + 初中 + 高中 + 大学 学费 + 课外兴趣班",
	].join("\n");
}

export class FinanceAgent implements Agent {
	readonly id = "finance";
	readonly name = "家庭财务规划师";
	readonly topics = ["finance"] as const;
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
		const months = ageInMonths(child.birthDate);
		const stage = child.stage ?? computeStage(child.birthDate);
		const intent = detectIntent(question);

		switch (intent) {
			case "fund": {
				const plan = getRecommendedPlan(months);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatFundPlan(plan, months)}\n\n${FINANCE_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "insurance":
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatInsurance()}\n\n${FINANCE_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			case "fees": {
				const stageFeeMap: Record<string, string> = {
					toddler: "幼儿园",
					preschool: "幼儿园",
					school_age: "小学",
					tween: "初中",
					teen: "高中",
					young_adult: "大学（国内）",
				};
				const fee = getSchoolFee(stageFeeMap[stage] ?? "小学")!;
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatFees(fee)}\n\n${FINANCE_DISCLAIMER}`,
					confidence: 0.8,
					urgency: "info",
				};
			}
			case "total": {
				const tier: "public" | "private" | "study_abroad" =
					/留学|abroad/i.test(question)
						? "study_abroad"
						: /私立|private/i.test(question)
							? "private"
							: "public";
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatTotal(tier)}\n\n${FINANCE_DISCLAIMER}`,
					confidence: 0.8,
					urgency: "info",
				};
			}
			default:
				return {
					agentId: this.id,
					agentName: this.name,
					content: `我是家庭财务规划师，可以帮你：\n- 教育金储蓄计划\n- 儿童保险配置（医保/意外/重疾）\n- 学费估算（公立/私立/留学）\n- 教育总成本预算\n\n请告诉我你的具体问题。\n\n${FINANCE_DISCLAIMER}`,
					confidence: 0.4,
					urgency: "info",
				};
		}
	}
}

export function createFinanceAgent(): FinanceAgent {
	return new FinanceAgent();
}

export {
	calculateFundValue,
	EDUCATION_FUND_PLANS,
	type EducationFundPlan,
	estimateTotalEducationCost,
	type FinanceTopic,
	getEssentialInsurance,
	getInsurance,
	getRecommendedPlan,
	getSchoolFee,
	INSURANCE_TYPES,
	type InsuranceType,
	SCHOOL_FEES,
	type SchoolFee,
} from "./knowledge.js";
