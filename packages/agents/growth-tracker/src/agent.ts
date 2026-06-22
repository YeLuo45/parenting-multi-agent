/**
 * GrowthTrackerAgent — height/weight/head circumference percentiles + developmental milestones.
 *
 * Phase 2 batch 2: rule-based + table lookup. No LLM call.
 */

import type { ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	calculateBMI,
	classifyBMI,
	classifyPercentile,
	detectGrowthConcern,
	estimatePercentile,
	GROWTH_STANDARDS,
	type GrowthMetric,
	type GrowthSex,
	getMilestonesForAge,
} from "./knowledge.js";

export const GROWTH_DISCLAIMER =
	"⚠️ 生长数据参考 WHO/CDC 标准，但个体差异很大。如有疑虑请咨询儿科医生或儿童保健科。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return Math.max(
		0,
		(asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
	);
}

interface ParsedMeasurement {
	metric: GrowthMetric;
	value: number;
	sex: GrowthSex;
}

function parseMeasurement(question: string): ParsedMeasurement | null {
	const q = question.toLowerCase();
	const sex: GrowthSex = /(男|boy|male|儿子|男孩|男宝宝)/i.test(q)
		? "male"
		: "female";

	const numMatch = question.match(
		/(\d+(?:\.\d+)?)\s*(cm|厘米|kg|公斤|斤|千克)/i,
	);
	if (!numMatch) return null;
	const value = parseFloat(numMatch[1]);
	const unit = numMatch[2].toLowerCase();

	// Find the position of each metric keyword and the first number; pick the metric
	// whose keyword appears closest to (and before) the first number.
	const firstNumIdx = question.indexOf(numMatch[0]);
	const weightIdx = q.search(/(体重|weight|重|斤)/i);
	const heightIdx = q.search(/(身高|height|高|length|长)/i);
	const headIdx = q.search(/(头围|head.circumference|头)/i);

	const candidates: Array<{ metric: GrowthMetric; idx: number }> = [];
	if (weightIdx >= 0 && weightIdx < firstNumIdx + 5)
		candidates.push({ metric: "weight", idx: weightIdx });
	if (heightIdx >= 0 && heightIdx < firstNumIdx + 5)
		candidates.push({ metric: "height", idx: heightIdx });
	if (headIdx >= 0 && headIdx < firstNumIdx + 5)
		candidates.push({ metric: "head_circumference", idx: headIdx });

	if (candidates.length > 0) {
		// Pick metric closest to the first number
		candidates.sort(
			(a, b) =>
				Math.abs(firstNumIdx - a.idx) - Math.abs(firstNumIdx - b.idx),
		);
		const chosen = candidates[0].metric;
		if (chosen === "weight") {
			const kg = unit === "斤" ? value / 2 : value;
			return { metric: "weight", value: kg, sex };
		}
		if (chosen === "head_circumference") {
			return { metric: "head_circumference", value, sex };
		}
		return { metric: "height", value, sex };
	}

	// Default: first number's unit determines metric
	if (unit === "kg" || unit === "公斤" || unit === "千克") {
		return { metric: "weight", value, sex };
	}
	return { metric: "height", value, sex };
}

function detectIntent(
	question: string,
): "measure" | "milestone" | "bmi" | "velocity" | "general" {
	const q = question.toLowerCase();
	if (/(里程碑|milestone|发育|发展|会不会|能不能|是否|should|can)/i.test(q))
		return "milestone";
	if (/(bmi|体质指数|肥胖|超重|underweight|overweight|obese)/i.test(q))
		return "bmi";
	if (/(体重增长|增长速度|增重|gain|velocity|g\/day|克.*天)/i.test(q))
		return "velocity";
	// Measure: any number with units, OR any of the metric keywords
	if (/(\d+(?:\.\d+)?\s*(cm|厘米|kg|公斤|斤|千克))/i.test(q))
		return "measure";
	if (/(身高|体重|头围|height|weight|head|高|重)/i.test(q)) return "measure";
	return "general";
}

