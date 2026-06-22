/**
 * HabitBuilder knowledge base — habit loop, routines, screen time, AAP guidance.
 *
 * Phase 2 batch 2: deterministic rule-based engine. No LLM call.
 */

export type HabitDomain =
	| "sleep"
	| "nutrition"
	| "hygiene"
	| "screen"
	| "chores"
	| "school";
export type HabitCue = "time" | "location" | "preceding_action" | "emotion";

export interface HabitStep {
	order: number;
	cue?: HabitCue;
	action: string;
	durationMinutes: number;
	reward?: string;
}

export interface Habit {
	id: string;
	domain: HabitDomain;
	title: string;
	description: string;
	ageMonthsMin: number;
	ageMonthsMax: number;
	steps: HabitStep[];
	frequencyPerDay: number;
	difficulty: "easy" | "medium" | "hard";
	formationDays: number; // avg days to form habit (Lally et al. 2009)
}

/** Habit formation stages per Lally et al. (2009): 18-254 days, avg 66. */
export const HABIT_FORMATION_AVG_DAYS = 66;

export const HABITS: Habit[] = [
	{
		id: "habit-bedtime-routine",
		domain: "sleep",
		title: "睡前例行程序",
		description: "建立固定 30-60 分钟的睡前流程，帮助孩子入睡",
		ageMonthsMin: 6,
		ageMonthsMax: 216,
		steps: [
			{
				order: 1,
				cue: "time",
				action: "关掉电视/电子屏幕",
				durationMinutes: 30,
			},
			{ order: 2, action: "洗澡或擦澡", durationMinutes: 10 },
			{ order: 3, action: "换睡衣、刷牙", durationMinutes: 5 },
			{ order: 4, action: "亲子阅读/讲故事", durationMinutes: 15 },
			{
				order: 5,
				cue: "preceding_action",
				action: "关灯/调暗灯光",
				durationMinutes: 5,
			},
			{ order: 6, action: "拥抱/道晚安", durationMinutes: 3 },
		],
		frequencyPerDay: 1,
		difficulty: "easy",
		formationDays: 30,
	},
	{
		id: "habit-brushing-teeth",
		domain: "hygiene",
		title: "刷牙习惯",
		description:
			"AAP 推荐 6 月龄起开始口腔护理，2 岁起使用豌豆大小含氟牙膏",
		ageMonthsMin: 6,
		ageMonthsMax: 216,
		steps: [
			{
				order: 1,
				cue: "time",
				action: "早饭后刷牙 (2 分钟)",
				durationMinutes: 2,
			},
			{
				order: 2,
				cue: "time",
				action: "睡前刷牙 (2 分钟)",
				durationMinutes: 2,
			},
		],
		frequencyPerDay: 2,
		difficulty: "medium",
		formationDays: 60,
	},
	{
		id: "habit-handwash",
		domain: "hygiene",
		title: "饭前便后洗手",
		description: "培养孩子饭前、便后、外出回家洗手的习惯",
		ageMonthsMin: 18,
		ageMonthsMax: 216,
		steps: [
			{
				order: 1,
				cue: "preceding_action",
				action: "打开水龙头",
				durationMinutes: 1,
			},
			{ order: 2, action: "打湿双手，涂抹肥皂", durationMinutes: 1 },
			{
				order: 3,
				action: "搓洗手心、手背、指缝 20 秒",
				durationMinutes: 1,
			},
			{ order: 4, action: "冲洗干净", durationMinutes: 1 },
			{ order: 5, action: "用干净毛巾擦干", durationMinutes: 1 },
		],
		frequencyPerDay: 5,
		difficulty: "medium",
		formationDays: 45,
	},
	{
		id: "habit-vegetable-intro",
		domain: "nutrition",
		title: "蔬菜摄入",
		description: "每天尝试 1 种新蔬菜，重复 10-15 次建立接受度",
		ageMonthsMin: 6,
		ageMonthsMax: 72,
		steps: [
			{
				order: 1,
				cue: "time",
				action: "餐前介绍今天的蔬菜",
				durationMinutes: 1,
			},
			{
				order: 2,
				action: "让孩子观察、触摸、闻味道",
				durationMinutes: 2,
			},
			{ order: 3, action: "小口尝试（不强求吞咽）", durationMinutes: 3 },
			{
				order: 4,
				reward: "表扬/贴纸",
				action: "无论吃多少都鼓励",
				durationMinutes: 1,
			},
		],
		frequencyPerDay: 1,
		difficulty: "hard",
		formationDays: 90,
	},
	{
		id: "habit-screen-limit",
		domain: "screen",
		title: "屏幕时间管理",
		description:
			"AAP 推荐：2-5 岁每天屏幕时间 ≤ 1 小时高质量节目；6 岁以上一致限制",
		ageMonthsMin: 24,
		ageMonthsMax: 216,
		steps: [
			{
				order: 1,
				cue: "time",
				action: "设置屏幕时间窗口 (如 19:00-19:30)",
				durationMinutes: 30,
			},
			{
				order: 2,
				action: "选择共同观看的高质量内容",
				durationMinutes: 5,
			},
			{ order: 3, action: "观看期间讨论内容", durationMinutes: 20 },
			{
				order: 4,
				cue: "preceding_action",
				action: "到时间关闭设备并转移活动",
				durationMinutes: 5,
			},
		],
		frequencyPerDay: 1,
		difficulty: "hard",
		formationDays: 90,
	},
	{
		id: "habit-reading-time",
		domain: "school",
		title: "亲子阅读时间",
		description: "AAP 推荐每天亲子阅读 15 分钟",
		ageMonthsMin: 6,
		ageMonthsMax: 108,
		steps: [
			{
				order: 1,
				cue: "time",
				action: "选择 2-3 本绘本",
				durationMinutes: 2,
			},
			{ order: 2, action: "亲子共读，孩子可翻页", durationMinutes: 13 },
			{
				order: 3,
				reward: "拥抱/鼓掌",
				action: "结束后表扬",
				durationMinutes: 1,
			},
		],
		frequencyPerDay: 1,
		difficulty: "easy",
		formationDays: 30,
	},
	{
		id: "habit-toy-cleanup",
		domain: "chores",
		title: "玩具归位",
		description: "玩完玩具后自己收拾，培养责任感",
		ageMonthsMin: 24,
		ageMonthsMax: 108,
		steps: [
			{
				order: 1,
				cue: "preceding_action",
				action: "玩完后唱'收拾歌'",
				durationMinutes: 1,
			},
			{ order: 2, action: "按类别把玩具放回箱子", durationMinutes: 5 },
			{
				order: 3,
				reward: "贴纸/小奖励",
				action: "完成后表扬",
				durationMinutes: 1,
			},
		],
		frequencyPerDay: 1,
		difficulty: "medium",
		formationDays: 45,
	},
	{
		id: "habit-morning-routine",
		domain: "school",
		title: "晨起例行程序",
		description: "上幼儿园/小学前的早晨流程",
		ageMonthsMin: 36,
		ageMonthsMax: 144,
		steps: [
			{
				order: 1,
				cue: "time",
				action: "起床 (固定时间)",
				durationMinutes: 1,
			},
			{ order: 2, action: "穿衣", durationMinutes: 5 },
			{ order: 3, action: "刷牙洗脸", durationMinutes: 5 },
			{ order: 4, action: "吃早餐", durationMinutes: 15 },
			{ order: 5, action: "出门前检查书包", durationMinutes: 3 },
		],
		frequencyPerDay: 1,
		difficulty: "medium",
		formationDays: 45,
	},
];

