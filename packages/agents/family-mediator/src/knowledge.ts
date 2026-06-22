/**
 * Family mediator knowledge base — couple, intergenerational, sibling dynamics.
 */

export type FamilyIssue =
	| "couple_conflict"
	| "grandparent_interference"
	| "sibling_rivalry"
	| "in_law_conflict"
	| "blended_family"
	| "single_parent"
	| "divorce"
	| "communication";

export interface FamilyGuidance {
	id: FamilyIssue;
	name: string;
	nameEn: string;
	description: string;
	strategies: string[];
	urgency: "low" | "medium" | "high";
	whenToSeekHelp: string;
}

export const FAMILY_GUIDANCE: FamilyGuidance[] = [
	{
		id: "couple_conflict",
		name: "夫妻冲突",
		nameEn: "Couple Conflict",
		description: "育儿理念不一致是夫妻最常见的冲突源。",
		strategies: [
			"在孩子不在场时讨论分歧",
			"避免在孩子面前否定对方",
			"找到共同目标（孩子的健康/快乐）",
			"轮流做主（这次你决定，下次我决定）",
			"必要时寻求伴侣咨询",
		],
		urgency: "medium",
		whenToSeekHelp: "冲突频繁且影响育儿，或出现身体/情感虐待",
	},
	{
		id: "grandparent_interference",
		name: "隔代教养冲突",
		nameEn: "Grandparent Interference",
		description: "祖辈过度干预或方法不一致是常见的家庭压力源。",
		strategies: [
			"私下沟通，避免当着孩子面",
			"明确育儿决策权归父母",
			"感谢祖辈的付出",
			"提供具体规则和原因（如安全相关）",
			"每周一次家庭会议同步",
		],
		urgency: "low",
		whenToSeekHelp: "祖辈完全拒绝沟通或严重影响孩子",
	},
	{
		id: "sibling_rivalry",
		name: "同胞竞争",
		nameEn: "Sibling Rivalry",
		description: "兄弟姐妹之间的嫉妒和冲突。",
		strategies: [
			"避免比较",
			"给每个孩子独处时间",
			"教孩子解决冲突的技巧",
			"公平不等于相同",
			"团队合作活动增强联结",
		],
		urgency: "low",
		whenToSeekHelp: "出现身体伤害或持续超过 6 个月",
	},
	{
		id: "in_law_conflict",
		name: "婆媳/翁婿冲突",
		nameEn: "In-law Conflict",
		description: "婆媳或翁婿关系紧张是文化敏感议题。",
		strategies: [
			"设立清晰的边界",
			"由配偶（而非你直接）沟通",
			"避免在孩子面前批评长辈",
			"承认对方的付出",
			"必要时减少接触频率",
		],
		urgency: "low",
		whenToSeekHelp: "出现身体威胁或严重心理压力",
	},
	{
		id: "blended_family",
		name: "重组家庭",
		nameEn: "Blended Family",
		description: "重组家庭的适应需要时间和耐心。",
		strategies: [
			"给孩子 1-2 年适应期",
			"父母先建立统一战线",
			"不要强迫孩子立即接受新家长",
			"保持原家庭的一些传统",
			"专业家庭咨询有帮助",
		],
		urgency: "medium",
		whenToSeekHelp: "孩子出现严重行为问题或拒绝交流",
	},
	{
		id: "single_parent",
		name: "单亲家庭",
		nameEn: "Single Parent",
		description: "单亲育儿需要社区支持和自我关怀。",
		strategies: [
			"建立可靠的支援网络",
			"向孩子诚实解释家庭结构",
			"定期自我关怀（避免倦怠）",
			"寻求经济/法律/情感支持",
			"单亲社群很有帮助",
		],
		urgency: "low",
		whenToSeekHelp: "感到孤立无援或孩子有严重问题",
	},
	{
		id: "divorce",
		name: "离婚",
		nameEn: "Divorce",
		description: "离婚对孩子的短期和长期影响很大。",
		strategies: [
			"告诉孩子不是他们的错",
			"不要在孩子面前说对方坏话",
			"保持一致的日常",
			"不要让孩子传话",
			"必要时寻求儿童心理辅导",
		],
		urgency: "high",
		whenToSeekHelp: "孩子出现严重行为/情绪问题",
	},
	{
		id: "communication",
		name: "家庭沟通",
		nameEn: "Family Communication",
		description: "开放、尊重的家庭沟通是健康关系的基础。",
		strategies: [
			"定期家庭会议",
			"轮流发言不打断",
			'用 "我" 句式表达感受（"我觉得..." 而非 "你总是..."）',
			"先理解再被理解",
			"认可情绪，不急于解决",
		],
		urgency: "low",
		whenToSeekHelp: "家庭冲突升级到身体冲突或持续情绪困扰",
	},
];

/** Get guidance by issue id. */
export function getFamilyGuidance(id: FamilyIssue): FamilyGuidance | null {
	return FAMILY_GUIDANCE.find((g) => g.id === id) ?? null;
}

/** Match family issue from text. */
export function matchFamilyIssue(text: string): FamilyGuidance | null {
	for (const g of FAMILY_GUIDANCE) {
		const combined = `${g.name} ${g.nameEn} ${g.id}`.toLowerCase();
		const idReplaced = combined.replace(/_/g, " ");
		if (text.toLowerCase().includes(idReplaced) || text.includes(g.name))
			return g;
	}
	// Try specific keywords
	const keywordMap: Array<[RegExp, FamilyIssue]> = [
		[/夫妻|两口子|伴侣|吵架|couple/i, "couple_conflict"],
		[
			/祖辈|爷爷奶奶|外公外婆|老人|grandparent/i,
			"grandparent_interference",
		],
		[/同胞|兄弟姐妹|抢|嫉妒|sibling/i, "sibling_rivalry"],
		[/婆媳|翁婿|in\.law|亲家/i, "in_law_conflict"],
		[/重组|继父|继母|blended/i, "blended_family"],
		[/单亲|单亲家庭|离婚家庭|single\.parent/i, "single_parent"],
		[/离婚|分居|离异|divorce/i, "divorce"],
		[/沟通|交流|对话|communication/i, "communication"],
	];
	for (const [re, id] of keywordMap) {
		if (re.test(text)) return getFamilyGuidance(id);
	}
	return null;
}
