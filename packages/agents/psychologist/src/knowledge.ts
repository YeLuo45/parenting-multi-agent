/**
 * Psychologist knowledge base.
 */

import type { ChildStage } from "@parenting/memory";

/** Emotion labels. */
export type Emotion =
	| "happy"
	| "sad"
	| "angry"
	| "afraid"
	| "anxious"
	| "frustrated"
	| "ashamed"
	| "jealous"
	| "calm"
	| "neutral";

export interface EmotionPattern {
	emotion: Emotion;
	patterns: RegExp[];
	keywords: string[];
}

export const EMOTION_PATTERNS: EmotionPattern[] = [
	{ emotion: "happy", patterns: [/(开心|高兴|快乐|happy|joy|excited|高兴|happy)/i], keywords: ["开心", "高兴", "快乐"] },
	{ emotion: "sad", patterns: [/(伤心|难过|悲伤|想哭|sad|cry|unhappy|blue|沮丧)/i], keywords: ["伤心", "难过", "悲伤", "沮丧"] },
	{ emotion: "angry", patterns: [/(生气|愤怒|发火|angry|mad|furious|rage)/i], keywords: ["生气", "愤怒", "发火"] },
	{ emotion: "afraid", patterns: [/(害怕|怕|恐惧|afraid|scared|fear|phobia)/i], keywords: ["害怕", "怕", "恐惧"] },
	{ emotion: "anxious", patterns: [/(焦虑|担心|紧张|anxious|anxiety|worried|nervous)/i], keywords: ["焦虑", "担心", "紧张"] },
	{ emotion: "frustrated", patterns: [/(挫败|挫败感|沮丧|frustrat)/i], keywords: ["挫败", "挫败感"] },
	{ emotion: "ashamed", patterns: [/(羞愧|丢脸|尴尬|ashamed|embarrassed)/i], keywords: ["羞愧", "丢脸"] },
	{ emotion: "jealous", patterns: [/(嫉妒|吃醋|羡慕|jealous|envy)/i], keywords: ["嫉妒", "吃醋"] },
	{ emotion: "calm", patterns: [/(平静|冷静|放松|calm|relaxed|peaceful)/i], keywords: ["平静", "冷静"] },
];

/** Detect emotions in text. Returns multiple matches. */
export function detectEmotions(text: string): Emotion[] {
	const found: Emotion[] = [];
	for (const p of EMOTION_PATTERNS) {
		for (const re of p.patterns) {
			if (re.test(text) && !found.includes(p.emotion)) {
				found.push(p.emotion);
				break;
			}
		}
	}
	return found;
}

/** Behavior problems catalog. */
export interface BehaviorProblem {
	id: string;
	name: string;
	nameEn: string;
	patterns: RegExp[];
	ageRange: { minMonths: number; maxMonths: number };
	strategies: string[];
	urgency: "low" | "medium" | "high";
	professionalHelp: string;
}

