/**
 * Educator knowledge base — schooling, learning styles, interests, activities.
 */

import type { ChildStage } from "@parenting/memory";

/** Education stage (sub-stage of ChildStage). */
export type EduStage = "early_childhood" | "preschool" | "elementary" | "middle_school" | "high_school" | "college";

export interface EduStageInfo {
	stage: EduStage;
	name: string;
	nameEn: string;
	ageRange: string;
	monthsRange: { min: number; max: number };
	stageK: ChildStage;
	characteristics: string[];
	activities: string[];
	readingLevel?: string;
	keySkills: string[];
	schoolSubjects: string[];
}

export const EDU_STAGES: EduStageInfo[] = [
	{
		stage: "early_childhood",
		name: "幼儿早期",
		nameEn: "Early Childhood (0-3)",
		ageRange: "0-3 岁",
		monthsRange: { min: 0, max: 36 },
		stageK: "infant",
		characteristics: ["感官探索", "建立安全感", "语言爆发期", "大运动发展"],
		activities: ["抚触按摩", "Tummy time", "躲猫猫", "看绘本（布书/触摸书）", "唱儿歌"],
		keySkills: ["感官认知", "抓握", "翻身", "坐", "爬", "走", "说单词"],
		schoolSubjects: [],
	},
	{
		stage: "preschool",
		name: "学前",
		nameEn: "Preschool (3-6)",
		ageRange: "3-6 岁",
		monthsRange: { min: 36, max: 72 },
		stageK: "preschool",
		characteristics: ["想象力爆发", "社交能力发展", "好奇心强", "开始问为什么"],
		activities: ["角色扮演", "画画/捏橡皮泥", "搭积木", "简单拼图", "亲子阅读"],
		readingLevel: "看图说话 → 简单绘本",
		keySkills: ["剪纸/画线", "数数 1-10", "识别颜色形状", "讲故事", "分享/轮流"],
		schoolSubjects: ["语言", "数学启蒙", "音乐", "美术", "运动"],
	},
	{
		stage: "elementary",
		name: "小学",
		nameEn: "Elementary (6-12)",
		ageRange: "6-12 岁",
		monthsRange: { min: 72, max: 144 },
		stageK: "school_age",
		characteristics: ["逻辑思维发展", "开始学业", "同伴影响增加", "形成学习习惯"],
		activities: ["阅读课外书", "科学小实验", "乐器/体育", "棋类", "编程入门"],
		readingLevel: "简单章节书 → 复杂章节书",
		keySkills: ["阅读理解", "基础写作", "加减乘除", "时间/金钱概念", "研究方法"],
		schoolSubjects: ["语文", "数学", "英语", "科学", "社会", "体育", "美术", "音乐"],
	},
	{
		stage: "middle_school",
		name: "初中",
		nameEn: "Middle School (12-15)",
		ageRange: "12-15 岁",
		monthsRange: { min: 144, max: 180 },
		stageK: "tween",
		characteristics: ["抽象思维", "自我意识强", "同伴压力", "叛逆期开始"],
		activities: ["社团活动", "运动队", "乐器进阶", "编程项目", "志愿服务"],
		readingLevel: "青少年文学",
		keySkills: ["批判思维", "独立学习", "时间管理", "沟通", "团队合作"],
		schoolSubjects: ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治"],
	},
	{
		stage: "high_school",
		name: "高中",
		nameEn: "High School (15-18)",
		ageRange: "15-18 岁",
		monthsRange: { min: 180, max: 216 },
		stageK: "teen",
		characteristics: ["升学压力", "价值观形成", "独立性增强", "生涯探索"],
		activities: ["学科竞赛", "科研项目", "社会实践", "大学先修课 (AP/IB)", "辩论/演讲"],
		readingLevel: "经典文学 + 专业入门",
		keySkills: ["深度学习", "研究能力", "自我规划", "压力管理", "决策"],
		schoolSubjects: ["高考/IB/AP 体系", "选修课", "大学升学准备"],
	},
	{
		stage: "college",
		name: "大学/成年早期",
		nameEn: "College (18+)",
		ageRange: "18+ 岁",
		monthsRange: { min: 216, max: 600 },
		stageK: "young_adult",
		characteristics: ["专业选择", "独立生活", "职业探索", "亲密关系"],
		activities: ["专业学习", "实习", "海外交换", "创业", "研究项目"],
		readingLevel: "学术文献",
		keySkills: ["专业知识", "批判分析", "沟通协作", "职业规划", "财务管理"],
		schoolSubjects: ["专业课程", "通识教育", "实习/项目"],
	},
];

export function getEduStage(months: number): EduStageInfo | null {
	return EDU_STAGES.find((s) => months >= s.monthsRange.min && months < s.monthsRange.max) ?? null;
}

/** Learning styles. */
export type LearningStyle = "visual" | "auditory" | "kinesthetic" | "reading_writing";

export interface LearningStylePattern {
	style: LearningStyle;
	name: string;
	nameEn: string;
	patterns: RegExp[];
	characteristics: string[];
	strategies: string[];
}

