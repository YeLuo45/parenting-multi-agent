/**
 * CollegePrep knowledge base — academic planning, SAT/ACT, essays,
 * applications for teens (ages 13-18). Rule-based + keyword matching.
 */

export type CollegePrepTopic =
	| "academics"
	| "standardized_test"
	| "extracurricular"
	| "essay"
	| "application"
	| "financial_aid"
	| "selection";

export interface CollegePrepTip {
	topic: CollegePrepTopic;
	stage: string[];
	summary: string;
	advice: string[];
	ageRange: string;
}

export const COLLEGE_PREP_TIPS: CollegePrepTip[] = [
	{
		topic: "academics",
		stage: ["tween", "teen"],
		summary: "学业规划（13-18岁）",
		advice: [
			"13-15岁：打好基础课程（GPA是大学申请最关键指标）",
			"15-16岁：挑战AP/Honor课程，深度探索感兴趣学科",
			"16-17岁：根据目标专业选修相关课程",
			"不要过度追求AP数量，质量比数量重要",
			"学业困难时尽早寻求辅导和帮助",
		],
		ageRange: "13-18岁",
	},
	{
		topic: "standardized_test",
		stage: ["teen"],
		summary: "标准化考试（SAT/ACT）",
		advice: [
			"16-17岁开始准备，17岁前完成",
			"SAT和ACT选择擅长的，可都试试",
			"提前3-6个月准备，建议2-3次考试取最高分",
			"重点：阅读文法 > 数学 > 写作（可选）",
			"官方真题+在线资源（Khan Academy免费）",
		],
		ageRange: "16-18岁",
	},
	{
		topic: "extracurricular",
		stage: ["tween", "teen"],
		summary: "课外活动深度发展",
		advice: [
			"1-2个深度参与（5+年）胜过5个浅尝辄止",
			"展示领导力、影响力、长期承诺",
			"结合兴趣和目标专业方向",
			"记录活动的时间投入和成果",
			"暑假可参加学术夏校、竞赛、志愿者",
		],
		ageRange: "13-18岁",
	},
	{
		topic: "essay",
		stage: ["teen"],
		summary: "申请文书写作",
		advice: [
			"主文书展现个人特质，不重复简历",
			"找到能展现你的独特故事和价值观",
			"写3-5稿是常态，提前2个月开始",
			"请信任的老师、家长多轮修改",
			"检查语法、拼写、标点（细节决定印象）",
		],
		ageRange: "16-18岁",
	},
	{
		topic: "application",
		stage: ["teen"],
		summary: "大学申请流程",
		advice: [
			"10年级：开始研究大学和职业",
			"11年级：参观大学、准备标准化考试",
			"12年级秋：写文书、收集推荐信、提交ED/EA（11月1日）",
			"12年级冬：提交RD申请（1月1日）",
			"申请8-12所学校，平衡冲刺、目标、保底",
		],
		ageRange: "16-18岁",
	},
	{
		topic: "financial_aid",
		stage: ["teen"],
		summary: "财务规划和奖学金",
		advice: [
			"FAFSA（美国）从高三10月开始提交",
			"中国：高考+自主招生，关注国家专项",
			"研究大学奖学金（merit-based + need-based）",
			"了解学杂费、生活费、贷款选项",
			"不要让费用阻碍选择，大学有经济援助",
		],
		ageRange: "16-18岁",
	},
	{
		topic: "selection",
		stage: ["teen"],
		summary: "选择合适大学",
		advice: [
			"学术匹配：GPA/SAT处于学校25-75%区间",
			"专业排名 vs 综合排名：根据目标权衡",
			"地理位置：城市/郊区，气候，离家距离",
			"校园文化：大小、文理/研究型、社团氛围",
			"经济因素：净花费（学费-奖学金-助学金）",
		],
		ageRange: "16-18岁",
	},
];

export function getTipsForStage(stage: string | undefined, topic?: CollegePrepTopic): CollegePrepTip[] {
	return COLLEGE_PREP_TIPS.filter(
		(t) =>
			(stage === undefined || t.stage.includes("any") || t.stage.includes(stage)) &&
			(topic === undefined || t.topic === topic),
	);
}

export function matchTopic(text: string): CollegePrepTopic | null {
	const q = text.toLowerCase();
	if (/(sat|act|标化|标准化考试|standardized.test|toefl|ielts|gre|gmat)/i.test(q)) return "standardized_test";
	if (/(文书|essay|个人陈述|ps|personal.statement)/i.test(q)) return "essay";
	if (/(课外|社团|义工|volunteer|extracurricular|竞赛|夏校)/i.test(q)) return "extracurricular";
	if (/(申请|application|ed|ea|rd|早申|早录)/i.test(q)) return "application";
	if (/(奖学金|助学金|财务|fafsa|financial.aid|学费|贷款)/i.test(q)) return "financial_aid";
	if (/(选校|择校|择业|大学排名|college.ranking|选大学|申请什么)/i.test(q)) return "selection";
	if (/(学业|gpa|成绩|课程|选课|ap|honor|academic)/i.test(q)) return "academics";
	return null;
}