export const BEHAVIOR_PROBLEMS: BehaviorProblem[] = [
	{
		id: "B001_tantrum",
		name: "发脾气/哭闹",
		nameEn: "Tantrum",
		patterns: [/(发脾气|哭闹|tantrum|meltdown|尖叫|scream)/i],
		ageRange: { minMonths: 12, maxMonths: 72 },
		strategies: [
			"先共情：'我知道你很生气/难过'",
			"等情绪过去再讲道理",
			"提供安静角落让孩子平复",
			"避免在公共场合妥协，但也不体罚",
			"事后和孩子一起回顾，命名情绪",
		],
		urgency: "low",
		professionalHelp: "如果 5 岁后仍频繁（每周 3+ 次）且强度大、影响日常，建议咨询儿童心理医生",
	},
	{
		id: "B002_biting",
		name: "咬人",
		nameEn: "Biting",
		patterns: [/(咬人|咬|bite|biting)/i],
		ageRange: { minMonths: 12, maxMonths: 48 },
		strategies: [
			"1-3 岁咬人常见，多因语言能力不足或刺激过度",
			"立即平静制止：'不可以咬人，会痛'",
			"关注被咬孩子的感受",
			"教替代表达：'你可以说要'",
			"识别触发点（争夺玩具/疲劳/刺激过多）",
		],
		urgency: "low",
		professionalHelp: "4 岁后仍频繁咬人或伴随攻击行为，建议咨询",
	},
	{
		id: "B003_hitting",
		name: "打人",
		nameEn: "Hitting",
		patterns: [/(打人|打|hit|hitting|aggressive|攻击)/i],
		ageRange: { minMonths: 18, maxMonths: 96 },
		strategies: [
			"立即制止但不打回去（示范非暴力）",
			"蹲下来平视孩子，说'打人会痛'",
			"教替代行为：'你可以跺脚/说生气'",
			"检查家庭环境（是否有暴力示范）",
			"奖励非攻击行为",
		],
		urgency: "medium",
		professionalHelp: "5 岁后持续攻击行为、伤害动物、缺乏同理，建议专业评估",
	},
	{
		id: "B004_sleep_regression",
		name: "睡眠倒退",
		nameEn: "Sleep Regression",
		patterns: [/(夜醒|夜啼|哄睡|不肯睡|睡眠倒退|sleep.regression|夜惊|nightmare)/i],
		ageRange: { minMonths: 4, maxMonths: 60 },
		strategies: [
			"常见于 4 月、8-10 月、18 月、2 岁",
			"保持规律作息（白天小睡、晚上固定时间）",
			"建立睡前程序（洗澡→故事→入睡）",
			"哭闹时先观察几分钟再安抚，避免形成依赖",
			"白天充分放电（户外活动）",
		],
		urgency: "low",
		professionalHelp: "持续超过 1 个月或伴随白天嗜睡/生长问题，建议咨询儿科",
	},
	{
		id: "B005_picky_eating",
		name: "挑食",
		nameEn: "Picky Eating",
		patterns: [/(挑食|偏食|不吃|不肯吃|picky.eating|food.refusal)/i],
		ageRange: { minMonths: 12, maxMonths: 72 },
		strategies: [
			"1-2 岁挑食是正常发展（自主性发展）",
			"提供多样化食物但不强迫吃",
			"父母示范吃",
			"固定用餐时间（20-30 分钟）",
			"不把食物作为奖励或惩罚",
		],
		urgency: "low",
		professionalHelp: "影响生长曲线、严重拒绝食物种类超过 20 种、伴有呕吐，可能需要 OT 评估",
	},
	{
		id: "B006_separation_anxiety",
		name: "分离焦虑",
		nameEn: "Separation Anxiety",
		patterns: [/(分离焦虑|怕妈妈离开|不肯分离|separation.anxiety|黏人|clingy)/i],
		ageRange: { minMonths: 6, maxMonths: 36 },
		strategies: [
			"6-18 月常见，是健康依恋的表现",
			"短暂离开前预告，不要偷偷走",
			"建立告别仪式（拥抱+说再见）",
			"按时回来建立信任",
			"练习短暂分离（从几分钟开始）",
		],
		urgency: "low",
		professionalHelp: "3 岁后仍强烈分离焦虑、影响日常活动（不能去幼儿园等），建议评估",
	},
	{
		id: "B007_sibling_rivalry",
		name: "同胞竞争",
		nameEn: "Sibling Rivalry",
		patterns: [/(同胞|兄弟姐妹|抢|嫉妒|吃醋|sibling|rivalry|哥哥|姐姐|弟弟|妹妹|老大|老二|小的)/i],
		ageRange: { minMonths: 24, maxMonths: 144 },
		strategies: [
			"新弟妹出生后大孩出现退化是正常",
			"保留与大孩的 1v1 时间",
			"不当着大孩面比较",
			"让大孩参与照顾（力所能及）",
			"不强制分享（玩具归属感）",
		],
		urgency: "low",
		professionalHelp: "持续 6 个月以上的强烈敌意/伤害行为，建议咨询",
	},
	{
		id: "B008_screen_addiction",
		name: "屏幕成瘾",
		nameEn: "Screen Addiction",
		patterns: [/(手机|ipad|屏幕|看视频|玩手机|screen|phone|video|游戏|game)/i],
		ageRange: { minMonths: 18, maxMonths: 144 },
		strategies: [
			"2 岁前不建议屏幕（美国儿科学会）",
			"2-5 岁每天 ≤ 1 小时高质量内容",
			"父母以身作则（吃饭不用手机）",
			"提供替代活动（户外/积木/绘本）",
			"约定屏幕时间（可视计时器）",
		],
		urgency: "medium",
		professionalHelp: "严重影响睡眠/学习/社交、对屏幕极度抗拒替代活动，建议评估",
	},
	{
		id: "B009_self_harm",
		name: "自残倾向",
		nameEn: "Self-harm Risk",
		patterns: [/(自残|自杀|想死|自伤|self.harm|suicide|不想活|想消失)/i],
		ageRange: { minMonths: 72, maxMonths: 240 },
		strategies: [
			"⚠️ 这是一个心理危机信号，请立即寻求专业帮助",
			"拨打心理援助热线：国内 400-161-9995 / 北京 010-82951332",
			"或带去最近的医院精神科/心理科",
			"24 小时陪伴孩子，移除可能的危险物品",
			"不要责备或轻视，告诉孩子：'我听到你了，我们会一起度过'",
		],
		urgency: "high",
		professionalHelp: "立即专业评估与干预",
	},
];

