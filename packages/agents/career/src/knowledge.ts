/**
 * Career knowledge base — career exploration, internships, job search,
 * professional development for older teens and young adults.
 * Rule-based + keyword matching. No LLM call.
 */

export type CareerTopic =
	| "exploration"
	| "internship"
	| "resume"
	| "interview"
	| "networking"
	| "skills"
	| "first_job";

export interface CareerTip {
	topic: CareerTopic;
	stage: string[];
	summary: string;
	advice: string[];
	ageRange: string;
}

export const CAREER_TIPS: CareerTip[] = [
	{
		topic: "exploration",
		stage: ["teen", "young_adult"],
		summary: "职业探索（14-20岁）",
		advice: [
			"14-16岁：探索多种兴趣（夏校、志愿、社团）",
			"16-18岁：聚焦2-3个感兴趣的职业方向",
			"参加职业体验日、影子工作、讲座",
			"咨询行业从业者，了解真实工作内容",
			"不必过早确定，兴趣会随经历演变",
		],
		ageRange: "14-20岁",
	},
	{
		topic: "internship",
		stage: ["teen", "young_adult"],
		summary: "实习策略",
		advice: [
			"高中/大学早期可申请非营利、初创公司",
			"大二大三可申请正规企业实习",
			"实习目标：探索行业+积累经验+建立人脉",
			"海投不如精准：研究公司后定制简历",
			"实习中主动找 mentor，记录项目成果",
		],
		ageRange: "16-22岁",
	},
	{
		topic: "resume",
		stage: ["teen", "young_adult"],
		summary: "简历与求职信",
		advice: [
			"1页简历，针对每个岗位定制",
			"项目经验+量化成果（提高30%效率）比职责描述更有力",
			"教育、奖项、技能（编程语言/工具）清晰列出",
			"求职信3段：为什么这个公司+你能带来什么+期待",
			"请行业前辈 review 多轮迭代",
		],
		ageRange: "17-25岁",
	},
	{
		topic: "interview",
		stage: ["teen", "young_adult"],
		summary: "面试准备",
		advice: [
			"准备3-5个behavioral问题（STAR法：情境-任务-行动-结果）",
			"研究公司业务、近期新闻、竞争对手",
			"准备3-5个反向问题（团队文化、职业发展）",
			"练习：录音、模拟、朋友扮演面试官",
			"面试后24h内发感谢邮件",
		],
		ageRange: "17-25岁",
	},
	{
		topic: "networking",
		stage: ["teen", "young_adult"],
		summary: "职业人脉建立",
		advice: [
			"LinkedIn：高中起建立专业档案",
			"参加行业meetup、沙龙、校友活动",
			"主动联系：cold email + 咖啡聊天",
			"提供价值再寻求帮助（推荐人、建议）",
			"长期维护：定期问候、节日祝福",
		],
		ageRange: "16-25岁",
	},
	{
		topic: "skills",
		stage: ["teen", "young_adult"],
		summary: "市场需求技能",
		advice: [
			"硬技能：编程（Python/JavaScript）、数据分析（SQL/Excel）、AI工具",
			"软技能：沟通、解决问题、团队合作",
			"AI时代：学会与AI协作（提示工程、批判思维）",
			"持续学习：每年学1-2个新技能",
			"副业/作品集：GitHub、个人网站、博客",
		],
		ageRange: "14-25岁",
	},
	{
		topic: "first_job",
		stage: ["teen", "young_adult"],
		summary: "第一份工作策略",
		advice: [
			"18-22岁：实习→入门级→行业经验",
			"大公司 vs 初创：大公司学体系、初创学全能",
			"薪资不是唯一：成长+学习+团队+公司文化",
			"前3年密集学习，比短期高薪重要",
			"保持好奇，每2-3年评估职业方向",
		],
		ageRange: "18-25岁",
	},
];

export function getTipsForStage(stage: string | undefined, topic?: CareerTopic): CareerTip[] {
	return CAREER_TIPS.filter(
		(t) =>
			(stage === undefined || t.stage.includes("any") || t.stage.includes(stage)) &&
			(topic === undefined || t.topic === topic),
	);
}

export function matchTopic(text: string): CareerTopic | null {
	const q = text.toLowerCase();
	if (/(职业探索|职业规划|career|职业方向|职业选择|职业测试)/i.test(q)) return "exploration";
	if (/(实习|intern|internship|实习机会)/i.test(q)) return "internship";
	if (/(简历|resume|cv|求职信|cover.letter)/i.test(q)) return "resume";
	if (/(面试|interview|行为面试|技术面试)/i.test(q)) return "interview";
	if (/(人脉|networking|linkedin|校友|networking|coffee.chat)/i.test(q)) return "networking";
	if (/(技能|skill|学习|学什么|coding|编程|ai|技能)/i.test(q)) return "skills";
	if (/(第一份工作|first.job|找工作|求职|应聘|投简历)/i.test(q)) return "first_job";
	return null;
}
