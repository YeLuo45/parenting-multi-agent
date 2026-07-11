/**
 * AI Persona — switchable response styles for agents.
 *
 * Direction W: AI 教练人格化 (gentle / strict / scientific).
 *
 * Pure functions: no LLM call. Persona rewrites prefix/suffix/safety
 * language to match coaching style.
 */

export type PersonaId = "gentle" | "strict" | "scientific";

export interface Persona {
	id: PersonaId;
	name: string;
	nameEn: string;
	emoji: string;
	description: string;
	introPrefix: string;
	suffix: string;
	safetyDisclaimer: string;
	warmthLevel: 1 | 2 | 3 | 4 | 5;
	structuredLevel: 1 | 2 | 3 | 4 | 5;
}

export const PERSONAS: Persona[] = [
	{
		id: "gentle",
		name: "温柔陪伴",
		nameEn: "Gentle Companion",
		emoji: "🤗",
		description: "温和、同理心强、鼓励为主。适合焦虑或新手父母。",
		introPrefix: "亲爱的爸爸妈妈，",
		suffix: "您辛苦了，孩子正在健康长大 🌸",
		safetyDisclaimer:
			"⚠️ 如有任何疑虑，请及时就医。本建议仅供参考，不替代医生诊断。",
		warmthLevel: 5,
		structuredLevel: 2,
	},
	{
		id: "strict",
		name: "严格要求",
		nameEn: "Strict Coach",
		emoji: "📋",
		description: "结构化、目标导向、有明确时间表。适合追求卓越的父母。",
		introPrefix: "行动方案：",
		suffix: "请严格按计划执行，下个里程碑再见。",
		safetyDisclaimer:
			"⚠️ 本方案为标准化建议。如有不适或疑虑，立即咨询医生。",
		warmthLevel: 2,
		structuredLevel: 5,
	},
	{
		id: "scientific",
		name: "循证科学",
		nameEn: "Evidence-Based",
		emoji: "🔬",
		description:
			"数据驱动、引用研究、概率化语言。适合工程师/医生背景父母。",
		introPrefix: "基于现有循证证据，",
		suffix: "参考来源：WHO 育儿指南、AAP 儿科手册。",
		safetyDisclaimer: "⚠️ 置信度有限。强烈建议结合个体差异与最新医学文献。",
		warmthLevel: 2,
		structuredLevel: 5,
	},
];

const PERSONAS_BY_ID: ReadonlyMap<PersonaId, Persona> = new Map(
	PERSONAS.map((p) => [p.id, p]),
);

export function getPersona(id: PersonaId): Persona {
	const p = PERSONAS_BY_ID.get(id);
	if (!p) throw new Error(`Unknown persona: ${id}`);
	return p;
}

export function listPersonaIds(): PersonaId[] {
	return PERSONAS.map((p) => p.id);
}

export function detectPersonaFromQuery(query: string): PersonaId | null {
	const q = query.toLowerCase();
	if (/(温柔|温和|gentle|kind|soft|caring)/.test(q)) return "gentle";
	if (/(严格|strict|严谨|hardline|discipline)/.test(q)) return "strict";
	if (/(科学|循证|evidence|scientific|research|study|数据|data)/.test(q))
		return "scientific";
	return null;
}

export function applyPersonaToIntro(
	personaId: PersonaId,
	baseIntro: string,
): string {
	const p = getPersona(personaId);
	return `${p.introPrefix}\n\n${baseIntro}`;
}

export function applyPersonaToSuffix(
	personaId: PersonaId,
	baseSuffix: string,
): string {
	const p = getPersona(personaId);
	const lines = [baseSuffix, p.suffix, p.safetyDisclaimer].filter(Boolean);
	return lines.join("\n\n");
}

export function applyPersona(
	personaId: PersonaId,
	reply: { intro: string; body: string; suffix: string },
): string {
	const intro = applyPersonaToIntro(personaId, reply.intro);
	const suffix = applyPersonaToSuffix(personaId, reply.suffix);
	return [intro, reply.body, suffix].filter(Boolean).join("\n\n");
}

export function scorePersonaFit(
	personaId: PersonaId,
	parentProfile: {
		anxietyLevel?: number;
		dataDriven?: boolean;
		timeConstrained?: boolean;
	},
): number {
	const p = getPersona(personaId);
	let score = 3;
	if (parentProfile.anxietyLevel !== undefined) {
		if (parentProfile.anxietyLevel >= 4 && p.warmthLevel >= 4) score += 2;
		if (parentProfile.anxietyLevel <= 1 && p.warmthLevel <= 2) score += 1;
	}
	if (parentProfile.dataDriven) {
		if (p.id === "scientific") score += 3;
		else if (p.structuredLevel >= 4) score += 2;
	}
	if (parentProfile.timeConstrained) {
		if (p.id === "strict") score += 2;
		else if (p.structuredLevel >= 4) score += 1;
	}
	return score;
}

export function recommendPersona(profile: {
	anxietyLevel?: number;
	dataDriven?: boolean;
	timeConstrained?: boolean;
}): PersonaId {
	let best: PersonaId = "gentle";
	let bestScore = -Infinity;
	for (const id of listPersonaIds()) {
		const s = scorePersonaFit(id, profile);
		if (s > bestScore) {
			bestScore = s;
			best = id;
		}
	}
	return best;
}

export const PERSONA_DISCLAIMER =
	"⚠️ 教练风格可切换。选择最适合您当前状态的风格。";
