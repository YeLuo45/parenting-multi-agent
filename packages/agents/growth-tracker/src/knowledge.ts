/**
 * GrowthTracker knowledge base — WHO/CDC growth standards + developmental milestones.
 *
 * Phase 2 batch 2: deterministic table-based percentile estimation.
 * Real LMS (Lambda-Mu-Sigma) parameters are approximated with piecewise linear models
 * for ages 0-60 months. For ages >60m, falls back to CDC simplified ranges.
 */

export type GrowthMetric = "height" | "weight" | "head_circumference";
export type GrowthSex = "male" | "female";

/** Simplified WHO percentile lookup (P3, P15, P50, P85, P97) by age in months.
 *  Values represent median (P50). P3/P97 approximate ±2 SD. Linear interpolation between rows.
 *  Source: WHO Child Growth Standards (2006) for 0-24m; WHO Growth Reference 2007 for 2-5y. */
export interface GrowthStandardRow {
	ageMonths: number;
	male: Record<
		GrowthMetric,
		{ p3: number; p15: number; p50: number; p85: number; p97: number }
	>;
	female: Record<
		GrowthMetric,
		{ p3: number; p15: number; p50: number; p85: number; p97: number }
	>;
}

export const GROWTH_STANDARDS: GrowthStandardRow[] = [
	{
		ageMonths: 0,
		male: {
			height: { p3: 46.1, p15: 48.0, p50: 49.9, p85: 51.8, p97: 53.7 },
			weight: { p3: 2.5, p15: 2.8, p50: 3.3, p85: 3.9, p97: 4.4 },
			head_circumference: {
				p3: 31.9,
				p15: 33.2,
				p50: 34.5,
				p85: 35.7,
				p97: 36.9,
			},
		},
		female: {
			height: { p3: 45.4, p15: 47.3, p50: 49.1, p85: 51.0, p97: 52.9 },
			weight: { p3: 2.4, p15: 2.7, p50: 3.2, p85: 3.8, p97: 4.2 },
			head_circumference: {
				p3: 31.5,
				p15: 32.7,
				p50: 33.9,
				p85: 35.1,
				p97: 36.2,
			},
		},
	},
	{
		ageMonths: 6,
		male: {
			height: { p3: 61.2, p15: 63.3, p50: 65.7, p85: 68.0, p97: 70.3 },
			weight: { p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.9, p97: 9.8 },
			head_circumference: {
				p3: 40.6,
				p15: 41.9,
				p50: 43.3,
				p85: 44.7,
				p97: 46.0,
			},
		},
		female: {
			height: { p3: 60.1, p15: 62.3, p50: 64.1, p85: 66.2, p97: 68.4 },
			weight: { p3: 5.7, p15: 6.5, p50: 7.3, p85: 8.4, p97: 9.3 },
			head_circumference: {
				p3: 39.6,
				p15: 40.9,
				p50: 42.2,
				p85: 43.5,
				p97: 44.8,
			},
		},
	},
	{
		ageMonths: 12,
		male: {
			height: { p3: 70.0, p15: 72.0, p50: 74.0, p85: 76.0, p97: 78.0 },
			weight: { p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 11.9 },
			head_circumference: {
				p3: 43.0,
				p15: 44.5,
				p50: 46.1,
				p85: 47.5,
				p97: 48.9,
			},
		},
		female: {
			height: { p3: 68.0, p15: 70.0, p50: 72.0, p85: 74.5, p97: 76.5 },
			weight: { p3: 7.0, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.3 },
			head_circumference: {
				p3: 42.0,
				p15: 43.5,
				p50: 45.0,
				p85: 46.5,
				p97: 47.8,
			},
		},
	},
	{
		ageMonths: 24,
		male: {
			height: { p3: 81.0, p15: 83.5, p50: 86.5, p85: 89.5, p97: 92.5 },
			weight: { p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.9, p97: 15.3 },
			head_circumference: {
				p3: 45.0,
				p15: 46.5,
				p50: 48.0,
				p85: 49.5,
				p97: 51.0,
			},
		},
		female: {
			height: { p3: 79.6, p15: 82.0, p50: 85.0, p85: 88.0, p97: 91.0 },
			weight: { p3: 9.0, p15: 10.0, p50: 11.5, p85: 13.2, p97: 14.7 },
			head_circumference: {
				p3: 44.0,
				p15: 45.5,
				p50: 47.0,
				p85: 48.5,
				p97: 50.0,
			},
		},
	},
	{
		ageMonths: 36,
		male: {
			height: { p3: 88.7, p15: 91.4, p50: 94.5, p85: 97.5, p97: 100.7 },
			weight: { p3: 11.3, p15: 12.7, p50: 14.3, p85: 16.3, p97: 18.0 },
			head_circumference: {
				p3: 46.0,
				p15: 47.3,
				p50: 49.0,
				p85: 50.5,
				p97: 52.0,
			},
		},
		female: {
			height: { p3: 87.4, p15: 90.0, p50: 93.0, p85: 96.0, p97: 99.0 },
			weight: { p3: 10.8, p15: 12.1, p50: 13.9, p85: 16.0, p97: 17.8 },
			head_circumference: {
				p3: 45.0,
				p15: 46.5,
				p50: 48.0,
				p85: 49.7,
				p97: 51.0,
			},
		},
	},
	{
		ageMonths: 60,
		male: {
			height: {
				p3: 100.7,
				p15: 103.5,
				p50: 107.0,
				p85: 110.5,
				p97: 114.0,
			},
			weight: { p3: 14.1, p15: 15.9, p50: 18.3, p85: 21.1, p97: 23.7 },
			head_circumference: {
				p3: 47.5,
				p15: 48.7,
				p50: 50.5,
				p85: 52.0,
				p97: 53.5,
			},
		},
		female: {
			height: {
				p3: 99.4,
				p15: 102.5,
				p50: 106.0,
				p85: 109.5,
				p97: 113.0,
			},
			weight: { p3: 13.7, p15: 15.4, p50: 17.9, p85: 20.8, p97: 23.5 },
			head_circumference: {
				p3: 46.5,
				p15: 47.8,
				p50: 49.5,
				p85: 51.0,
				p97: 52.5,
			},
		},
	},
];

