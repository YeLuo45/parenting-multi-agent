/**
 * Cry-decoder knowledge base — common reasons, age windows, soothing methods.
 *
 * Sources: Dr. Harvey Karp "Happiest Baby on the Block" 5 S's method,
 * AAP "Crying and Colic" guidance, NHS colic advice, common pediatric
 * triage wisdom.
 */

export type CryReason =
	| "hunger"
	| "tired"
	| "diaper"
	| "pain"
	| "colic"
	| "overstimulated"
	| "temperature"
	| "separation"
	| "teething"
	| "reflux"
	| "illness"
	| "unknown";

export type SoothingMethod = "swaddle" | "side" | "shush" | "swing" | "suck";

export interface CryReasonProfile {
	readonly id: CryReason;
	readonly name: string;
	readonly ageMonthsMin: number;
	readonly ageMonthsMax: number;
	/** Keyword triggers (lowercased). */
	readonly triggers: readonly string[];
	/** Sounds / cues that often accompany this reason. */
	readonly cues: readonly string[];
	/** Likelihood weight when a single trigger word is present. */
	readonly triggerWeight: number;
	/** How urgently a parent should respond (1=info, 5=urgent). */
	readonly urgency: 1 | 2 | 3 | 4 | 5;
	/** Plain-language advice for the parent. */
	readonly advice: string;
}