/** Get habits for a given age and (optional) domain filter. */
export function getHabitsForAge(
	ageMonths: number,
	domain?: HabitDomain,
): Habit[] {
	return HABITS.filter(
		(h) =>
			ageMonths >= h.ageMonthsMin &&
			ageMonths <= h.ageMonthsMax &&
			(!domain || h.domain === domain),
	);
}

/** Get habits by domain. */
export function getHabitsByDomain(domain: HabitDomain): Habit[] {
	return HABITS.filter((h) => h.domain === domain);
}

/** Get a habit by id. */
export function getHabitById(id: string): Habit | undefined {
	return HABITS.find((h) => h.id === id);
}

/** Total steps in a habit. */
export function habitStepCount(habit: Habit): number {
	return habit.steps.length;
}

/** Total duration of all steps. */
export function habitTotalDuration(habit: Habit): number {
	return habit.steps.reduce((sum, s) => sum + s.durationMinutes, 0);
}

/** Estimated days to form habit. Uses Lally's average (66 days) as fallback. */
export function estimateFormationDays(habit: Habit): number {
	return habit.formationDays;
}

/** Habit streak: consecutive successful completions. */
export function streakLevel(
	streakDays: number,
): "new" | "building" | "established" | "automatic" {
	if (streakDays < 7) return "new";
	if (streakDays < 30) return "building";
	if (streakDays < 90) return "established";
	return "automatic";
}

