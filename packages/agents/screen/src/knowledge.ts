/**
 * @parenting/agent-screen — Standardized developmental & behavioral
 * screening scales for early identification of risk.
 *
 * Direction Q: Screen Scales.
 *
 * Scales (all rule-based, no LLM):
 * - CBCL: Child Behavior Checklist (1.5-5y) — 10 items
 * - ASQ-3: Ages and Stages Questionnaire (2-60mo) — 10 items per domain
 * - M-CHAT-R/F: Modified Checklist for Autism in Toddlers (16-30mo) — 20 items
 */

export type ScaleId = "cbcl" | "asq" | "mchat";

export type AnswerValue = 0 | 1 | 2;

export type Domain =
	| "emotional"
	| "behavioral"
	| "social"
	| "communication"
	| "cognitive"
	| "motor"
	| "autism_screen";

export interface ScreenItem {
	id: string;
	scaleId: ScaleId;
	domain: Domain;
	question: string;
	questionEn: string;
	minAgeMonths: number;
	maxAgeMonths: number;
}

export interface ScreenResult {
	scaleId: ScaleId;
	totalScore: number;
	maxScore: number;
	percentile: number;
	riskLevel: "low" | "borderline" | "high";
	domainScores: Record<string, number>;
	redFlags: string[];
	recommendation: string;
}

