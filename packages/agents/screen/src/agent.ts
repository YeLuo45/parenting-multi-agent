/**
 * @parenting/agent-screen — developmental/behavioral screening agent.
 */

import type { ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	applicableItems,
	formatScreenResult,
	itemsForScale,
	SCREEN_DISCLAIMER,
	type ScaleId,
	scoreScale,
} from "./knowledge.js";

export { scoreScale as scaleScale };
export {
	type AnswerValue,
	applicableItems,
	type Domain,
	detectRedFlags,
	formatScreenResult,
	itemsForScale,
	SCREEN_DISCLAIMER,
	SCREEN_ITEMS,
	type ScaleId,
	type ScreenItem,
	type ScreenResult,
	scoreScale,
} from "./knowledge.js";

export const SCREEN_VERSION = "0.1.0";

function detectIntent(
	question: string,
): "scale" | "mchat" | "cbcl" | "asq" | "general" {
	const q = question.toLowerCase();
	if (/(自闭|孤独症|asd|m-chat)/i.test(q)) return "mchat";
	if (/(cbcl[\u4e00-\u9fff:-]?|行为量表|情绪量表|行为问题|情绪问题)/i.test(q))
		return "cbcl";
	if (/(asq[\u4e00-\u9fff:-]?|发育筛查|里程碑.*筛查)/i.test(q)) return "asq";
	if (/(筛查|测评|量表|developmental|screen)/i.test(q)) return "scale";
	return "general";
}

export class ScreenAgent implements Agent {
	readonly id = "screen";
	readonly name = "发育筛查助手";
	readonly topics = ["development", "knowledge"] as const;
	readonly stages = [
		"toddler",
		"preschool",
		"school_age",
		"tween",
		"teen",
	] as const;

	async respond(
		question: string,
		child: ChildProfile,
		_context: AgentContext,
	): Promise<AgentReply> {
		const ageMonths = ageInMonths(child.birthDate);

		// First: try to parse structured answer input (e.g. "cbcl-1=2 cbcl-2=1")
		const parsedAnswers = parseAnswers(question);
		if (parsedAnswers && Object.keys(parsedAnswers).length > 0) {
			const detectedScale = detectScaleFromAnswers(parsedAnswers);
			if (detectedScale) {
				const result = scoreScale(
					detectedScale,
					parsedAnswers,
					ageMonths,
				);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatScreenResult(result)}\n\n${SCREEN_DISCLAIMER}`,
					confidence: 0.9,
					urgency: result.riskLevel === "high" ? "high" : "info",
				};
			}
		}

		const intent = detectIntent(question);

		if (
			intent === "scale" ||
			intent === "mchat" ||
			intent === "cbcl" ||
			intent === "asq"
		) {
			const scaleId: ScaleId =
				intent === "mchat"
					? "mchat"
					: intent === "cbcl"
						? "cbcl"
						: intent === "asq"
							? "asq"
							: "cbcl";
			const items = itemsForScale(scaleId, ageMonths);
			if (items.length === 0) {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `当前年龄（${ageMonths} 月）不在 ${scaleId.toUpperCase()} 量表的适用范围内。`,
					confidence: 0.4,
					urgency: "info",
				};
			}
			const lines = [
				`📝 ${scaleId.toUpperCase()} 适用题目（共 ${items.length} 题）：`,
				"",
				...items.map(
					(it, i) =>
						`${i + 1}. ${it.question}\n   答案：0=否  1=有时  2=经常`,
				),
				"",
				"请按题目顺序回答（0/1/2），输入后我会自动评分。",
				"",
				SCREEN_DISCLAIMER,
			];
			return {
				agentId: this.id,
				agentName: this.name,
				content: lines.join("\n"),
				confidence: 0.85,
				urgency: "info",
			};
		}

		// General — show summary
		const applicable = applicableItems(ageMonths);
		const lines = [
			`我是发育筛查助手，可以帮你：`,
			`- CBCL 行为/情绪筛查（${ageMonths >= 18 && ageMonths <= 60 ? "当前月龄适用" : "不适用此月龄"}）`,
			`- ASQ-3 发育筛查（${ageMonths >= 24 && ageMonths <= 60 ? "当前月龄适用" : "不适用此月龄"}）`,
			`- M-CHAT 自闭症谱系筛查（${ageMonths >= 16 && ageMonths <= 30 ? "当前月龄适用" : "不适用此月龄"}）`,
			``,
			`当前月龄（${ageMonths} 月）共 ${applicable.length} 个适用题目。`,
			``,
			`例如："M-CHAT 筛查" 或 "ASQ 测评"`,
			``,
			SCREEN_DISCLAIMER,
		];
		return {
			agentId: this.id,
			agentName: this.name,
			content: lines.join("\n"),
			confidence: 0.6,
			urgency: "info",
		};
	}
}

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return Math.max(
		0,
		(asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
	);
}

function parseAnswers(question: string): Record<string, 0 | 1 | 2> | null {
	const out: Record<string, 0 | 1 | 2> = {};
	const matches = [
		...question.matchAll(
			/(?:^|\s)([a-zA-Z][\w-]*)\s*[=:]\s*([012])(?:\s|$)/g,
		),
	];
	for (const m of matches) {
		const id = m[1]!;
		const v = parseInt(m[2]!, 10);
		if (v >= 0 && v <= 2) out[id] = v as 0 | 1 | 2;
	}
	if (Object.keys(out).length === 0) return null;
	return out;
}

function detectScaleFromAnswers(
	answers: Record<string, 0 | 1 | 2>,
): ScaleId | null {
	const ids = Object.keys(answers);
	if (ids.some((id) => id.startsWith("mchat"))) return "mchat";
	if (ids.some((id) => id.startsWith("asq"))) return "asq";
	if (ids.some((id) => id.startsWith("cbcl"))) return "cbcl";
	return null;
}

export function createScreenAgent(): ScreenAgent {
	return new ScreenAgent();
}