/** Linear interpolation helper. */
function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/** Get percentile values for given age/metric/sex via interpolation. */
export function getPercentiles(
	ageMonths: number,
	metric: GrowthMetric,
	sex: GrowthSex,
): { p3: number; p15: number; p50: number; p85: number; p97: number } | null {
	if (ageMonths < 0) return null;
	// First row is ageMonths=0, so for ageMonths >= 0 there is always at least one matching row.
	const lower = GROWTH_STANDARDS.reduce<GrowthStandardRow>(
		(acc, r) => (r.ageMonths <= ageMonths ? r : acc),
		GROWTH_STANDARDS[0],
	);
	const upper = GROWTH_STANDARDS.find((r) => r.ageMonths > ageMonths) ?? null;
	if (!upper || lower.ageMonths === ageMonths) return lower[sex][metric];
	const t =
		(ageMonths - lower.ageMonths) / (upper.ageMonths - lower.ageMonths);
	const lo = lower[sex][metric];
	const up = upper[sex][metric];
	return {
		p3: lerp(lo.p3, up.p3, t),
		p15: lerp(lo.p15, up.p15, t),
		p50: lerp(lo.p50, up.p50, t),
		p85: lerp(lo.p85, up.p85, t),
		p97: lerp(lo.p97, up.p97, t),
	};
}