/** Habit loop visualizer: returns string of cue → routine → reward. */
export function habitLoop(habit: Habit): {
	cue: string;
	routine: string[];
	reward: string;
} {
	const cueStep = habit.steps.find((s) => s.cue);
	const routine = habit.steps
		.filter((s) => !s.cue && !s.reward)
		.map((s) => s.action);
	const rewardStep = habit.steps.find((s) => s.reward);
	return {
		cue: cueStep ? `${cueStep.cue}: ${cueStep.action}` : "无明确触发",
		routine,
		reward: rewardStep?.reward ?? "完成后表扬",
	};
}

/** AAP screen time recommendations by age. */
export interface ScreenTimeGuideline {
	ageMonthsMin: number;
	ageMonthsMax: number;
	dailyLimitMinutes: number;
	notes: string;
}

export const SCREEN_TIME_GUIDELINES: ScreenTimeGuideline[] = [
	{
		ageMonthsMin: 0,
		ageMonthsMax: 18,
		dailyLimitMinutes: 0,
		notes: "避免屏幕时间 (视频通话除外)",
	},
	{
		ageMonthsMin: 18,
		ageMonthsMax: 24,
		dailyLimitMinutes: 30,
		notes: "高质量节目 + 家长陪同",
	},
	{
		ageMonthsMin: 24,
		ageMonthsMax: 60,
		dailyLimitMinutes: 60,
		notes: "≤1 小时高质量节目",
	},
	{
		ageMonthsMin: 60,
		ageMonthsMax: 216,
		dailyLimitMinutes: 120,
		notes: "一致限制，不影响睡眠/运动/学习",
	},
];

export function screenTimeForAge(
	ageMonths: number,
): ScreenTimeGuideline | undefined {
	return SCREEN_TIME_GUIDELINES.find(
		(g) => ageMonths >= g.ageMonthsMin && ageMonths <= g.ageMonthsMax,
	);
}

/** Sleep hours needed by age (AAP). */
export interface SleepHoursGuideline {
	ageMonthsMin: number;
	ageMonthsMax: number;
	hoursPerDay: number;
	includesNap: boolean;
}

export const SLEEP_HOURS_GUIDELINES: SleepHoursGuideline[] = [
	{ ageMonthsMin: 0, ageMonthsMax: 3, hoursPerDay: 16, includesNap: true },
	{ ageMonthsMin: 4, ageMonthsMax: 11, hoursPerDay: 12, includesNap: true },
	{ ageMonthsMin: 12, ageMonthsMax: 24, hoursPerDay: 11, includesNap: true },
	{ ageMonthsMin: 24, ageMonthsMax: 60, hoursPerDay: 11, includesNap: false },
	{
		ageMonthsMin: 60,
		ageMonthsMax: 144,
		hoursPerDay: 10,
		includesNap: false,
	},
	{
		ageMonthsMin: 144,
		ageMonthsMax: 216,
		hoursPerDay: 9,
		includesNap: false,
	},
];

export function sleepHoursForAge(
	ageMonths: number,
): SleepHoursGuideline | undefined {
	return SLEEP_HOURS_GUIDELINES.find(
		(g) => ageMonths >= g.ageMonthsMin && ageMonths <= g.ageMonthsMax,
	);
}