export const CRY_REASON_PROFILES: readonly CryReasonProfile[] = [
	{
		id: "hunger",
		name: "饿了",
		ageMonthsMin: 0,
		ageMonthsMax: 36,
		triggers: [
			"饿",
			"hungry",
			"hunger",
			"没吃",
			"没吃饱",
			"奶",
			"feed",
			"没喂",
			"该吃了",
		],
		cues: ["短促的呜咽", "转头寻找", "吮吸手指"],
		triggerWeight: 4,
		urgency: 2,
		advice: "尝试喂奶。新生儿胃小,2-3 小时就可能饿一次。",
	},
	{
		id: "tired",
		name: "困了",
		ageMonthsMin: 0,
		ageMonthsMax: 24,
		triggers: [
			"困",
			"tired",
			"sleepy",
			"揉眼",
			"打哈欠",
			"揉耳朵",
			"fussy",
		],
		cues: ["揉眼睛", "打哈欠", "目光涣散"],
		triggerWeight: 3,
		urgency: 1,
		advice: "安排小睡或睡觉。建立规律作息:0-3 月 4 次小睡,6 月 3 次,9 月 2 次,18 月 1 次。",
	},
	{
		id: "diaper",
		name: "尿布湿了",
		ageMonthsMin: 0,
		ageMonthsMax: 36,
		triggers: ["尿布", "diaper", "湿了", "大便", "poop", "换"],
		cues: ["扭动身体", "表情不舒服"],
		triggerWeight: 3,
		urgency: 1,
		advice: "检查并更换尿布。如果同时有大便,温水清洗并涂护臀膏。",
	},
	{
		id: "pain",
		name: "疼痛",
		ageMonthsMin: 0,
		ageMonthsMax: 60,
		triggers: ["痛", "疼", "pain", "hurt", "受伤", "扎到", "夹到", "戳"],
		cues: ["突然尖叫", "持续大哭", "身体僵硬"],
		triggerWeight: 4,
		urgency: 4,
		advice: "检查全身是否有红痕、头发缠住手指/脚趾、衣服线头卡住。",
	},
	{
		id: "colic",
		name: "肠绞痛",
		ageMonthsMin: 0,
		ageMonthsMax: 4,
		triggers: [
			"肠绞痛",
			"colic",
			"胀气",
			"放屁",
			"抱起来",
			"飞机抱",
			"肚子硬",
			"傍晚哭",
		],
		cues: ["双腿向腹部蜷缩", "握拳", "傍晚固定时间大哭"],
		triggerWeight: 5,
		urgency: 3,
		advice: "肠绞痛多在 2 周-4 月出现,傍晚固定时间大哭。飞机抱、腹部按摩、白噪音、洗温水澡可缓解。",
	},
	{
		id: "overstimulated",
		name: "过度刺激",
		ageMonthsMin: 0,
		ageMonthsMax: 18,
		triggers: [
			"刺激",
			"吵",
			"太多人",
			"陌生",
			"overstimulated",
			"人太多",
			"环境",
		],
		cues: ["转头避开", "尖叫推开"],
		triggerWeight: 3,
		urgency: 1,
		advice: "抱到安静、光线暗的房间,减少声音和视觉刺激。新生儿 0-3 月尤其敏感。",
	},
	{
		id: "temperature",
		name: "冷/热",
		ageMonthsMin: 0,
		ageMonthsMax: 24,
		triggers: ["热", "冷", "温度", "出汗", "cold", "hot", "太热", "太冷"],
		cues: ["出汗或打寒战", "脸红或苍白"],
		triggerWeight: 3,
		urgency: 2,
		advice: "检查后颈温度(手脚凉是正常的)。室温 24-26°C,比成人少穿一层。",
	},
	{
		id: "separation",
		name: "分离焦虑",
		ageMonthsMin: 6,
		ageMonthsMax: 36,
		triggers: [
			"妈妈",
			"抱",
			"离开",
			"不抱",
			"放下",
			"separation",
			"anxiety",
		],
		cues: ["粘人", "被放下就哭"],
		triggerWeight: 3,
		urgency: 1,
		advice: "6-18 月分离焦虑高峰。多陪伴,允许依附。这是健康发展的标志。",
	},
	{
		id: "teething",
		name: "出牙",
		ageMonthsMin: 4,
		ageMonthsMax: 24,
		triggers: ["出牙", "牙", "teething", "牙龈", "流口水", "咬"],
		cues: ["流口水", "咬东西", "牙龈红肿"],
		triggerWeight: 4,
		urgency: 2,
		advice: "冷藏牙胶、按摩牙龈。6 月后大部分宝宝开始出牙。",
	},
	{
		id: "reflux",
		name: "胃食管反流",
		ageMonthsMin: 0,
		ageMonthsMax: 12,
		triggers: [
			"反流",
			"reflux",
			"吐奶",
			"吃完就哭",
			"打嗝",
			"溢奶",
			"拱背",
		],
		cues: ["喂奶后哭", "频繁吐奶", "拱背"],
		triggerWeight: 4,
		urgency: 3,
		advice: "喂奶后竖抱 20-30 分钟,少食多餐。如果体重不增或吐奶带血,就医。",
	},
	{
		id: "illness",
		name: "可能生病",
		ageMonthsMin: 0,
		ageMonthsMax: 60,
		triggers: [
			"发烧",
			"fever",
			"咳嗽",
			"流鼻涕",
			"呕吐",
			"拉肚子",
			"皮疹",
			"sick",
			"ill",
		],
		cues: ["伴随其他症状", "精神差", "拒食"],
		triggerWeight: 5,
		urgency: 5,
		advice: "测量体温,观察其他症状。3 月以下发烧 38°C 立即就医,3 月以上持续 24h 就医。",
	},
	{
		id: "unknown",
		name: "不明原因",
		ageMonthsMin: 0,
		ageMonthsMax: 60,
		triggers: [],
		cues: [],
		triggerWeight: 1,
		urgency: 2,
		advice: "依次排查:饿/困/尿布/冷热/刺激。如持续 >2 小时无法安抚且伴其他症状,咨询医生。",
	},
];

export const CRY_REASON_BY_ID: ReadonlyMap<CryReason, CryReasonProfile> =
	new Map(CRY_REASON_PROFILES.map((p) => [p.id, p] as const));

export interface CryDistribution {
	readonly reason: CryReason;
	readonly name: string;
	readonly score: number;
	readonly triggersMatched: readonly string[];
}

export interface CrySoothingStep {
	readonly id: SoothingMethod;
	readonly name: string;
	readonly nameEn: string;
	readonly description: string;
	readonly minAgeMonths: number;
	readonly maxAgeMonths: number;
	readonly duration: string;
}

