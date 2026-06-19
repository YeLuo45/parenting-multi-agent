/**
 * Sleep coach knowledge base — sleep training, regressions, schedule.
 */

export type SleepMethod = "cry_it_out" | "fading" | "pick_up_put_down" | "chair" | "fading_chair" | "scheduled_wake";

export interface SleepTrainingMethod {
	id: SleepMethod;
	name: string;
	nameEn: string;
	minAgeMonths: number;
	description: string;
	pros: string[];
	cons: string[];
	suitability: string;
	daysToEffect: number;
}

export const SLEEP_METHODS: SleepTrainingMethod[] = [
	{
		id: "cry_it_out",
		name: "哭声免疫法",
		nameEn: "Cry It Out (Ferber unmodified)",
		minAgeMonths: 6,
		description: "完全让孩子哭，直到自然入睡。争议较大但效果最快。",
		pros: ["效果最快（3-7 天）", "父母和孩子都得到休息"],
		cons: ["对孩子压力大", "可能影响亲子信任", "不适用于焦虑型宝宝"],
		suitability: "安全感强的宝宝，父母能坚持的情况",
		daysToEffect: 5,
	},
	{
		id: "fading",
		name: "渐进消退法 (Ferber)",
		nameEn: "Graduated Extinction (Ferber)",
		minAgeMonths: 4,
		description: "按固定间隔去看孩子，逐渐延长间隔。",
		pros: ["比纯哭声免疫温和", "孩子知道你会回来", "效果中等（1-2 周）"],
		cons: ["需要父母坚持", "前 3 天会很累"],
		suitability: "大多数家庭首选，平衡的方法",
		daysToEffect: 10,
	},
	{
		id: "pick_up_put_down",
		name: "抱起放下法",
		nameEn: "Pick Up Put Down",
		minAgeMonths: 4,
		description: "孩子哭时抱起来安抚，放下后继续哭再抱。循环。",
		pros: ["最温和", "宝宝感到被爱"],
		cons: ["父母非常累（30-60 次/夜）", "效果最慢（2-4 周）"],
		suitability: "高需求宝宝、焦虑型父母",
		daysToEffect: 21,
	},
	{
		id: "chair",
		name: "椅子法",
		nameEn: "Chair Method",
		minAgeMonths: 6,
		description: "父母坐在床边，逐步后移椅子直到门外。",
		pros: ["渐进式", "孩子能看到父母"],
		cons: ["慢（3-4 周）", "需要坚持不哄"],
		suitability: "不忍心听孩子哭但又想训练的",
		daysToEffect: 21,
	},
	{
		id: "fading_chair",
		name: "渐进椅子法",
		nameEn: "Fading Chair (Sleep Lady Shuffle)",
		minAgeMonths: 6,
		description: "椅子法变种，每晚把椅子往门边移一点。",
		pros: ["渐进比椅子法更平滑", "孩子有时间适应"],
		cons: ["3-4 周见效"],
		suitability: "能坚持 3-4 周的家庭",
		daysToEffect: 21,
	},
	{
		id: "scheduled_wake",
		name: "定时唤醒法",
		nameEn: "Scheduled Waking",
		minAgeMonths: 12,
		description: "在孩子通常夜醒前 15 分钟轻唤醒，再哄睡。",
		pros: ["不打不骂", "适合大孩子"],
		cons: ["见效慢", "需要记录夜醒时间"],
		suitability: "夜醒有固定时间的宝宝",
		daysToEffect: 14,
	},
];

/** Get sleep methods appropriate for given age. */
export function getSleepMethodsForAge(ageMonths: number): SleepTrainingMethod[] {
	return SLEEP_METHODS.filter((m) => m.minAgeMonths <= ageMonths);
}

/** Get sleep methods by id. */
export function getSleepMethod(id: SleepMethod): SleepTrainingMethod | null {
	return SLEEP_METHODS.find((m) => m.id === id) ?? null;
}

/** Sleep regression windows (months). Common known regressions. */
export interface SleepRegression {
	ageMonths: number;
	name: string;
	commonAgeRange: string;
	duration: string;
	cause: string;
	advice: string[];
}

export const SLEEP_REGRESSIONS: SleepRegression[] = [
	{
		ageMonths: 4,
		name: "4 月睡眠倒退",
		commonAgeRange: "3-4 月",
		duration: "2-4 周",
		cause: "睡眠周期成熟，从新生儿睡眠转向成人式睡眠",
		advice: [
			"保持规律作息",
			"增加白天小睡质量",
			"傍晚前避免过度刺激",
			"坚持已有的睡前程序",
		],
	},
	{
		ageMonths: 8,
		name: "8 月睡眠倒退",
		commonAgeRange: "8-10 月",
		duration: "2-6 周",
		cause: "分离焦虑 + 大运动发展（爬、扶站）",
		advice: [
			"白天增加高质量陪伴",
			"睡前多拥抱",
			"保持睡前程序一致",
			"不要开始新的睡眠训练",
		],
	},
	{
		ageMonths: 12,
		name: "12 月睡眠倒退",
		commonAgeRange: "12-18 月",
		duration: "2-4 周",
		cause: "学步期 + 分离焦虑高峰",
		advice: [
			"白天多陪伴",
			"晚间增加安抚时间",
			"保持规律",
		],
	},
	{
		ageMonths: 18,
		name: "18 月睡眠倒退",
		commonAgeRange: "18 月-2 岁",
		duration: "2-6 周",
		cause: "语言爆发 + 自主意识 + 噩梦开始",
		advice: [
			"白天教孩子表达情绪",
			"噩梦时简短安慰，不强化",
			"保持作息",
		],
	},
	{
		ageMonths: 24,
		name: "2 岁睡眠倒退",
		commonAgeRange: "2-3 岁",
		duration: "2-6 周",
		cause: "想象力和语言爆发 + 怕黑",
		advice: [
			"提供夜灯",
			"白天讨论害怕的东西",
			"避免恐怖内容",
		],
	},
];

