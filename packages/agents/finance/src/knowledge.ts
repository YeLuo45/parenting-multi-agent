/**
 * Finance knowledge base — education fund, insurance, school fees.
 */

export type FinanceTopic =
	| "education_fund"
	| "insurance"
	| "school_fees"
	| "budget"
	| "savings";

export interface EducationFundPlan {
	id: string;
	name: string;
	minAgeMonths: number;
	monthlyAmount: number; // CNY
	yearsToMaturity: number;
	expectedAnnualReturn: number; // percentage
	description: string;
	pros: string[];
	cons: string[];
}

export const EDUCATION_FUND_PLANS: EducationFundPlan[] = [
	{
		id: "early_start_low",
		name: "早期低额教育金（0-6 岁）",
		minAgeMonths: 0,
		monthlyAmount: 500,
		yearsToMaturity: 18,
		expectedAnnualReturn: 4,
		description: "从出生开始每月 500 元，定投 18 年",
		pros: ["起点低", "复利效应大", "建立储蓄习惯"],
		cons: ["长期坚持需要纪律", "通胀可能侵蚀收益"],
	},
	{
		id: "early_start_mid",
		name: "早期中额教育金（0-6 岁）",
		minAgeMonths: 0,
		monthlyAmount: 2000,
		yearsToMaturity: 18,
		expectedAnnualReturn: 4,
		description: "从出生开始每月 2000 元",
		pros: ["复利更大", "覆盖大部分教育支出"],
		cons: ["家庭现金流压力大"],
	},
	{
		id: "mid_start",
		name: "中期教育金（6-12 岁）",
		minAgeMonths: 72,
		monthlyAmount: 3000,
		yearsToMaturity: 12,
		expectedAnnualReturn: 3.5,
		description: "从小学开始每月 3000 元",
		pros: ["目标明确", "压力较小"],
		cons: ["复利效应缩短"],
	},
	{
		id: "high_start",
		name: "晚期大额教育金（12+ 岁）",
		minAgeMonths: 144,
		monthlyAmount: 5000,
		yearsToMaturity: 6,
		expectedAnnualReturn: 3,
		description: "从初高中开始每月 5000 元",
		pros: ["定向明确（大学/留学）", "金额精准"],
		cons: ["积累时间短", "总收益最低"],
	},
];

/** Calculate total accumulated amount. */
export function calculateFundValue(
	plan: EducationFundPlan,
	totalMonths: number = plan.yearsToMaturity * 12,
): number {
	const months = Math.min(totalMonths, plan.yearsToMaturity * 12);
	const r = plan.expectedAnnualReturn / 100 / 12;
	// Future value of annuity: FV = PMT * [((1+r)^n - 1) / r]
	return plan.monthlyAmount * (((1 + r) ** months - 1) / r);
}

/** Get recommended plan for given age. */
export function getRecommendedPlan(ageMonths: number): EducationFundPlan {
	const eligible = EDUCATION_FUND_PLANS.filter(
		(p) => ageMonths >= p.minAgeMonths,
	);
	eligible.sort((a, b) => b.minAgeMonths - a.minAgeMonths);
	return eligible[0];
}

export interface InsuranceType {
	id: string;
	name: string;
	description: string;
	coverage: string;
	typicalCost: string;
	priority: "essential" | "recommended" | "optional";
	notes: string;
}

export const INSURANCE_TYPES: InsuranceType[] = [
	{
		id: "medical",
		name: "少儿医保/医疗险",
		description: "基本医疗保障（社保）",
		coverage: "门诊 + 住院",
		typicalCost: "300-1000 元/年",
		priority: "essential",
		notes: "出生后立即办理",
	},
	{
		id: "accident",
		name: "意外险",
		description: "意外伤害保障",
		coverage: "意外医疗 + 伤残",
		typicalCost: "100-500 元/年",
		priority: "essential",
		notes: "便宜高保额",
	},
	{
		id: "critical_illness",
		name: "重疾险",
		description: "重大疾病保障",
		coverage: "白血病等儿童重疾一次性赔付",
		typicalCost: "1000-5000 元/年",
		priority: "recommended",
		notes: "年龄越小越便宜",
	},
	{
		id: "education_savings",
		name: "教育金险（带保险功能）",
		description: "储蓄 + 保障组合",
		coverage: "教育 + 身故保障",
		typicalCost: "5000-20000 元/年",
		priority: "optional",
		notes: "收益一般，建议先保障后储蓄",
	},
	{
		id: "dental_accident",
		name: "齿科意外险",
		description: "儿童牙齿意外/治疗",
		coverage: "牙齿修复",
		typicalCost: "200-600 元/年",
		priority: "optional",
		notes: "可选，看需求",
	},
];

/** Get insurance by priority. */
export function getEssentialInsurance(): InsuranceType[] {
	return INSURANCE_TYPES.filter((i) => i.priority === "essential");
}

/** Get insurance by id. */
export function getInsurance(id: string): InsuranceType | null {
	return INSURANCE_TYPES.find((i) => i.id === id) ?? null;
}

/** Average school fees by stage (CNY/year). */
export interface SchoolFee {
	stage: string;
	ageRange: string;
	publicSchool: number;
	privateSchool: number;
	extracurricular: number;
}

export const SCHOOL_FEES: SchoolFee[] = [
	{
		stage: "幼儿园",
		ageRange: "3-6 岁",
		publicSchool: 1000,
		privateSchool: 30000,
		extracurricular: 5000,
	},
	{
		stage: "小学",
		ageRange: "6-12 岁",
		publicSchool: 0,
		privateSchool: 50000,
		extracurricular: 8000,
	},
	{
		stage: "初中",
		ageRange: "12-15 岁",
		publicSchool: 0,
		privateSchool: 30000,
		extracurricular: 10000,
	},
	{
		stage: "高中",
		ageRange: "15-18 岁",
		publicSchool: 2000,
		privateSchool: 50000,
		extracurricular: 12000,
	},
	{
		stage: "大学（国内）",
		ageRange: "18-22 岁",
		publicSchool: 6000,
		privateSchool: 30000,
		extracurricular: 5000,
	},
	{
		stage: "大学（留学）",
		ageRange: "18-22 岁",
		publicSchool: 300000,
		privateSchool: 300000,
		extracurricular: 20000,
	},
];

/** Get school fee for given stage. */
export function getSchoolFee(stage: string): SchoolFee | null {
	return SCHOOL_FEES.find((f) => f.stage === stage) ?? null;
}

/** Total estimated cost from birth to college (CNY). */
export function estimateTotalEducationCost(
	tier: "public" | "private" | "study_abroad",
): number {
	let total = 0;
	for (const f of SCHOOL_FEES) {
		if (tier === "public") total += f.publicSchool + f.extracurricular;
		else if (tier === "private")
			total += f.privateSchool + f.extracurricular;
		else total += f.privateSchool + f.extracurricular;
	}
	return total;
}
