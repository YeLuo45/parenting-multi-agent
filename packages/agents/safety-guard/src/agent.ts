/**
 * SafetyGuardAgent — age-specific hazard checklists + first aid cheat-sheet + triage.
 *
 * Phase 2 batch 2: deterministic rule-based engine. No LLM call.
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	HAZARDS,
	FIRST_AID_GUIDES,
	getHazardsForAge,
	getHazardsByCategory,
	getHazardById,
	getCriticalHazards,
	getFirstAidGuide,
	getAllFirstAidTopics,
	triageSeverity,
	type Hazard,
	type HazardCategory,
	type FirstAidTopic,
} from "./knowledge.js";

export const SAFETY_DISCLAIMER =
	"⚠️ 本助手提供通用安全知识与急救参考，不能替代医生或急救服务。紧急情况请立即拨打 120（中国）/ 911（美国）/ 999（香港）。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return Math.max(0, (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

function detectIntent(question: string): "hazard" | "first_aid" | "triage" | "checklist" | "category" | "general" {
	const q = question.toLowerCase();
	if (/(急救|first.aid|cpr|心肺复苏|止血|海姆立克|heimlich|choking|burn.*怎么处理)/i.test(q)) return "first_aid";
	if (/(检查|checklist|清单|全部|所有|有哪些|list)/i.test(q)) return "checklist";
	if (/(窒息|choking|中毒|poison|烫伤|burn|溺水|drown|触电|跌倒|fall|绳.*勒|中暑|car.*hot|车内|安全座椅|枪|firearm|gun|插座|电线|楼梯|换尿布|意外|风险)/i.test(q)) return "hazard";
	if (/(紧急|emergency|911|120|triage|严重|严不严重|怎么办|怎么办)/i.test(q)) return "triage";
	return "general";
}

export function detectCategory(question: string): HazardCategory | undefined {
	if (/(窒息|呛|choke|卡喉)/i.test(question)) return "choking";
	if (/(中毒|poison|误食|清洁剂|药物)/i.test(question)) return "poisoning";
	if (/(烫|烧伤|burn|热水)/i.test(question)) return "burn";
	if (/(溺水|drown|浴缸|泳池|水)/i.test(question)) return "drowning";
	if (/(跌|摔|fall|楼梯|高处)/i.test(question)) return "fall";
	if (/(绳|勒|strang|窗帘)/i.test(question)) return "strangulation";
	if (/(电|触电|electrical|插座)/i.test(question)) return "electrical";
	if (/(车|vehicle|座椅|安全带|中暑.*车)/i.test(question)) return "vehicle";
	if (/(枪|firearm|gun)/i.test(question)) return "firearm";
	return undefined;
}

export function detectFirstAidTopic(question: string): FirstAidTopic | undefined {
	if (/(窒息|chok|卡喉|海姆立克)/i.test(question)) return "choking";
	if (/(cpr|心肺复苏|没有呼吸|心跳停止)/i.test(question)) return "cpr";
	if (/(出血|流血|bleeding|止血)/i.test(question)) return "bleeding";
	if (/(烫伤|烧伤|burn)/i.test(question)) return "burn";
	if (/(发烧|fever|发热|高烧)/i.test(question)) return "fever";
	if (/(头部|头.*撞|head.*injur|脑震荡)/i.test(question)) return "head_injury";
	if (/(过敏|allerg|荨麻疹|过敏反应)/i.test(question)) return "allergen";
	if (/(溺水|drown|落水)/i.test(question)) return "drowning";
	if (/(中毒|poison|误食|清洁剂|药物.*误)/i.test(question)) return "poisoning";
	return undefined;
}

function formatHazard(h: Hazard): string {
	const severityLabel = { high: "🔴 高风险", medium: "🟡 中风险", low: "🟢 低风险" }[h.severity];
	const lines = [`${severityLabel} ${h.title}`, h.description, ""];
	lines.push("✅ 预防措施：");
	for (const p of h.prevention) {
		lines.push(`- ${p}`);
	}
	return lines.join("\n");
}

function formatFirstAid(topic: FirstAidTopic, isInfant: boolean): string {
	const guide = getFirstAidGuide(topic, isInfant);
	/* v8 ignore next */
	if (!guide) return "暂无该急救主题。";
	const urgencyLabel = {
		emergency: "🚨 紧急（立即拨打 120）",
		urgent: "⚠️ 紧急（尽快就医）",
		soon: "⏰ 重要（24 小时内就医）",
	}[guide.urgency];
	const lines = [`${urgencyLabel} ${guide.title}`, ""];
	lines.push("📋 步骤：");
	for (const step of guide.steps) {
		const durPart = step.durationSeconds ? ` (${step.durationSeconds}秒)` : "";
		const warnPart = step.warning ? ` ⚠️ ${step.warning}` : "";
		lines.push(`  ${step.order}. ${step.action}${durPart}${warnPart}`);
	}
	if (guide.whenToCall911.length > 0) {
		lines.push("\n📞 立即拨打 120：");
		for (const w of guide.whenToCall911) {
			lines.push(`- ${w}`);
		}
	}
	if (guide.commonMistakes.length > 0) {
		lines.push("\n❌ 常见错误：");
		for (const m of guide.commonMistakes) {
			lines.push(`- ${m}`);
		}
	}
	return lines.join("\n");
}