export const FIVE_S: readonly CrySoothingStep[] = [
	{
		id: "swaddle",
		name: "包裹 (Swaddle)",
		nameEn: "Swaddle",
		description: "用包巾紧裹宝宝上肢,模拟子宫束缚感。",
		minAgeMonths: 0,
		maxAgeMonths: 4,
		duration: "1-2 分钟",
	},
	{
		id: "side",
		name: "侧卧/俯卧 (Side/Stomach)",
		nameEn: "Side/Stomach Position",
		description: "抱时让宝宝侧卧或俯卧(睡觉时仍要仰卧,预防 SIDS)。",
		minAgeMonths: 0,
		maxAgeMonths: 6,
		duration: "安抚时使用",
	},
	{
		id: "shush",
		name: "嘘声 (Shush)",
		nameEn: "Shush",
		description:
			"在耳边发出 'shhh' 声或播白噪音(吹风机/吸尘器声),音量略大于哭声。",
		minAgeMonths: 0,
		maxAgeMonths: 6,
		duration: "持续到宝宝安静",
	},
	{
		id: "swing",
		name: "摇晃 (Swing)",
		nameEn: "Swing",
		description:
			"小幅度、有节奏的摇晃(头颈部始终有支撑)。绝对禁止剧烈摇晃。",
		minAgeMonths: 0,
		maxAgeMonths: 12,
		duration: "持续到宝宝安静",
	},
	{
		id: "suck",
		name: "吮吸 (Suck)",
		nameEn: "Suck",
		description: "安抚奶嘴或哺乳。吮吸是新生儿最强的安抚反射。",
		minAgeMonths: 0,
		maxAgeMonths: 12,
		duration: "直到放松",
	},
];

export const CRY_DISCLAIMER =
	"⚠️ 本回复仅供参考。持续哭闹 >2 小时无法安抚、伴发烧/呕吐/血便/呼吸急促,或 3 月以下宝宝发烧 38°C 以上,请立即就医。";

/** Trivial distribution builder used by the agent and tests. */
export function buildEmptyDistribution(): CryDistribution[] {
	return CRY_REASON_PROFILES.map((p) => ({
		reason: p.id,
		name: p.name,
		score: 0,
		triggersMatched: [],
	}));
}

// ─────────────────────────────────────────────────────────────────
// Soothing Plan Scheduler (Direction D)
// ─────────────────────────────────────────────────────────────────

export interface SoothingPlanStep {
	stepIdx: number;
	method: CrySoothingStep;
	startMin: number;
	endMin: number;
	reasonContext: CryReason[];
	notes: string;
}

export interface SoothingPlan {
	ageMonths: number;
	totalDurationMin: number;
	steps: SoothingPlanStep[];
	tip: string;
}

const STEP_DURATION_DEFAULTS: Record<SoothingMethod, number> = {
	swaddle: 2,
	side: 2,
	shush: 3,
	swing: 3,
	suck: 2,
};

const REASON_TO_METHOD_PREFERENCE: Partial<
	Record<CryReason, SoothingMethod[]>
> = {
	colic: ["swing", "shush", "swaddle", "side", "suck"],
	hunger: ["suck", "swaddle", "shush", "swing", "side"],
	tired: ["swaddle", "shush", "swing", "side", "suck"],
	pain: ["swaddle", "shush", "swing", "side", "suck"],
	overstimulated: ["swaddle", "shush", "side", "suck", "swing"],
	separation: ["swaddle", "shush", "swing", "side", "suck"],
	teething: ["swaddle", "shush", "swing", "side", "suck"],
	reflux: ["swing", "shush", "side", "suck", "swaddle"],
	diaper: ["swaddle", "swing", "shush", "suck", "side"],
	temperature: ["swaddle", "shush", "swing", "side", "suck"],
};

/**
 * Build an ordered soothing plan tailored to ageMonths and the top cry reasons.
 * - Filters methods by age window (minAgeMonths / maxAgeMonths)
 * - Orders methods by reason preference + global fallback order
 * - Computes cumulative timeline in minutes
 */