function formatPercentile(
	metric: GrowthMetric,
	value: number,
	percentile: number,
	ageMonths: number,
	sex: GrowthSex,
): string {
	const label = {
		height: "身高",
		weight: "体重",
		head_circumference: "头围",
	}[metric];
	const unit = metric === "weight" ? "kg" : "cm";
	const classification = classifyPercentile(percentile);
	const classLabel = {
		low: "⚠️ 偏低",
		below_avg: "略低",
		average: "正常",
		above_avg: "略高",
		high: "⚠️ 偏高",
	}[classification];
	const sexLabel = sex === "male" ? "男" : "女";
	return `${label} ${value} ${unit} → P${percentile}（${sexLabel}孩 ${Math.floor(ageMonths)} 月龄，${classLabel}）`;
}

function formatMeasurement(
	parsed: ParsedMeasurement,
	ageMonths: number,
): string {
	const p = estimatePercentile(
		parsed.value,
		ageMonths,
		parsed.metric,
		parsed.sex,
	);
	const line = formatPercentile(
		parsed.metric,
		parsed.value,
		p,
		ageMonths,
		parsed.sex,
	);
	const concern = detectGrowthConcern({
		metric: parsed.metric,
		value: parsed.value,
		ageMonths,
		sex: parsed.sex,
	});
	const lines = [line];
	if (concern.concern) {
		lines.push(`\n🚨 ${concern.reason}`);
	}
	// Add WHO reference
	const std = GROWTH_STANDARDS.find((r) => r.ageMonths <= ageMonths);
	if (std) {
		lines.push(
			`参考范围 (${Math.floor(ageMonths)}月龄${parsed.sex === "male" ? "男" : "女"})：P3=${std[parsed.sex][parsed.metric].p3}, P50=${std[parsed.sex][parsed.metric].p50}, P97=${std[parsed.sex][parsed.metric].p97}`,
		);
	}
	return lines.join("\n");
}

function formatMilestones(ageMonths: number): string {
	const { expected, redFlags } = getMilestonesForAge(ageMonths);
	const lines = [`📋 ${Math.floor(ageMonths)} 月龄发育里程碑：`];
	if (expected.length === 0 && redFlags.length === 0) {
		lines.push("（该月龄暂无具体里程碑）");
	} else {
		if (expected.length > 0) {
			lines.push("\n✅ 应该达到：");
			for (const m of expected) {
				const domainLabel = {
					gross_motor: "大运动",
					fine_motor: "精细动作",
					language: "语言",
					social: "社交",
					cognitive: "认知",
				}[m.domain];
				lines.push(`- [${domainLabel}] ${m.description}`);
			}
		}
		if (redFlags.length > 0) {
			lines.push("\n🚨 警示信号（出现需就医）：");
			for (const m of redFlags) {
				const domainLabel = {
					gross_motor: "大运动",
					fine_motor: "精细动作",
					language: "语言",
					social: "社交",
					cognitive: "认知",
				}[m.domain];
				lines.push(`- [${domainLabel}] ${m.description}`);
			}
		}
	}
	return lines.join("\n");
}

function formatBMI(
	weightKg: number,
	heightCm: number,
	ageMonths: number,
): string {
	const bmi = calculateBMI(weightKg, heightCm);
	const cls = classifyBMI(bmi, ageMonths);
	const clsLabel = {
		underweight: "偏瘦",
		normal: "正常",
		overweight: "超重",
		obese: "肥胖",
	}[cls];
	return `📊 BMI = ${bmi} (${clsLabel})\n计算：${weightKg}kg ÷ (${heightCm / 100}m)²`;
}

