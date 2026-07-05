/**
 * CryDecoderAgent — classifies a parent's cry description into a
 * probability distribution over common reasons and suggests the 5 S's
 * soothing plan appropriate for the child's age.
 */

import type { ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";
import type { CryDistribution, CryReasonProfile } from "./knowledge.js";
import {
	buildEmptyDistribution,
	CRY_DISCLAIMER,
	CRY_REASON_BY_ID,
	CRY_REASON_PROFILES,
	FIVE_S,
} from "./knowledge.js";

/** Score a question against a single reason profile. */
export function scoreReason(
	question: string,
	profile: CryReasonProfile,
): { score: number; triggersMatched: string[] } {
	const q = question.toLowerCase();
	const matched: string[] = [];
	for (const t of profile.triggers) {
		if (q.includes(t.toLowerCase())) matched.push(t);
	}
	if (matched.length === 0) return { score: 0, triggersMatched: [] };
	// Diminishing returns: first match full weight, each next adds half.
	let s = profile.triggerWeight;
	for (let i = 1; i < matched.length; i++)
		s += profile.triggerWeight / (i + 1);
	return { score: s, triggersMatched: matched };
}

/** Build a distribution over all reasons from a free-text question. */
export function classifyCry(question: string): CryDistribution[] {
	const dist = buildEmptyDistribution();
	let total = 0;
	for (let i = 0; i < CRY_REASON_PROFILES.length; i++) {
		const p = CRY_REASON_PROFILES[i];
		if (p.id === "unknown") continue;
		const { score, triggersMatched } = scoreReason(question, p);
		dist[i] = {
			reason: p.id,
			name: p.name,
			score,
			triggersMatched,
		};
		total += score;
	}
	// If nothing matched, give "unknown" the full 1.0 weight.
	if (total === 0) {
		const idx = dist.findIndex((d) => d.reason === "unknown");
		if (idx >= 0) dist[idx] = { ...dist[idx], score: 1 };
		return dist;
	}
	// Normalize to 0..1.
	return dist.map((d) =>
		d.reason === "unknown"
			? { ...d, score: 0 }
			: { ...d, score: d.score / total },
	);
}

/** Compute the highest urgency across a top-N distribution. */
export function maxUrgencyOf(top: readonly CryDistribution[]): number {
	return top.reduce<number>((acc, d) => {
		const p = CRY_REASON_BY_ID.get(d.reason);
		return p && p.urgency > acc ? p.urgency : acc;
	}, 0);
}

/** Return the top-N reasons by score (ties broken by urgency, then name). */
export function topReasons(
	dist: readonly CryDistribution[],
	n = 3,
): CryDistribution[] {
	return [...dist]
		.filter((d) => d.score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			const pa = CRY_REASON_BY_ID.get(a.reason);
			const pb = CRY_REASON_BY_ID.get(b.reason);
			const ua = pa?.urgency ?? 0;
			const ub = pb?.urgency ?? 0;
			if (ua !== ub) return ub - ua;
			return a.name.localeCompare(b.name);
		})
		.slice(0, n);
}

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function detectIntent(
	question: string,
): "classify" | "soothe" | "colic" | "teething" | "general" {
	const q = question.toLowerCase();
	if (/(怎么哄|安抚|哄睡|sooth|calm|5s|五s|5 s)/i.test(q)) return "soothe";
	if (/(肠绞痛|colic|胀气|放屁|飞机抱)/i.test(q)) return "colic";
	if (/(出牙|teething|牙龈|流口水)/i.test(q)) return "teething";
	// Classify when the question is explicitly asking *why* the baby is
	// crying. Match either a 哭/哭闹 token by itself, or a "为什么...哭"
	// / "怎么...哭" / "...哭闹" form. We intentionally avoid "哭.*了"
	// because in Chinese that often reads as "...了 哭" ("started crying
	// after X") which is a description, not a question.
	if (
		/(为什么|怎么|怎么回事|哭闹|哭的原因|哭的|哭吗|什么.*哭|哭什么|why.*cry|why.*crying|哭)/i.test(
			q,
		)
	)
		return "classify";
	return "general";
}

function formatDistribution(top: readonly CryDistribution[]): string {
	if (top.length === 0) {
		return "🤔 没有匹配到具体原因。建议依次排查:饿/困/尿布/冷热/刺激。";
	}
	const lines = ["🔍 可能的哭闹原因(按概率):"];
	for (let i = 0; i < top.length; i++) {
		const t = top[i];
		const pct = Math.round(t.score * 100);
		lines.push(
			`${i + 1}. ${t.name} — ${pct}%${t.triggersMatched.length > 0 ? ` (匹配: ${t.triggersMatched.join(", ")})` : ""}`,
		);
	}
	return lines.join("\n");
}

/** Public re-export of the distribution formatter for advanced tests. */
export const _formatDistribution = formatDistribution;

function formatAdvice(top: readonly CryDistribution[]): string {
	if (top.length === 0) return "";
	const lines = ["📋 对应建议:"];
	for (const t of top) {
		const p = CRY_REASON_BY_ID.get(t.reason);
		if (!p) continue;
		lines.push(`\n【${p.name}】 ${p.advice}`);
	}
	return lines.join("\n");
}