export const LEARNING_STYLES: LearningStylePattern[] = [
	{
		style: "visual",
		name: "视觉型",
		nameEn: "Visual",
		patterns: [/(视觉|visual|看图|图片|视频|画|图表|diagram|chart|看)/i],
		characteristics: ["记得脸不记得名字", "喜欢看图解", "做白日梦", "对颜色敏感"],
		strategies: ["用思维导图", "彩色笔记", "图表/视频", "空间记忆", "减少文字，多用视觉"],
	},
	{
		style: "auditory",
		name: "听觉型",
		nameEn: "Auditory",
		patterns: [/(听觉|auditory|听|声音|读出来|讲故事|讨论|对话|music|音乐)/i],
		characteristics: ["记得名字不记得脸", "喜欢讨论", "自言自语", "对音乐敏感"],
		strategies: ["朗读笔记", "讨论/辩论", "录音回放", "音乐记忆", "口述作业"],
	},
	{
		style: "kinesthetic",
		name: "动觉型",
		nameEn: "Kinesthetic",
		patterns: [/(动觉|kinesthetic|动手|做|实验|运动|操作|tactile|play|hand)/i],
		characteristics: ["坐不住", "动手学得快", "运动中思考", "需要身体参与"],
		strategies: ["实验/动手项目", "角色扮演", "实地考察", "间隔走动学习", "做教具"],
	},
	{
		style: "reading_writing",
		name: "读写型",
		nameEn: "Reading/Writing",
		patterns: [/(读写|reading|writing|读书|笔记|列表|写|note|list)/i],
		characteristics: ["喜欢列表/笔记", "擅长写作", "对文字记忆好", "安静时学得最好"],
		strategies: ["读书+做笔记", "写摘要", "列表化信息", "重读巩固", "图书馆学习"],
	},
];

/** Detect learning style from parent description. */
export function detectLearningStyle(text: string): LearningStyle | null {
	const found: LearningStyle[] = [];
	for (const ls of LEARNING_STYLES) {
		for (const re of ls.patterns) {
			if (re.test(text)) {
				if (!found.includes(ls.style)) found.push(ls.style);
			}
		}
	}
	if (found.length === 0) return null;
	// return first
	return found[0];
}

/** Interest categories. */
export type InterestCategory = "stem" | "arts" | "sports" | "language" | "social" | "music";

export interface InterestInfo {
	category: InterestCategory;
	name: string;
	nameEn: string;
	patterns: RegExp[];
	activities: string[];
}

export const INTERESTS: InterestInfo[] = [
	{
		category: "stem",
		name: "理工科",
		nameEn: "STEM",
		patterns: [/(科学|数学|编程|stem|工程|物理|化学|生物|robot|lego|积木|数学|math|code|coding|编程)/i],
		activities: ["乐高/积木", "科学实验", "编程入门 (Scratch)", "数学游戏", "自然博物馆"],
	},
	{
		category: "arts",
		name: "艺术/手工",
		nameEn: "Arts",
		patterns: [/(画画|绘画|美术|手工|捏橡皮泥|art|draw|paint|craft|粘土)/i],
		activities: ["绘画", "黏土/橡皮泥", "剪纸", "艺术博物馆", "DIY 手工"],
	},
	{
		category: "sports",
		name: "运动",
		nameEn: "Sports",
		patterns: [/(运动|球|游泳|跑步|体育|sport|football|basketball|soccer|swim|run|ball|跳|平衡车)/i],
		activities: ["游泳", "球类", "跑步/骑车", "平衡车/滑板车", "儿童体操"],
	},
	{
		category: "language",
		name: "语言/阅读",
		nameEn: "Language",
		patterns: [/(阅读|读书|绘本|英语|英文|中文|讲故事|read|book|story|language|外语)/i],
		activities: ["亲子阅读", "分级读物", "听书", "外语启蒙 (动画片/儿歌)", "图书馆"],
	},
	{
		category: "music",
		name: "音乐",
		nameEn: "Music",
		patterns: [/(音乐|钢琴|唱歌|儿歌|乐器|music|piano|sing|instrument|guitar|drum|打击乐)/i],
		activities: ["听音乐", "唱歌", "乐器启蒙 (钢琴/小提琴/尤克里里)", "节奏游戏", "音乐律动"],
	},
	{
		category: "social",
		name: "社交/情感",
		nameEn: "Social",
		patterns: [/(社交|朋友|合群|分享|合作|social|friend|play.date|teamwork|团队)/i],
		activities: ["角色扮演", "小组游戏", "社区活动", "团队运动", "兄弟姐妹互动"],
	},
];

export function detectInterests(text: string): InterestCategory[] {
	const found: InterestCategory[] = [];
	for (const i of INTERESTS) {
		for (const re of i.patterns) {
			if (re.test(text) && !found.includes(i.category)) found.push(i.category);
		}
	}
	return found;
}

export function suggestActivities(interests: InterestCategory[], ageMonths: number, timeMinutes: number = 30): string[] {
	const suggestions: string[] = [];
	const stage = getEduStage(ageMonths);
	if (!stage) return suggestions;
	for (const interest of interests) {
		const info = INTERESTS.find((i) => i.category === interest);
		if (!info) continue;
		// pick 1-2 activities appropriate for age and time
		const all = info.activities;
		const pick = timeMinutes < 20 ? all.slice(0, 1) : all.slice(0, 2);
		for (const a of pick) {
			suggestions.push(`[${info.nameEn}] ${a}`);
		}
	}
	return suggestions;
}