/** Match a behavior problem from a question. */
export function matchBehaviorProblem(text: string, ageMonths: number): BehaviorProblem | null {
	for (const p of BEHAVIOR_PROBLEMS) {
		if (p.ageRange.minMonths > ageMonths) continue;
		if (p.ageRange.maxMonths < ageMonths) continue;
		for (const re of p.patterns) {
			if (re.test(text)) return p;
		}
	}
	return null;
}

/** Erikson developmental stages. */
export interface EriksonStage {
	stage: ChildStage;
	ageRange: string;
	psychosocialCrisis: string;
	virtue: string;
	parentGuidance: string;
}

export const ERIKSON_STAGES: EriksonStage[] = [
	{
		stage: "newborn",
		ageRange: "0-1 岁",
		psychosocialCrisis: "Trust vs. Mistrust (信任 vs 不信任)",
		virtue: "Hope (希望)",
		parentGuidance: "及时回应基本需求，建立安全依恋。多肌肤接触、稳定照护者",
	},
	{
		stage: "toddler",
		ageRange: "1-3 岁",
		psychosocialCrisis: "Autonomy vs. Shame/Doubt (自主 vs 羞怯怀疑)",
		virtue: "Will (意志)",
		parentGuidance: "提供安全环境下的选择（如选哪双鞋），允许探索。设定合理边界但不强制",
	},
	{
		stage: "preschool",
		ageRange: "3-6 岁",
		psychosocialCrisis: "Initiative vs. Guilt (主动 vs 罪恶感)",
		virtue: "Purpose (目的)",
		parentGuidance: "鼓励主动性和想象力，参与游戏。避免过度批评",
	},
	{
		stage: "school_age",
		ageRange: "6-12 岁",
		psychosocialCrisis: "Industry vs. Inferiority (勤奋 vs 自卑)",
		virtue: "Competence (能力)",
		parentGuidance: "鼓励努力和坚持，帮助建立技能。肯定过程而非只肯定结果",
	},
	{
		stage: "tween",
		ageRange: "12-18 岁",
		psychosocialCrisis: "Identity vs. Role Confusion (自我认同 vs 角色混乱)",
		virtue: "Fidelity (忠诚)",
		parentGuidance: "尊重逐渐独立的需要，做顾问而非独裁者。讨论价值观、保持对话",
	},
	{
		stage: "young_adult",
		ageRange: "18+",
		psychosocialCrisis: "Intimacy vs. Isolation (亲密 vs 孤独)",
		virtue: "Love (爱)",
		parentGuidance: "从控制转为顾问关系，尊重边界。继续保持情感连接",
	},
];

/** Get Erikson stage for given stage. */
export function getEriksonStage(stage: ChildStage): EriksonStage | null {
	return ERIKSON_STAGES.find((e) => e.stage === stage) ?? null;
}