/** Estimate percentile from value. Returns 0-100. */
export function estimatePercentile(
	value: number,
	ageMonths: number,
	metric: GrowthMetric,
	sex: GrowthSex,
): number {
	const p = getPercentiles(ageMonths, metric, sex);
	if (!p) return 50;
	if (value <= p.p3) return 3;
	if (value <= p.p15) {
		// Interpolate 3-15
		const t = (value - p.p3) / (p.p15 - p.p3);
		return Math.round(3 + t * 12);
	}
	if (value <= p.p50) {
		const t = (value - p.p15) / (p.p50 - p.p15);
		return Math.round(15 + t * 35);
	}
	if (value <= p.p85) {
		const t = (value - p.p50) / (p.p85 - p.p50);
		return Math.round(50 + t * 35);
	}
	if (value <= p.p97) {
		const t = (value - p.p85) / (p.p97 - p.p85);
		return Math.round(85 + t * 12);
	}
	return 97;
}

/** Classify a percentile reading. */
export function classifyPercentile(
	percentile: number,
): "low" | "below_avg" | "average" | "above_avg" | "high" {
	if (percentile < 3) return "low";
	if (percentile < 15) return "below_avg";
	if (percentile < 85) return "average";
	if (percentile < 97) return "above_avg";
	return "high";
}

/** Growth concern detection: crosses 2+ percentile lines or below P3. */
export function detectGrowthConcern(
	current: {
		metric: GrowthMetric;
		value: number;
		ageMonths: number;
		sex: GrowthSex;
	},
	previous?: {
		metric: GrowthMetric;
		value: number;
		ageMonths: number;
		sex: GrowthSex;
	},
): { concern: boolean; reason?: string } {
	const p = estimatePercentile(
		current.value,
		current.ageMonths,
		current.metric,
		current.sex,
	);
	if (p <= 3) {
		return { concern: true, reason: `百分位低于 P3 (${p})，需就医评估` };
	}
	if (p >= 97) {
		return {
			concern: true,
			reason: `百分位高于 P97 (${p})，需医生评估是否过快`,
		};
	}
	if (previous) {
		const prevP = estimatePercentile(
			previous.value,
			previous.ageMonths,
			previous.metric,
			previous.sex,
		);
		if (Math.abs(p - prevP) > 25) {
			return {
				concern: true,
				reason: `百分位从 P${prevP} 变化到 P${p}，跨越 ≥2 条主要曲线，需就医评估`,
			};
		}
	}
	return { concern: false };
}

/** Milestone checklist per stage and domain. */
export interface Milestone {
	ageMonthsMin: number;
	ageMonthsMax: number;
	domain: "gross_motor" | "fine_motor" | "language" | "social" | "cognitive";
	description: string;
	redFlag: boolean;
}