function formatVelocity(
	current: number,
	previous: number,
	currentAgeDays: number,
	previousAgeDays: number,
): string {
	// Caller guarantees deltaDays > 0 and all args defined, so v is always a number.
	const deltaDays = currentAgeDays - previousAgeDays;
	const deltaWeight = current - previous;
	const v = Math.round(((deltaWeight * 1000) / deltaDays) * 10) / 10;
	const advice =
		v < 20
			? "⚠️ 增重过慢，需就医评估"
			: v < 30
				? "增重正常（正常范围 20-30 g/天）"
				: "增重较快";
	return `📈 体重增长速度：${v} g/天\n${advice}`;
}

export class GrowthTrackerAgent implements Agent {
	readonly id = "growth-tracker";
	readonly name = "成长追踪";
	readonly topics = ["growth"] as const;
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
		const ageMonths = ageInMonths(child.birthDate);
		const intent = detectIntent(question);

		if (intent === "measure") {
			const parsed = parseMeasurement(question);
			if (!parsed) {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `请提供具体数值，例如：\n- "宝宝6个月，体重8.5kg"\n- "身高75cm"\n- "头围42cm"\n\n${GROWTH_DISCLAIMER}`,
					confidence: 0.3,
					urgency: "info",
				};
			}
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatMeasurement(parsed, ageMonths)}\n\n${GROWTH_DISCLAIMER}`,
				confidence: 0.85,
				urgency: "info",
			};
		}

		if (intent === "milestone") {
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatMilestones(ageMonths)}\n\n${GROWTH_DISCLAIMER}`,
				confidence: 0.85,
				urgency: "info",
			};
		}

		if (intent === "bmi") {
			const parsed = parseMeasurement(question);
			if (!parsed || parsed.metric !== "weight") {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `计算 BMI 需要身高和体重，例如：\n"BMI 体重 20kg 身高 110cm"\n\n${GROWTH_DISCLAIMER}`,
					confidence: 0.3,
					urgency: "info",
				};
			}
			// Try to extract height from same question
			const hMatch = question.match(/(\d+(?:\.\d+)?)\s*(cm|厘米)/i);
			const heightCm = hMatch ? parseFloat(hMatch[1]) : 100;
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatBMI(parsed.value, heightCm, ageMonths)}\n\n${GROWTH_DISCLAIMER}`,
				confidence: 0.8,
				urgency: "info",
			};
		}

		if (intent === "velocity") {
			// Try to extract two weights
			const numbers = [...question.matchAll(/(\d+(?:\.\d+)?)/g)].map(
				(m) => parseFloat(m[1]),
			);
			if (numbers.length < 2) {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `计算增重速度需要两次体重数据，例如：\n"出生 3.3kg，现在 5.0kg，70天"\n\n${GROWTH_DISCLAIMER}`,
					confidence: 0.3,
					urgency: "info",
				};
			}
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatVelocity(numbers[1], numbers[0], ageMonths * 30, 0)}\n\n${GROWTH_DISCLAIMER}`,
				confidence: 0.75,
				urgency: "info",
			};
		}

		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是成长追踪助手，可以帮你：\n- 查询生长百分位（输入"身高 75cm"或"体重 8.5kg"）\n- 查看发育里程碑（输入"发育"或"里程碑"）\n- 计算 BMI（输入"BMI" + 体重身高）\n- 计算增重速度（输入"体重增长"）\n\n${GROWTH_DISCLAIMER}`,
			confidence: 0.5,
			urgency: "info",
		};
	}
}

export function createGrowthTrackerAgent(): GrowthTrackerAgent {
	return new GrowthTrackerAgent();
}

export {
	calculateBMI,
	classifyBMI,
	classifyPercentile,
	detectGrowthConcern,
	estimatePercentile,
	GROWTH_STANDARDS,
	type GrowthMetric,
	type GrowthSex,
	type GrowthStandardRow,
	getMilestonesForAge,
	getPercentiles,
	type Milestone,
	weightGainVelocity,
} from "./knowledge.js";