/** Get sleep regression near a given age. */
export function getSleepRegression(ageMonths: number): SleepRegression | null {
	// Find the regression whose ageMonths is within 2 of the given age
	let nearest: SleepRegression | null = null;
	let minDist = Infinity;
	for (const r of SLEEP_REGRESSIONS) {
		const dist = Math.abs(r.ageMonths - ageMonths);
		if (dist <= 2 && dist < minDist) {
			nearest = r;
			minDist = dist;
		}
	}
	return nearest;
}

/** Nap schedule by age. */
export interface NapSchedule {
	ageMonths: number;
	totalNaps: number;
	napDurations: string[]; // e.g. ["9:00-9:45", "13:00-14:30"]
	nightSleep: string; // e.g. "19:00-6:30 (11.5h)"
	notes?: string;
}

export const NAP_SCHEDULES: NapSchedule[] = [
	{ ageMonths: 0, totalNaps: 0, napDurations: [], nightSleep: "不规律", notes: "新生儿期：按需睡眠" },
	{ ageMonths: 3, totalNaps: 4, napDurations: ["短小睡 30-45 分钟"], nightSleep: "9-11 小时" },
	{ ageMonths: 6, totalNaps: 3, napDurations: ["上午 9:00-9:45", "中午 12:30-13:30", "下午 15:30-16:00"], nightSleep: "10-12 小时" },
	{ ageMonths: 9, totalNaps: 2, napDurations: ["上午 9:30-10:30", "下午 13:30-15:00"], nightSleep: "11-12 小时" },
	{ ageMonths: 12, totalNaps: 2, napDurations: ["上午 10:00-11:00", "下午 13:30-15:00"], nightSleep: "11-12 小时" },
	{ ageMonths: 18, totalNaps: 1, napDurations: ["下午 13:00-15:00"], nightSleep: "11-12 小时" },
	{ ageMonths: 36, totalNaps: 1, napDurations: ["下午 13:00-14:30"], nightSleep: "10-11 小时" },
	{ ageMonths: 60, totalNaps: 0, napDurations: [], nightSleep: "10-11 小时" },
];

/** Get nap schedule for given age. */
export function getNapSchedule(ageMonths: number): NapSchedule {
	let nearest = NAP_SCHEDULES[0];
	for (const s of NAP_SCHEDULES) {
		if (s.ageMonths <= ageMonths) nearest = s;
	}
	return nearest;
}

/** Bedtime routine steps. */
export const BEDTIME_ROUTINE_STEPS: string[] = [
	"关电视/电子设备（睡前 1 小时）",
	"洗澡（10-15 分钟，水温 37-38°C）",
	"换睡衣 + 换尿布",
	"亲子阅读（10-15 分钟绘本）",
	"喝奶/喝水（避免太多水）",
	"轻柔音乐或白噪音",
	"关大灯，开小夜灯",
	"拥抱 + 道晚安",
	"放到床上（清醒但困倦）",
];

/** Common night-waking causes by age. */
export interface NightWakingCause {
	ageMonthsMin: number;
	ageMonthsMax: number;
	cause: string;
	advice: string;
}

export const NIGHT_WAKING_CAUSES: NightWakingCause[] = [
	{ ageMonthsMin: 0, ageMonthsMax: 6, cause: "饿了（胃容量小）", advice: "按需哺乳/喂奶" },
	{ ageMonthsMin: 3, ageMonthsMax: 12, cause: "昼夜颠倒", advice: "增加白天光照，夜间保持安静黑暗" },
	{ ageMonthsMin: 4, ageMonthsMax: 8, cause: "4 月睡眠倒退", advice: "保持规律作息，熬过 2-4 周" },
	{ ageMonthsMin: 6, ageMonthsMax: 12, cause: "分离焦虑开始", advice: "白天增加陪伴，夜间多安抚" },
	{ ageMonthsMin: 6, ageMonthsMax: 24, cause: "出牙痛", advice: "白天给牙胶，睡前咨询医生用药" },
	{ ageMonthsMin: 6, ageMonthsMax: 12, cause: "8-10 月睡眠倒退", advice: "大运动发展期，白天充分放电" },
	{ ageMonthsMin: 12, ageMonthsMax: 18, cause: "12 月分离焦虑高峰", advice: "白天多陪伴" },
	{ ageMonthsMin: 12, ageMonthsMax: 36, cause: "噩梦/夜惊", advice: "简短安慰，不强化恐惧" },
	{ ageMonthsMin: 18, ageMonthsMax: 60, cause: "夜醒习惯（依赖奶/抱）", advice: "考虑睡眠训练" },
	{ ageMonthsMin: 24, ageMonthsMax: 60, cause: "怕黑/想象丰富", advice: "夜灯 + 白天讨论害怕的东西" },
];

/** Get possible night-waking causes for given age. */
export function getNightWakingCauses(ageMonths: number): NightWakingCause[] {
	return NIGHT_WAKING_CAUSES.filter((c) => ageMonths >= c.ageMonthsMin && ageMonths <= c.ageMonthsMax);
}
