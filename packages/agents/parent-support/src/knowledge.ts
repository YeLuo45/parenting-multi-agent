/**
 * Parent support knowledge base — burnout, self-care, mental health.
 */

export type SupportTopic =
	| "burnout"
	| "self_care"
	| "postpartum"
	| "anxiety_parent"
	| "depression_parent"
	| "guilt"
	| "isolation"
	| "couple_relationship"
	| "general";

export interface SupportGuidance {
	id: SupportTopic;
	name: string;
	nameEn: string;
	description: string;
	strategies: string[];
	urgency: "low" | "medium" | "high";
	whenToSeekHelp: string;
	hotline?: { region: string; number: string }[];
}

export const SUPPORT_GUIDANCE: SupportGuidance[] = [
	{
		id: "burnout",
		name: "父母倦怠",
		nameEn: "Parental Burnout",
		description:
			"长期睡眠不足 + 持续付出 + 缺少支持 = 倦怠感。症状：易怒、对孩子失去耐心、想逃。",
		strategies: [
			"每天 15 分钟完全属于自己的时间",
			"每周至少一次托班/帮带 2-3 小时",
			"接受 '足够好' 而非完美",
			"和伴侣/朋友分享感受",
			"减少非必要的家务要求",
		],
		urgency: "medium",
		whenToSeekHelp: "持续 2 周以上或出现自伤念头",
		hotline: [
			{ region: "中国", number: "400-161-9995（24h 心理援助）" },
			{ region: "全国", number: "12320（卫生热线）" },
		],
	},
	{
		id: "self_care",
		name: "自我关怀",
		nameEn: "Self-Care",
		description: "自我关怀不是自私，是持续育儿的前提。",
		strategies: [
			"基本需求：保证 6 小时睡眠、健康饮食、运动",
			"心理需求：与朋友/家人保持连接",
			"情绪需求：允许自己感受负面情绪",
			"兴趣需求：保留 1-2 个自己的爱好",
			"专业需求：必要时看心理咨询师",
		],
		urgency: "low",
		whenToSeekHelp: "持续情绪低落或失眠",
	},
	{
		id: "postpartum",
		name: "产后抑郁",
		nameEn: "Postpartum Depression",
		description:
			"产后 2 周内可能出现情绪低落，2 周后仍持续需警惕产后抑郁。症状：失眠、焦虑、绝望、伤害念头。",
		strategies: [
			"不要忽视，产后抑郁是生理疾病",
			"立即就医（妇产科/精神科）",
			"伴侣和家人要理解和陪伴",
			"不要独自承担",
			"遵医嘱用药（包括抗抑郁药，哺乳期可用）",
		],
		urgency: "high",
		whenToSeekHelp: "出现伤害自己或孩子的念头需立即就医",
		hotline: [
			{ region: "中国", number: "400-161-9995" },
			{ region: "全国", number: "12320" },
		],
	},
	{
		id: "anxiety_parent",
		name: "育儿焦虑",
		nameEn: "Parental Anxiety",
		description: "对孩子健康/教育/未来的过度担心。",
		strategies: [
			"识别触发焦虑的具体场景",
			"深呼吸/正念练习（5 分钟）",
			"接受不完美育儿",
			"和其他父母比较时记住'信息茧房'",
			"限制看育儿自媒体的时间",
		],
		urgency: "low",
		whenToSeekHelp: "焦虑影响日常功能或睡眠",
	},
	{
		id: "depression_parent",
		name: "父母抑郁",
		nameEn: "Parental Depression",
		description: "和产后抑郁类似，但可发生在任何育儿阶段。",
		strategies: [
			"识别症状：持续 2 周以上情绪低落、兴趣丧失、失眠/嗜睡、食欲改变",
			"立即就医",
			"不要硬撑",
			"和信任的人分享",
			"心理治疗 + 必要时的药物",
		],
		urgency: "high",
		whenToSeekHelp: "出现自杀念头或无法照顾孩子时立即就医",
		hotline: [{ region: "中国", number: "400-161-9995" }],
	},
	{
		id: "guilt",
		name: "育儿内疚",
		nameEn: "Parental Guilt",
		description: "觉得自己不够好的感觉很常见。",
		strategies: [
			"认识到内疚是正常情绪",
			"区分'应该内疚'（真做错了）和'假内疚'（没达到自己标准）",
			"自我对话：你对孩子已经够好了",
			"限制社交媒体比较",
			"接受平衡而非完美",
		],
		urgency: "low",
		whenToSeekHelp: "内疚严重影响育儿决策或情绪",
	},
	{
		id: "isolation",
		name: "育儿孤立",
		nameEn: "Parental Isolation",
		description: "尤其是新手父母/异地/全职妈妈容易感到孤立。",
		strategies: [
			"加入父母社群（线下或线上）",
			"定期和家人/朋友视频",
			"带娃参加社区活动/公园",
			"主动联系朋友（不要等别人找你）",
			"考虑父母互助小组",
		],
		urgency: "low",
		whenToSeekHelp: "孤立导致严重情绪问题",
	},
	{
		id: "couple_relationship",
		name: "伴侣关系",
		nameEn: "Couple Relationship",
		description: "有孩子后伴侣关系常面临挑战。",
		strategies: [
			"定期约会（即使在家）",
			"每天 10 分钟无孩子时间的对话",
			"不累积怨气，当天解决",
			"分工协商，避免一方全职",
			"必要时伴侣咨询",
		],
		urgency: "low",
		whenToSeekHelp: "冲突升级到身体/情感虐待",
	},
];

/** Get guidance by id. */
export function getSupportGuidance(id: SupportTopic): SupportGuidance | null {
	return SUPPORT_GUIDANCE.find((g) => g.id === id) ?? null;
}

/** Match support issue from text. */
export function matchSupportIssue(text: string): SupportGuidance | null {
	for (const g of SUPPORT_GUIDANCE) {
		const combined = `${g.name} ${g.nameEn}`.toLowerCase();
		const idReplaced = combined.replace(/_/g, " ");
		if (text.toLowerCase().includes(idReplaced) || text.includes(g.name))
			return g;
	}
	// Keyword fallback
	const keywordMap: Array<[RegExp, SupportTopic]> = [
		[/累|疲惫|倦怠|burnout|累死了|撑不住/i, "burnout"],
		[/自我关怀|自私|自己的时间|me.time|self.care/i, "self_care"],
		[/产后|抑郁|ppd|postpartum/i, "postpartum"],
		[/焦虑|担心|紧张|anxiety|怕|不放心/i, "anxiety_parent"],
		[/抑郁|想死|崩溃|绝望|depress|suicide/i, "depression_parent"],
		[/内疚|guilt|对不起|不够好/i, "guilt"],
		[/孤立|孤独|没朋友|isolation|一个人/i, "isolation"],
		[/伴侣|老公|老婆|夫妻|couple|relationship/i, "couple_relationship"],
	];
	for (const [re, id] of keywordMap) {
		if (re.test(text)) return getSupportGuidance(id);
	}
	return null;
}

/** Get hotlines by region. */
export function getAllHotlines(): { region: string; number: string }[] {
	const hotlines: { region: string; number: string }[] = [];
	for (const g of SUPPORT_GUIDANCE) {
		if (g.hotline) hotlines.push(...g.hotline);
	}
	return hotlines;
}