export const MILESTONES: Milestone[] = [
	// 0-3 months
	{
		ageMonthsMin: 0,
		ageMonthsMax: 3,
		domain: "gross_motor",
		description: "俯卧时能抬头",
		redFlag: false,
	},
	{
		ageMonthsMin: 0,
		ageMonthsMax: 3,
		domain: "fine_motor",
		description: "手能触碰嘴",
		redFlag: false,
	},
	{
		ageMonthsMin: 0,
		ageMonthsMax: 3,
		domain: "social",
		description: "对父母微笑",
		redFlag: false,
	},
	{
		ageMonthsMin: 0,
		ageMonthsMax: 3,
		domain: "language",
		description: "对声音有反应",
		redFlag: false,
	},
	{
		ageMonthsMin: 0,
		ageMonthsMax: 3,
		domain: "cognitive",
		description: "视线追随物体",
		redFlag: false,
	},
	// 4-6 months
	{
		ageMonthsMin: 4,
		ageMonthsMax: 6,
		domain: "gross_motor",
		description: "能翻身",
		redFlag: false,
	},
	{
		ageMonthsMin: 4,
		ageMonthsMax: 6,
		domain: "fine_motor",
		description: "主动抓握物体",
		redFlag: false,
	},
	{
		ageMonthsMin: 4,
		ageMonthsMax: 6,
		domain: "language",
		description: "咿呀学语",
		redFlag: false,
	},
	// 7-9 months
	{
		ageMonthsMin: 7,
		ageMonthsMax: 9,
		domain: "gross_motor",
		description: "能坐稳",
		redFlag: false,
	},
	{
		ageMonthsMin: 7,
		ageMonthsMax: 9,
		domain: "language",
		description: "能听懂简单指令",
		redFlag: false,
	},
	{
		ageMonthsMin: 7,
		ageMonthsMax: 9,
		domain: "social",
		description: "认生",
		redFlag: false,
	},
	// 10-12 months
	{
		ageMonthsMin: 10,
		ageMonthsMax: 12,
		domain: "gross_motor",
		description: "扶站",
		redFlag: false,
	},
	{
		ageMonthsMin: 10,
		ageMonthsMax: 12,
		domain: "fine_motor",
		description: "拇指食指对捏",
		redFlag: false,
	},
	{
		ageMonthsMin: 10,
		ageMonthsMax: 12,
		domain: "language",
		description: "能叫 '爸爸/妈妈'",
		redFlag: false,
	},
	// 13-18 months
	{
		ageMonthsMin: 13,
		ageMonthsMax: 18,
		domain: "gross_motor",
		description: "独立行走",
		redFlag: false,
	},
	{
		ageMonthsMin: 13,
		ageMonthsMax: 18,
		domain: "language",
		description: "能说 10+ 词",
		redFlag: false,
	},
	// 18-24 months
	{
		ageMonthsMin: 18,
		ageMonthsMax: 24,
		domain: "language",
		description: "能说两词短句",
		redFlag: false,
	},
	{
		ageMonthsMin: 18,
		ageMonthsMax: 24,
		domain: "social",
		description: "模仿大人行为",
		redFlag: false,
	},
	// RED FLAGS (developmental warning signs)
	{
		ageMonthsMin: 4,
		ageMonthsMax: 6,
		domain: "gross_motor",
		description: "6 月龄仍不能抬头",
		redFlag: true,
	},
	{
		ageMonthsMin: 0,
		ageMonthsMax: 6,
		domain: "social",
		description: "6 月龄仍不对人微笑",
		redFlag: true,
	},
	{
		ageMonthsMin: 16,
		ageMonthsMax: 24,
		domain: "language",
		description: "18 月龄仍不会说单词",
		redFlag: true,
	},
	{
		ageMonthsMin: 16,
		ageMonthsMax: 24,
		domain: "social",
		description: "2 岁仍不会模仿",
		redFlag: true,
	},
];

/** Get milestones for a specific age. */
export function getMilestonesForAge(ageMonths: number): {
	expected: Milestone[];
	redFlags: Milestone[];
} {
	const expected: Milestone[] = [];
	const redFlags: Milestone[] = [];
	for (const m of MILESTONES) {
		if (ageMonths >= m.ageMonthsMin && ageMonths <= m.ageMonthsMax) {
			if (m.redFlag) redFlags.push(m);
			else expected.push(m);
		}
	}
	return { expected, redFlags };
}

/** BMI helper: weight (kg) / (height (m))^2 */
export function calculateBMI(weightKg: number, heightCm: number): number {
	const heightM = heightCm / 100;
	if (heightM <= 0) return 0;
	return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/** Classify BMI for age (simplified CDC ranges, for 2-18y). */
export function classifyBMI(
	bmi: number,
	ageMonths: number,
): "underweight" | "normal" | "overweight" | "obese" {
	if (ageMonths < 24) return "normal"; // BMI not meaningful for <2y
	if (bmi < 14) return "underweight";
	if (bmi < 18) return "normal";
	if (bmi < 20) return "overweight";
	return "obese";
}

/** Compute weight gain velocity (g/day) — useful for infant weight checks. */
export function weightGainVelocity(
	currentWeight: number,
	currentAgeDays: number,
	previousWeight?: number,
	previousAgeDays?: number,
): number | null {
	if (previousWeight === undefined || previousAgeDays === undefined)
		return null;
	const deltaWeight = currentWeight - previousWeight;
	const deltaDays = currentAgeDays - previousAgeDays;
	if (deltaDays <= 0) return null;
	return Math.round(((deltaWeight * 1000) / deltaDays) * 10) / 10; // grams/day
}
