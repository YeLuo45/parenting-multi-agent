/**
 * SchoolReadiness knowledge base — pre-K/kindergarten readiness, early
 * literacy, school transitions. Rule-based + keyword matching. No LLM call.
 */

export type ReadinessTopic =
	| "readiness"
	| "literacy"
	| "math"
	| "social"
	| "transition"
	| "kindergarten";

export interface ReadinessTip {
	topic: ReadinessTopic;
	stage: string[];
	summary: string;
	advice: string[];
	ageRange: string;
}

export const READINESS_TIPS: ReadinessTip[] = [
	{
		topic: "readiness",
		stage: ["preschool"],
		summary: "幼儿园入学准备（3-5岁）",
		advice: [
			"3-4岁：能自己穿脱简单衣物、上厕所、洗手",
			"4-5岁：能听懂指令并执行（2-3步）",
			"5岁：能独立完成简单任务（收拾玩具、倒水）",
			"培养自理能力比知识储备更重要",
			"提前参观学校、认识老师、熟悉环境",
		],
		ageRange: "3-5岁",
	},
	{
		topic: "literacy",
		stage: ["preschool"],
		summary: "早期阅读与识字（4-6岁）",
		advice: [
			"4岁起每天亲子共读15-20分钟",
			"指读绘本让孩子理解文字和读音的关联",
			"不要强迫识字，通过故事建立阅读兴趣",
			"5-6岁可开始自然拼读（Phonics）启蒙",
			"复述故事培养表达和理解能力",
		],
		ageRange: "4-6岁",
	},
	{
		topic: "math",
		stage: ["preschool"],
		summary: "早期数学启蒙（3-6岁）",
		advice: [
			"3-4岁：数数1-10、认识基本形状",
			"4-5岁：理解数量概念（多/少/一样多）",
			"5-6岁：10以内加减、简单分类",
			"通过日常活动学数学（切水果数片、楼梯数数）",
			"玩积木、拼图培养空间感",
		],
		ageRange: "3-6岁",
	},
	{
		topic: "social",
		stage: ["preschool", "school_age"],
		summary: "学校社交准备",
		advice: [
			"练习轮流、分享、请求帮助",
			"教孩子识别和表达自己的情绪",
			"模拟课堂场景：举手、安静坐好",
			"建立规律的作息以适应学校时间",
			"如果孩子焦虑，用绘本和角色扮演缓解",
		],
		ageRange: "3-6岁",
	},
	{
		topic: "transition",
		stage: ["preschool", "school_age"],
		summary: "幼小衔接过渡",
		advice: [
			"提前半年调整作息时间",
			"练习整理书包、穿校服、系鞋带",
			"建立固定的作业/阅读时间",
			"参观新学校、认识新同学",
			"保持家校沟通，关心孩子情绪变化",
		],
		ageRange: "5-6岁",
	},
	{
		topic: "kindergarten",
		stage: ["preschool", "school_age"],
		summary: "幼儿园选择与适应",
		advice: [
			"选择理念契合家庭价值观的学校",
			"考察师生比、师资、设施安全",
			"了解课程设置和教学理念",
			"开学前与老师面谈、提交健康证明",
			"前两周陪孩子一起适应，准时接送",
		],
		ageRange: "3-6岁",
	},
];

export function getTipsForStage(stage: string | undefined, topic?: ReadinessTopic): ReadinessTip[] {
	return READINESS_TIPS.filter(
		(t) =>
			(stage === undefined || t.stage.includes("any") || t.stage.includes(stage)) &&
			(topic === undefined || t.topic === topic),
	);
}

export function matchTopic(text: string): ReadinessTopic | null {
	const q = text.toLowerCase();
	if (/(衔接|过渡|小学|transition|幼升小|幼小)/i.test(q)) return "transition";
	if (/(入学|上幼儿园|school.ready|kindergarten|readiness)/i.test(q)) return "readiness";
	if (/(识字|阅读|绘本|讲故事|读书|看图|phonic|自然拼读|literacy)/i.test(q)) return "literacy";
	if (/(数学|数数|加减|算术|计算|math)/i.test(q)) return "math";
	if (/(社交|分享|轮流|举手|social.skill|school.social)/i.test(q)) return "social";
	if (/(幼儿园|选择学校|kindergarten|preschool|选园)/i.test(q)) return "kindergarten";
	return null;
}
