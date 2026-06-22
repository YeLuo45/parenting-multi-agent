/**
 * SocialAgent knowledge base — social skills, peer relationships, playdates.
 *
 * Phase 3 direction 5: rule-based + keyword matching. No LLM call.
 */

export type SocialTopic =
	| "sharing"
	| "shyness"
	| "playdate"
	| "conflict"
	| "cooperation"
	| "friendship"
	| "peer_pressure";

export interface SocialTip {
	topic: SocialTopic;
	stage: string[];
	summary: string;
	advice: string[];
	ageRange: string;
}

export const SOCIAL_TIPS: SocialTip[] = [
	{
		topic: "sharing",
		stage: ["toddler", "preschool"],
		summary: "分享行为发展（2-5岁）",
		advice: [
			"2-3岁：孩子处于平行游戏阶段，分享能力有限是正常的",
			"3-4岁：可引导轮流玩，使用计时器帮助过渡",
			"4-5岁：开始理解他人感受，可以讨论分享的好处",
			"不要强迫分享，尊重孩子的所有权感",
		],
		ageRange: "2-5岁",
	},
	{
		topic: "shyness",
		stage: ["infant", "toddler", "preschool", "school_age"],
		summary: "害羞与社交焦虑",
		advice: [
			"害羞是正常气质，不是缺陷",
			"给孩子预热时间，不要强迫打招呼",
			"创造小规模、低压力的社交机会",
			"示范社交行为，让孩子观察和模仿",
			"如果害羞严重影响日常生活，考虑咨询儿童心理咨询师",
		],
		ageRange: "6月-12岁",
	},
	{
		topic: "playdate",
		stage: ["toddler", "preschool", "school_age"],
		summary: "如何安排和管理玩耍约会",
		advice: [
			"从1对1开始，选择性格相近的孩子",
			"时长从1-2小时开始，逐渐延长",
			"准备共同活动（画画、积木、户外游戏）",
			"提前约定规则（如轮流、分享玩具）",
			"保持适度监督但不要过度干预",
		],
		ageRange: "2-10岁",
	},
	{
		topic: "conflict",
		stage: ["toddler", "preschool", "school_age", "tween"],
		summary: "儿童社交冲突处理",
		advice: [
			"冲突是学习社交技能的机会",
			"先共情双方感受，再引导解决问题",
			"教孩子用语言表达需求（'我想要...'而非抢夺）",
			"不要急于替孩子解决，引导他自己想方案",
			"如果是霸凌（反复、有意伤害），需要成人介入",
		],
		ageRange: "2-12岁",
	},
	{
		topic: "cooperation",
		stage: ["preschool", "school_age"],
		summary: "培养合作能力",
		advice: [
			"通过需要合作的游戏和活动练习（搭积木、角色扮演）",
			"强调团队目标（'我们一起...'",
			"赞扬合作行为，而非个人表现",
			"给孩子分配需要协作的家庭任务",
		],
		ageRange: "3-10岁",
	},
	{
		topic: "friendship",
		stage: ["preschool", "school_age", "tween", "teen"],
		summary: "友谊发展与维护",
		advice: [
			"4-6岁：友谊基于'一起玩'",
			"7-9岁：友谊基于信任和共同兴趣",
			"10-12岁：友谊更深，可能出现排他性",
			"帮助孩子理解友谊是双向的，需要付出和维护",
			"如果孩子没有朋友，了解原因并提供支持",
		],
		ageRange: "4-15岁",
	},
	{
		topic: "peer_pressure",
		stage: ["tween", "teen"],
		summary: "同伴压力应对",
		advice: [
			"教孩子区分'想要'和'被迫'",
			"练习拒绝技巧（坚定、自信、不带攻击）",
			"保持开放沟通，让孩子愿意分享压力",
			"帮助孩子建立自我价值感，不依赖同伴认可",
			"如果涉及危险行为（吸烟、饮酒），需要严肃干预",
		],
		ageRange: "10-18岁",
	},
];

export function getTipsForStage(
	stage: string | undefined,
	topic?: SocialTopic,
): SocialTip[] {
	return SOCIAL_TIPS.filter(
		(t) =>
			(stage === undefined ||
				t.stage.includes("any") ||
				t.stage.includes(stage)) &&
			(topic === undefined || t.topic === topic),
	);
}

export function matchTopic(text: string): SocialTopic | null {
	const q = text.toLowerCase();
	if (/(分享|轮流|turn.take|share)/i.test(q)) return "sharing";
	if (/(害羞|shy|shyness|怕生|认生|社交恐惧|social.anxiety)/i.test(q))
		return "shyness";
	if (/(play.date|playdate|一起玩|小朋友来|邀请|约)/i.test(q))
		return "playdate";
	if (/(冲突|吵架|打架|争抢|conflict|fight|bully|霸凌)/i.test(q))
		return "conflict";
	if (/(合作|团队|team|cooperat|一起做)/i.test(q)) return "cooperation";
	if (/(朋友|friend|交友|友谊|best.friend)/i.test(q)) return "friendship";
	if (/(同伴压力|peer.pressure|从众|随大流)/i.test(q)) return "peer_pressure";
	return null;
}
