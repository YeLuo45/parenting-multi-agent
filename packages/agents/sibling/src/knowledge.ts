/**
 * Sibling knowledge base — sibling rivalry, new sibling adjustment, sharing,
 * fighting, age gaps. Rule-based + keyword matching. No LLM call.
 */

export type SiblingTopic =
	| "rivalry"
	| "new_baby"
	| "sharing"
	| "fighting"
	| "age_gap"
	| "favoritism"
	| "twin";

export interface SiblingTip {
	topic: SiblingTopic;
	stage: string[];
	summary: string;
	advice: string[];
	ageRange: string;
}

export const SIBLING_TIPS: SiblingTip[] = [
	{
		topic: "rivalry",
		stage: ["toddler", "preschool", "school_age"],
		summary: "手足之争（3-10岁）",
		advice: [
			"正常发展：3-6岁是手足竞争高峰期",
			"避免比较：每个孩子有自己的发展节奏",
			"倾听双方：先共情再引导解决方案",
			"承认感受：'你生气是因为妹妹碰了你的玩具'",
			"一对一时间：每周给每个孩子独处时光",
		],
		ageRange: "3-10岁",
	},
	{
		topic: "new_baby",
		stage: ["infant", "toddler", "preschool"],
		summary: "迎接二宝 / 新宝宝（0-5岁）",
		advice: [
			"提前准备：孕晚期开始与老大谈论新生儿",
			"看新生儿照片/视频建立期待",
			"出生后让老大参与：递尿布、唱歌",
			"不强迫分享：'这是宝宝的，但你想抱可以'",
			"预留大孩子的专属时间：每天15分钟独处陪伴",
		],
		ageRange: "0-5岁",
	},
	{
		topic: "sharing",
		stage: ["toddler", "preschool"],
		summary: "教导分享（2-5岁）",
		advice: [
			"2-3岁：分享能力有限是正常的，不必强迫",
			"使用计时器：轮流玩5分钟一轮",
			"4-5岁：开始理解他人感受，鼓励分享",
			"示范分享：父母之间互相分享食物",
			"避免评判：'你真小气'会加重抗拒",
		],
		ageRange: "2-5岁",
	},
	{
		topic: "fighting",
		stage: ["preschool", "school_age", "tween"],
		summary: "兄弟姐妹打架（4-12岁）",
		advice: [
			"安全第一：立即制止身体伤害",
			"了解原因：抢玩具、注意力、嫉妒",
			"不立即裁决：'你们自己想想怎么解决'",
			"教替代策略：用语言表达需求、轮流、交换",
			"避免偏袒：单独教导，不公开比较",
		],
		ageRange: "4-12岁",
	},
	{
		topic: "age_gap",
		stage: ["toddler", "preschool", "school_age", "tween", "teen"],
		summary: "年龄差处理（2岁以上差距）",
		advice: [
			"避免让大孩子当小保姆",
			"为每个孩子提供适合其年龄的活动",
			"防止大孩子向小孩子模仿攻击行为",
			"小组 vs 一对一：根据差距调整互动",
			"孩子长大后年龄差影响会变小",
		],
		ageRange: "0-18岁",
	},
	{
		topic: "favoritism",
		stage: ["preschool", "school_age", "tween", "teen"],
		summary: "避免偏爱（4-15岁）",
		advice: [
			"自我反思：是否有不公平的比较",
			"按需分配：每个孩子按需得到时间和资源",
			"赞美具体行为：不比较孩子间优劣",
			"倾听每个孩子独特的感受",
			"承认偏爱感是人之常情，但行为必须公平",
		],
		ageRange: "4-15岁",
	},
	{
		topic: "twin",
		stage: ["infant", "toddler", "preschool"],
		summary: "双胞胎特殊考虑（0-5岁）",
		advice: [
			"个体化时间：每个孩子都需要独处陪伴",
			"不要总视为'一对'：他们也是独立的个体",
			"差异化：用不同颜色标记物品避免混淆",
			"鼓励互相合作但不过度依赖",
			"关注哥哥姐姐角色：避免'大孩子必须让着'",
		],
		ageRange: "0-5岁",
	},
];

export function getTipsForStage(
	stage: string | undefined,
	topic?: SiblingTopic,
): SiblingTip[] {
	return SIBLING_TIPS.filter(
		(t) =>
			(stage === undefined ||
				t.stage.includes("any") ||
				t.stage.includes(stage)) &&
			(topic === undefined || t.topic === topic),
	);
}

export function matchTopic(text: string): SiblingTopic | null {
	const q = text.toLowerCase();
	if (/(手足|sibling|rival|竞争|吃醋|嫉妒)/i.test(q)) return "rivalry";
	if (/(新宝宝|new.baby|二宝|新生儿.*哥哥|新生儿.*姐姐)/i.test(q))
		return "new_baby";
	if (/(分享|share|sharing|轮流|take.turn)/i.test(q)) return "sharing";
	if (/(打架|fight|争吵|冲突|hit|打.*弟|打.*妹)/i.test(q)) return "fighting";
	if (/(年龄差|age.gap|差.*岁)/i.test(q)) return "age_gap";
	if (/(偏爱|favoritism|偏心|不公平)/i.test(q)) return "favoritism";
	if (/(双胞胎|twin|龙凤胎)/i.test(q)) return "twin";
	return null;
}