function formatChecklist(ageMonths: number): string {
	const critical = getCriticalHazards(ageMonths);
	const all = getHazardsForAge(ageMonths);
	const lines = [`🛡️ ${Math.floor(ageMonths)} 月龄安全检查清单（共 ${all.length} 项，🔴 高风险 ${critical.length} 项）：`, ""];
	if (critical.length > 0) {
		lines.push("🔴 高风险（必须排查）：");
		for (const h of critical) {
			lines.push(`- ${h.title}`);
		}
		lines.push("");
	}
	const others = all.filter((h) => h.severity !== "high");
	if (others.length > 0) {
		lines.push("🟡 中低风险：");
		for (const h of others) {
			lines.push(`- ${h.title}`);
		}
	}
	return lines.join("\n");
}

function formatTriage(question: string): string {
	const severity = triageSeverity(question);
	const urgencyLabels = {
		emergency: "🚨 **紧急情况**",
		urgent: "⚠️ **较紧急**",
		routine: "ℹ️ **常规关注**",
	};
	const advice =
		severity === "emergency"
			? "立即拨打 120（中国）/ 911（美国），同时进行急救措施（窒息/无意识/大出血 → 立即 CPR 或 Heimlich）"
			: severity === "urgent"
				? "尽快带就医或拨打健康热线咨询"
				: "可先在家观察，记录症状变化；如有恶化及时就医";
	return `${urgencyLabels[severity]}\n\n${advice}\n\n${SAFETY_DISCLAIMER}`;
}

export class SafetyGuardAgent implements Agent {
	readonly id = "safety-guard";
	readonly name = "安全卫士";
	readonly topics = ["safety"] as const;
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
		const ageMonths = ageInMonths(child.birthDate);
		const intent = detectIntent(question);

		// First aid always takes priority — most critical info
		const firstAidTopic = detectFirstAidTopic(question);
		if (firstAidTopic) {
			const isInfant = ageMonths < 12;
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatFirstAid(firstAidTopic, isInfant)}\n\n${SAFETY_DISCLAIMER}`,
				confidence: 0.95,
				urgency: "high",
			};
		}

		// Triage intent
		if (intent === "triage") {
			return {
				agentId: this.id,
				agentName: this.name,
				content: formatTriage(question),
				confidence: 0.9,
				urgency: "high",
			};
		}

		// Hazard intent
		if (intent === "hazard") {
			const category = detectCategory(question);
			let hazards: Hazard[];
			if (category) {
				hazards = getHazardsByCategory(category).filter(
					(h) => ageMonths >= h.ageMonthsMin && ageMonths <= h.ageMonthsMax,
				);
			} else {
				hazards = getCriticalHazards(ageMonths);
			}
			if (hazards.length === 0) {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${Math.floor(ageMonths)} 月龄暂无该类风险提示。\n\n${SAFETY_DISCLAIMER}`,
					confidence: 0.4,
					urgency: "info",
				};
			}
			const formatted = hazards.map((h) => formatHazard(h)).join("\n\n---\n\n");
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatted}\n\n${SAFETY_DISCLAIMER}`,
				confidence: 0.85,
				urgency: hazards.some((h) => h.severity === "high") ? "high" : "info",
			};
		}

		// Checklist intent
		if (intent === "checklist") {
			return {
				agentId: this.id,
				agentName: this.name,
				content: `${formatChecklist(ageMonths)}\n\n${SAFETY_DISCLAIMER}`,
				confidence: 0.9,
				urgency: "info",
			};
		}

		// General — show checklist + help
		return {
			agentId: this.id,
			agentName: this.name,
			content: `我是安全卫士，可以帮你：\n- 安全清单（输入"检查清单"或"风险"）\n- 急救指南（窒息/烫伤/出血/CPR/发烧等）\n- 风险排查（输入具体风险："防窒息"、"防烫伤"）\n- 紧急程度评估（输入"严重吗"）\n\n${formatChecklist(ageMonths)}\n\n${SAFETY_DISCLAIMER}`,
			confidence: 0.6,
			urgency: "info",
		};
	}
}

export function createSafetyGuardAgent(): SafetyGuardAgent {
	return new SafetyGuardAgent();
}

export {
	HAZARDS,
	FIRST_AID_GUIDES,
	getHazardsForAge,
	getHazardsByCategory,
	getHazardById,
	getCriticalHazards,
	getFirstAidGuide,
	getAllFirstAidTopics,
	triageSeverity,
	type Hazard,
	type HazardCategory,
	type HazardSeverity,
	type FirstAidTopic,
	type FirstAidGuide,
	type FirstAidStep,
} from "./knowledge.js";