/** Public re-export of the advice formatter for advanced tests. */
export const _formatAdvice = formatAdvice;

function formatFiveS(months: number): string {
	const applicable = FIVE_S.filter(
		(s) => months >= s.minAgeMonths && months <= s.maxAgeMonths,
	);
	if (applicable.length === 0) return "";
	const lines = ["\n🌟 5 S 安抚法(Dr. Harvey Karp,适用当前月龄):"];
	for (const s of applicable) {
		lines.push(`- ${s.name}: ${s.description} (${s.duration})`);
	}
	return lines.join("\n");
}

/** Public re-export of the 5S formatter for advanced tests. */
export const _formatFiveS = formatFiveS;

function formatColic(): string {
	return [
		"🌙 肠绞痛应对:",
		"1. 飞机抱:宝宝俯卧在大人前臂上,头靠肘弯,轻拍背",
		"2. 腹部按摩:用指尖顺时针按摩宝宝肚脐周围",
		"3. 白噪音:吸尘器/吹风机声(音量 ≤ 宝宝哭声)",
		"4. 温水澡:放松腹部肌肉",
		"5. 西甲硅油(遵医嘱):减少肠道气泡",
		"",
		"⏰ 肠绞痛通常在 6 周达高峰,3-4 月自行缓解。",
	].join("\n");
}

function formatTeething(months: number): string {
	return [
		`🦷 ${Math.floor(months)} 月龄出牙期:`,
		"- 冷藏牙胶(冰箱冷藏,不要冷冻)",
		"- 干净纱布蘸凉水按摩牙龈",
		"- 磨牙饼干(6 月+ 已加辅食)",
		"- 出牙期可伴低烧(<38.5°C)、流口水、轻微腹泻",
		"- 如发烧 >38.5°C 或持续 >24h,可能不是出牙,需就医",
	].join("\n");
}

function urgencyFromMax(maxUrgency: number): "info" | "medium" | "high" {
	if (maxUrgency >= 4) return "high";
	if (maxUrgency >= 3) return "medium";
	return "info";
}

/** Public re-export of the urgency mapper for advanced tests. */
export const _urgencyFromMax = urgencyFromMax;

export class CryDecoderAgent implements Agent {
	readonly id = "cry-decoder";
	readonly name = "哭闹解码师";
	readonly topics = ["cry", "behavior", "emotion"] as const;
	readonly stages = ["newborn", "infant", "toddler", "preschool"] as const;

	async respond(
		question: string,
		child: ChildProfile,
		_context: AgentContext,
	): Promise<AgentReply> {
		const months = ageInMonths(child.birthDate);
		const intent = detectIntent(question);

		switch (intent) {
			case "classify": {
				const dist = classifyCry(question);
				const top = topReasons(dist, 3);
				const maxUrgency = maxUrgencyOf(top);
				const hasRealMatch = top.some(
					(d) => d.reason !== "unknown" && d.score > 0,
				);
				const content = [
					formatDistribution(top),
					formatAdvice(top),
					formatFiveS(months),
					"\n",
					CRY_DISCLAIMER,
				].join("\n");
				return {
					agentId: this.id,
					agentName: this.name,
					content,
					confidence: hasRealMatch ? 0.85 : 0.55,
					urgency: urgencyFromMax(maxUrgency),
				};
			}
			case "soothe": {
				const content = [
					`🌟 ${Math.floor(months)} 月龄可用的 5 S 安抚法:`,
					formatFiveS(months),
					"\n💡 顺序建议:先 Swaddle(0-4 月),再 Side,配合 Shush+Swing 节律,最后 Suck。",
					"\n",
					CRY_DISCLAIMER,
				].join("\n");
				return {
					agentId: this.id,
					agentName: this.name,
					content,
					confidence: 0.9,
					urgency: "info",
				};
			}
			case "colic": {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatColic()}\n\n${CRY_DISCLAIMER}`,
					confidence: 0.9,
					urgency: "medium",
				};
			}
			case "teething": {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatTeething(months)}\n\n${CRY_DISCLAIMER}`,
					confidence: 0.9,
					urgency: "info",
				};
			}
			default: {
				return {
					agentId: this.id,
					agentName: this.name,
					content: `我是哭闹解码师，可以帮你：\n- 分类哭闹原因（饿/困/肠绞痛/出牙/反流/刺激等）\n- 5 S 安抚法（0-12 月）\n- 肠绞痛应对\n- 出牙期护理\n\n请告诉我宝宝月龄和具体哭闹表现。\n\n${CRY_DISCLAIMER}`,
					confidence: 0.4,
					urgency: "info",
				};
			}
		}
	}
}

/** Default factory. */
export function createCryDecoderAgent(): CryDecoderAgent {
	return new CryDecoderAgent();
}

export type {
	CryDistribution,
	CryReason,
	CryReasonProfile,
	CrySoothingStep,
} from "./knowledge.js";
// Re-export knowledge utilities for advanced users.
export {
	buildEmptyDistribution,
	CRY_DISCLAIMER,
	CRY_REASON_BY_ID,
	CRY_REASON_PROFILES,
	FIVE_S,
} from "./knowledge.js";