export const SCREEN_ITEMS: ScreenItem[] = [
	// ─── CBCL (1.5-5y, ages 18-60mo) ───────────────────────────────
	{
		id: "cbcl-1",
		scaleId: "cbcl",
		domain: "emotional",
		question: "孩子经常显得忧虑、担心吗？",
		questionEn: "Does the child seem worried or anxious often?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	{
		id: "cbcl-2",
		scaleId: "cbcl",
		domain: "emotional",
		question: "孩子经常哭泣、容易伤心吗？",
		questionEn: "Does the child cry or get upset easily?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	{
		id: "cbcl-3",
		scaleId: "cbcl",
		domain: "behavioral",
		question: "孩子很难安静下来、坐不住吗？",
		questionEn: "Is it hard for the child to sit still?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	{
		id: "cbcl-4",
		scaleId: "cbcl",
		domain: "behavioral",
		question: "孩子经常发脾气、尖叫吗？",
		questionEn: "Does the child have tantrums or scream often?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	{
		id: "cbcl-5",
		scaleId: "cbcl",
		domain: "social",
		question: "孩子不愿与其他小朋友一起玩吗？",
		questionEn: "Does the child avoid playing with other kids?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	{
		id: "cbcl-6",
		scaleId: "cbcl",
		domain: "social",
		question: "孩子不愿被抱或被亲近吗？",
		questionEn: "Does the child resist being held or comforted?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	{
		id: "cbcl-7",
		scaleId: "cbcl",
		domain: "behavioral",
		question: "孩子有攻击行为（打人、咬人）吗？",
		questionEn: "Does the child act aggressively (hit, bite)?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	{
		id: "cbcl-8",
		scaleId: "cbcl",
		domain: "communication",
		question: "孩子语言发展明显落后吗？",
		questionEn: "Is the child's speech clearly delayed?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	{
		id: "cbcl-9",
		scaleId: "cbcl",
		domain: "emotional",
		question: "孩子经常发脾气、摔东西吗？",
		questionEn: "Does the child have frequent outbursts?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	{
		id: "cbcl-10",
		scaleId: "cbcl",
		domain: "social",
		question: "孩子难以适应新环境或陌生人吗？",
		questionEn: "Does the child struggle with new situations?",
		minAgeMonths: 18,
		maxAgeMonths: 60,
	},
	// ─── ASQ-3 (2-60mo) ─────────────────────────────────────────
	{
		id: "asq-comm-1",
		scaleId: "asq",
		domain: "communication",
		question: "孩子能听懂简单指令（如：过来、坐下）吗？",
		questionEn: "Can the child follow simple commands?",
		minAgeMonths: 24,
		maxAgeMonths: 60,
	},
	{
		id: "asq-comm-2",
		scaleId: "asq",
		domain: "communication",
		question: "孩子能说出 10 个以上的词吗？",
		questionEn: "Can the child say 10+ words?",
		minAgeMonths: 24,
		maxAgeMonths: 60,
	},
	{
		id: "asq-comm-3",
		scaleId: "asq",
		domain: "communication",
		question: "孩子能说出两词短句吗？",
		questionEn: "Can the child say two-word phrases?",
		minAgeMonths: 24,
		maxAgeMonths: 60,
	},
	{
		id: "asq-motor-1",
		scaleId: "asq",
		domain: "motor",
		question: "孩子能独立跑吗？",
		questionEn: "Can the child run independently?",
		minAgeMonths: 24,
		maxAgeMonths: 60,
	},
	{
		id: "asq-motor-2",
		scaleId: "asq",
		domain: "motor",
		question: "孩子能自己上下楼梯吗？",
		questionEn: "Can the child climb stairs alone?",
		minAgeMonths: 24,
		maxAgeMonths: 60,
	},
	{
		id: "asq-motor-3",
		scaleId: "asq",
		domain: "motor",
		question: "孩子能用笔画圆吗？",
		questionEn: "Can the child draw a circle?",
		minAgeMonths: 36,
		maxAgeMonths: 60,
	},
	{
		id: "asq-cog-1",
		scaleId: "asq",
		domain: "cognitive",
		question: "孩子能数 1-5 吗？",
		questionEn: "Can the child count to 5?",
		minAgeMonths: 36,
		maxAgeMonths: 60,
	},
	{
		id: "asq-cog-2",
		scaleId: "asq",
		domain: "cognitive",
		question: "孩子能识别颜色吗？",
		questionEn: "Can the child identify colors?",
		minAgeMonths: 36,
		maxAgeMonths: 60,
	},
	{
		id: "asq-soc-1",
		scaleId: "asq",
		domain: "social",
		question: "孩子能轮流和等待吗？",
		questionEn: "Can the child take turns and wait?",
		minAgeMonths: 36,
		maxAgeMonths: 60,
	},
	{
		id: "asq-soc-2",
		scaleId: "asq",
		domain: "social",
		question: "孩子会模仿大人活动吗？",
		questionEn: "Does the child imitate adult activities?",
		minAgeMonths: 24,
		maxAgeMonths: 60,
	},
	// ─── M-CHAT-R/F (16-30mo) ───────────────────────────────────
	{
		id: "mchat-1",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "如果您指向房间里的某个东西，孩子会看吗？",
		questionEn:
			"If you point at something across the room, does the child look?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
	{
		id: "mchat-2",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "您有没有怀疑过孩子可能耳聋？",
		questionEn: "Have you ever wondered if your child is deaf?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
	{
		id: "mchat-3",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "孩子会玩假装游戏吗（如：假装喝茶）？",
		questionEn: "Does the child play pretend (e.g., make-believe tea)?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
	{
		id: "mchat-4",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "孩子喜欢爬到东西上面吗？",
		questionEn: "Does the child like climbing on things?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
	{
		id: "mchat-5",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "孩子会在您周围做出不寻常的手指动作吗？",
		questionEn: "Does the child make unusual finger movements near eyes?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
	{
		id: "mchat-6",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "孩子会用一根手指指东西来索要或求助吗？",
		questionEn: "Does the child use a finger to point to ask for help?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
	{
		id: "mchat-7",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "孩子会用一根手指指东西向您展示有趣的东西吗？",
		questionEn: "Does the child point to show interesting things?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
	{
		id: "mchat-8",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "孩子会对其他小朋友感兴趣吗？",
		questionEn: "Is the child interested in other children?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
	{
		id: "mchat-9",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "孩子会把东西拿给您看或带来给您吗（不仅是求助）？",
		questionEn: "Does the child bring things to show you?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
	{
		id: "mchat-10",
		scaleId: "mchat",
		domain: "autism_screen",
		question: "当您叫孩子的名字时，孩子会回应吗？",
		questionEn: "Does the child respond when you call their name?",
		minAgeMonths: 16,
		maxAgeMonths: 30,
	},
];

const SCALE_MAX: Record<ScaleId, number> = {
	cbcl: 10,
	asq: 10,
	mchat: 10,
};

const HIGH_RISK_THRESHOLD: Record<ScaleId, number> = {
	cbcl: 7,
	asq: 6,
	mchat: 3, // mchat: 3+ positive answers (out of 10) = risk
};

const BORDERLINE_THRESHOLD: Record<ScaleId, number> = {
	cbcl: 5,
	asq: 4,
	mchat: 2,
};

/**
 * Pick items applicable for a given age in months.
 */
export function applicableItems(ageMonths: number): ScreenItem[] {
	return SCREEN_ITEMS.filter(
		(m) => ageMonths >= m.minAgeMonths && ageMonths <= m.maxAgeMonths,
	);
}

/**
 * Pick items for a specific scale + age.
 */
export function itemsForScale(
	scaleId: ScaleId,
	ageMonths: number,
): ScreenItem[] {
	return SCREEN_ITEMS.filter(
		(m) =>
			m.scaleId === scaleId &&
			ageMonths >= m.minAgeMonths &&
			ageMonths <= m.maxAgeMonths,
	);
}

/**
 * Compute percentile from total score using piecewise-linear approximation.
 */
function scoreToPercentile(scaleId: ScaleId, score: number): number {
	const max = SCALE_MAX[scaleId];
	const ratio = score / max;
	// Linear: 0% → P95 (low risk), 100% → P5 (high risk)
	const pct = Math.round(95 - ratio * 90);
	return Math.max(5, Math.min(99, pct));
}

/**
 * Score a screening scale from a map of { itemId: answerValue }.
 *
 * - answerValue 0 = no concern (best)
 * - answerValue 1 = some concern
 * - answerValue 2 = high concern (worst)
 *
 * Higher total score = more concerning behavior.
 */
export function scoreScale(
	scaleId: ScaleId,
	answers: Record<string, AnswerValue>,
	ageMonths: number,
): ScreenResult {
	const items = itemsForScale(scaleId, ageMonths);
	const totalScore = items.reduce(
		(sum, it) => sum + (answers[it.id] ?? 0),
		0,
	);
	const maxScore = items.length * 2;
	const domainScores: Record<string, number> = {};
	for (const it of items) {
		domainScores[it.domain] =
			(domainScores[it.domain] ?? 0) + (answers[it.id] ?? 0);
	}
	const high = HIGH_RISK_THRESHOLD[scaleId];
	const borderline = BORDERLINE_THRESHOLD[scaleId];
	let riskLevel: ScreenResult["riskLevel"];
	if (totalScore >= high) riskLevel = "high";
	else if (totalScore >= borderline) riskLevel = "borderline";
	else riskLevel = "low";
	const percentile = scoreToPercentile(scaleId, totalScore);
	const redFlags = detectRedFlags(scaleId, answers, ageMonths);
	const recommendation = buildRecommendation(riskLevel, scaleId);
	return {
		scaleId,
		totalScore,
		maxScore,
		percentile,
		riskLevel,
		domainScores,
		redFlags,
		recommendation,
	};
}

/**
 * Detect red-flag items that should be escalated regardless of total score.
 * For mchat, items 2, 5, 10 are high-specificity red flags.
 */
export function detectRedFlags(
	scaleId: ScaleId,
	answers: Record<string, AnswerValue>,
	ageMonths: number,
): string[] {
	const items = itemsForScale(scaleId, ageMonths);
	const redFlagIds = new Set<string>();
	if (scaleId === "mchat") {
		// M-CHAT critical red-flag items (high specificity for ASD)
		redFlagIds.add("mchat-2");
		redFlagIds.add("mchat-5");
		redFlagIds.add("mchat-10");
	}
	const flags: string[] = [];
	for (const item of items) {
		if (redFlagIds.has(item.id) && (answers[item.id] ?? 0) >= 1) {
			flags.push(item.question);
		}
	}
	return flags;
}

function buildRecommendation(
	risk: ScreenResult["riskLevel"],
	scaleId: ScaleId,
): string {
	if (risk === "high") {
		if (scaleId === "mchat")
			return "建议立即转诊儿童发育行为科或精神科进一步评估";
		if (scaleId === "cbcl") return "建议联系儿科医生或儿童心理师进一步评估";
		return "建议联系儿科或发育行为专科做全面发育评估";
	}
	if (risk === "borderline") {
		return "建议 3-6 个月后复测，并关注日常行为变化";
	}
	return "当前未发现显著风险，继续常规发育监测";
}

/**
 * Format a screen result as a Chinese markdown block.
 */
export function formatScreenResult(result: ScreenResult): string {
	const lines: string[] = [
		`📋 筛查结果（${result.scaleId.toUpperCase()}）`,
		`总分：${result.totalScore}/${result.maxScore} → P${result.percentile}（${result.riskLevel === "high" ? "⚠️ 高风险" : result.riskLevel === "borderline" ? "⚠️ 临界" : "✅ 低风险"}）`,
		"",
		"【分领域得分】",
	];
	for (const [domain, score] of Object.entries(result.domainScores)) {
		lines.push(`- ${domain}: ${score}`);
	}
	if (result.redFlags.length > 0) {
		lines.push("", "🚨 红旗项：");
		for (const f of result.redFlags) lines.push(`- ${f}`);
	}
	lines.push("", `建议：${result.recommendation}`);
	return lines.join("\n");
}

export const SCREEN_DISCLAIMER =
	"⚠️ 本筛查为参考工具，结果不能替代医生诊断。如有疑虑请咨询儿科或发育行为专科。";