export function buildSoothingPlan(
	ageMonths: number,
	topReasons: readonly CryReason[],
	totalBudgetMin: number = 15,
): SoothingPlan {
	const allowed = FIVE_S.filter(
		(m) => ageMonths >= m.minAgeMonths && ageMonths <= m.maxAgeMonths,
	);
	// Build preference order: union of top-reason preferences, dedupe by id
	const preference: SoothingMethod[] = [];
	for (const r of topReasons) {
		const list = REASON_TO_METHOD_PREFERENCE[r];
		if (!list) continue;
		for (const m of list) {
			if (!preference.includes(m)) preference.push(m);
		}
	}
	// Fill remainder with allowed methods in default 5S order
	for (const m of allowed) {
		if (!preference.includes(m.id)) preference.push(m.id);
	}

	// Pick methods respecting budget (~2-3 min each)
	const steps: SoothingPlanStep[] = [];
	let elapsed = 0;
	let stepIdx = 1;
	for (const methodId of preference) {
		const method = allowed.find((m) => m.id === methodId);
		if (!method) continue;
		const duration = STEP_DURATION_DEFAULTS[methodId];
		if (elapsed + duration > totalBudgetMin) break;
		const end = elapsed + duration;
		steps.push({
			stepIdx,
			method,
			startMin: elapsed,
			endMin: end,
			reasonContext: [...topReasons],
			notes: pickNote(methodId, topReasons),
		});
		elapsed = end;
		stepIdx++;
	}

	const tip = buildPlanTip(ageMonths, steps.length);

	return {
		ageMonths,
		totalDurationMin: elapsed,
		steps,
		tip,
	};
}

function pickNote(
	method: SoothingMethod,
	reasons: readonly CryReason[],
): string {
	if (reasons.length === 0) return "按 5S 顺序依次尝试";
	if (
		reasons.includes("colic") &&
		(method === "swing" || method === "shush")
	) {
		return "肠绞痛：摇摆+白噪音组合最有效";
	}
	if (reasons.includes("pain") && method === "swaddle") {
		return "疼痛：包裹提供安全感，优先尝试";
	}
	if (reasons.includes("overstimulated") && method === "swaddle") {
		return "过度刺激：包裹+嘘声组合";
	}
	if (reasons.includes("hunger") && method === "suck") {
		return "饥饿：先哺乳或喂奶，再做其他安抚";
	}
	if (
		reasons.includes("tired") &&
		(method === "swaddle" || method === "shush")
	) {
		return "困倦：包裹+嘘声帮助入睡";
	}
	return "按方法顺序逐项尝试";
}

function buildPlanTip(ageMonths: number, stepCount: number): string {
	if (ageMonths < 3) {
		return `💡 ${stepCount} 步计划预计 ${stepCount * 2}-${stepCount * 3} 分钟。如 15 分钟仍未缓解，考虑就医。`;
	}
	if (ageMonths < 6) {
		return `💡 ${stepCount} 步计划。如全部失败，尝试换个环境（推车/开车短途）。`;
	}
	return `💡 ${stepCount} 步计划。注意检查是否有发烧/外伤/腹胀等器质性原因。`;
}

/**
 * Decide the next step adaptively based on which step we're at and how much
 * time has elapsed. Returns the next step to try, or null when plan is exhausted.
 * If elapsed > current step's endMin + 1 (overshot), skip to the step after next.
 */
export function getAdaptiveNextStep(
	plan: SoothingPlan,
	currentStepIdx: number,
	elapsedMin: number,
): SoothingPlanStep | null {
	const current = plan.steps.find((s) => s.stepIdx === currentStepIdx);
	let nextIdx = currentStepIdx + 1;
	// If we've spent too long on current step (> endMin + 1), skip ahead one more
	if (current && elapsedMin > current.endMin + 1) {
		nextIdx = currentStepIdx + 2;
	}
	const next = plan.steps.find((s) => s.stepIdx === nextIdx);
	if (!next) return null;
	return next;
}

/**
 * Format a soothing plan as a Chinese checklist with timeline.
 */
export function formatSoothingPlan(plan: SoothingPlan): string {
	const lines: string[] = [
		`📋 ${plan.ageMonths} 月龄安抚计划（总计 ${plan.totalDurationMin} 分钟）`,
		"",
	];
	for (const s of plan.steps) {
		lines.push(
			`${s.stepIdx}. [${s.startMin}-${s.endMin}min] ${s.method.name}`,
		);
		lines.push(`   ${s.method.description}`);
		lines.push(`   备注：${s.notes}`);
		lines.push("");
	}
	lines.push(plan.tip);
	return lines.join("\n");
}
