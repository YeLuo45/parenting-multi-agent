/**
 * Pediatrician knowledge base (Phase 1 — basic, not medical advice).
 *
 * IMPORTANT: This is informational only. Always recommend consulting
 * a real pediatrician for medical decisions.
 */

import type { ChildStage } from "@parenting/memory";

/** Vaccine schedule by age (China NIP + CDC reference). */
export interface VaccineInfo {
	name: string;
	nameEn: string;
	recommendedAgeMonths: number; // earliest recommended age in months
	notes?: string;
}

export const VACCINE_SCHEDULE: VaccineInfo[] = [
	{ name: "卡介苗 (BCG)", nameEn: "BCG", recommendedAgeMonths: 0, notes: "出生时" },
	{ name: "乙肝疫苗 (第1剂)", nameEn: "HepB #1", recommendedAgeMonths: 0 },
	{ name: "乙肝疫苗 (第2剂)", nameEn: "HepB #2", recommendedAgeMonths: 1 },
	{ name: "脊灰疫苗 (第1剂)", nameEn: "IPV #1", recommendedAgeMonths: 2 },
	{ name: "百白破 (第1剂)", nameEn: "DTaP #1", recommendedAgeMonths: 3 },
	{ name: "脊灰疫苗 (第2剂)", nameEn: "IPV #2", recommendedAgeMonths: 3 },
	{ name: "百白破 (第2剂)", nameEn: "DTaP #2", recommendedAgeMonths: 4 },
	{ name: "脊灰疫苗 (第3剂)", nameEn: "IPV #3", recommendedAgeMonths: 4 },
	{ name: "百白破 (第3剂)", nameEn: "DTaP #3", recommendedAgeMonths: 5 },
	{ name: "乙肝疫苗 (第3剂)", nameEn: "HepB #3", recommendedAgeMonths: 6 },
	{ name: "麻腮风 (第1剂)", nameEn: "MMR #1", recommendedAgeMonths: 8 },
	{ name: "乙脑疫苗 (第1剂)", nameEn: "JE #1", recommendedAgeMonths: 8 },
	{ name: "甲肝疫苗", nameEn: "HepA", recommendedAgeMonths: 18 },
	{ name: "麻腮风 (第2剂)", nameEn: "MMR #2", recommendedAgeMonths: 18 },
	{ name: "百白破 (加强)", nameEn: "DTaP booster", recommendedAgeMonths: 18 },
	{ name: "水痘疫苗", nameEn: "Varicella", recommendedAgeMonths: 12 },
	{ name: "流感疫苗 (年度)", nameEn: "Flu (annual)", recommendedAgeMonths: 6, notes: "每年接种" },
	{ name: "HPV疫苗", nameEn: "HPV", recommendedAgeMonths: 108, notes: "9 岁起，3 剂" },
];

/** Get vaccines due by given age in months. */
export function getVaccinesForAge(ageMonths: number): VaccineInfo[] {
	return VACCINE_SCHEDULE.filter((v) => v.recommendedAgeMonths <= ageMonths);
}

/** Get next upcoming vaccine for the given age. */
export function getNextVaccine(ageMonths: number): VaccineInfo | null {
	const upcoming = VACCINE_SCHEDULE.filter((v) => v.recommendedAgeMonths > ageMonths);
	upcoming.sort((a, b) => a.recommendedAgeMonths - b.recommendedAgeMonths);
	return upcoming[0] ?? null;
}

/** Common illness triage rules. */
export interface TriageRule {
	symptom: RegExp;
	urgency: "info" | "low" | "medium" | "high" | "emergency";
	ageMonthsMin?: number;
	ageMonthsMax?: number;
	advice: string;
	redFlagDescription?: string;
}

export const TRIAGE_RULES: TriageRule[] = [
	{
		symptom: /(发烧|fever|体温)/i,
		urgency: "emergency",
		ageMonthsMax: 3,
		advice: "3 个月以下婴儿发烧需立即就医，不要自行用药",
		redFlagDescription: "Fever in infant under 3 months",
	},
	{
		symptom: /(发烧|fever|体温)/i,
		urgency: "high",
		ageMonthsMax: 6,
		advice: "6 个月以下婴儿发烧建议 24 小时内就医",
	},
	{
		symptom: /(发烧|fever|体温).*(40|41|42|抽搐|seizure|惊厥)/i,
		urgency: "emergency",
		advice: "高烧 40°C 以上或伴随抽搐需立即就医",
		redFlagDescription: "High fever 40+ or seizure",
	},
	{
		symptom: /(发烧|fever)/i,
		urgency: "medium",
		advice: "中度发烧（38-39°C）可先物理降温，监测体温，超过 24 小时不退或加重需就医",
	},
	{
		symptom: /(呼吸困难|嘴唇发紫|喘息|breath|喘不过)/i,
		urgency: "emergency",
		advice: "呼吸困难需立即就医，可能为哮喘/肺炎/异物",
		redFlagDescription: "Breathing difficulty",
	},
	{
		symptom: /(咳嗽|cough)/i,
		urgency: "low",
		advice: "普通咳嗽可观察，多喝水，注意是否有呼吸困难/持续高烧等加重信号",
	},
	{
		symptom: /(腹泻|diarrhea|拉肚子)/i,
		urgency: "medium",
		advice: "腹泻注意补水，观察是否有脱水迹象（尿少、哭无泪、眼窝凹陷），严重需就医",
	},
	{
		symptom: /(皮疹|rash|疹子)/i,
		urgency: "low",
		advice: "皮疹先观察分布、是否瘙痒、是否伴随发烧。幼儿急疹、湿疹、过敏处理不同",
	},
	{
		symptom: /(呕吐|vomit)/i,
		urgency: "medium",
		advice: "呕吐注意补水，少量多次。喷射性呕吐/持续呕吐/精神差需就医",
	},
	{
		symptom: /(便秘|constipation|不排便)/i,
		urgency: "low",
		advice: "婴儿便秘可调喂养（母乳妈妈注意饮食，配方奶考虑换品牌），严重需就医",
	},
];

/** Triage a question based on symptom + child age. */
export function triageSymptom(text: string, ageMonths: number): TriageRule | null {
	for (const rule of TRIAGE_RULES) {
		if (!rule.symptom.test(text)) continue;
		if (rule.ageMonthsMax !== undefined && ageMonths > rule.ageMonthsMax) continue;
		return rule;
	}
	return null;
}

/** Developmental milestones by stage. */
export interface Milestone {
	stage: ChildStage;
	domain: "motor" | "language" | "social" | "cognitive";
	description: string;
	typicalAgeMonths: number;
}

export const MILESTONES: Milestone[] = [
	// 0-3 months
	{ stage: "newborn", domain: "motor", description: "俯卧时能抬头", typicalAgeMonths: 1 },
	{ stage: "newborn", domain: "social", description: "对声音有反应，会追视", typicalAgeMonths: 1 },
	{ stage: "infant", domain: "motor", description: "抬头稳定", typicalAgeMonths: 3 },
	{ stage: "infant", domain: "social", description: "会微笑（社交性微笑）", typicalAgeMonths: 2 },
	{ stage: "infant", domain: "language", description: "会发出咿呀声", typicalAgeMonths: 4 },
	// 6-12 months
	{ stage: "infant", domain: "motor", description: "会坐稳", typicalAgeMonths: 6 },
	{ stage: "infant", domain: "motor", description: "开始爬行", typicalAgeMonths: 8 },
	{ stage: "infant", domain: "language", description: "会叫 mama/dada（无意识）", typicalAgeMonths: 9 },
	{ stage: "infant", domain: "social", description: "陌生人焦虑", typicalAgeMonths: 9 },
	{ stage: "infant", domain: "motor", description: "扶站", typicalAgeMonths: 10 },
	// 1-2 years
	{ stage: "toddler", domain: "motor", description: "独立行走", typicalAgeMonths: 12 },
	{ stage: "toddler", domain: "language", description: "会叫爸爸妈妈（有意识）", typicalAgeMonths: 12 },
	{ stage: "toddler", domain: "language", description: "能说 10-50 个词", typicalAgeMonths: 18 },
	{ stage: "toddler", domain: "social", description: "会指东西", typicalAgeMonths: 15 },
	{ stage: "toddler", domain: "motor", description: "会跑", typicalAgeMonths: 24 },
	// 2-3 years
	{ stage: "toddler", domain: "language", description: "能说短句", typicalAgeMonths: 30 },
	{ stage: "toddler", domain: "social", description: "会自己穿简单衣服", typicalAgeMonths: 30 },
	// 3-6 years
	{ stage: "preschool", domain: "language", description: "能讲完整故事", typicalAgeMonths: 48 },
	{ stage: "preschool", domain: "social", description: "能与其他小朋友合作", typicalAgeMonths: 48 },
	{ stage: "preschool", domain: "motor", description: "会跳/单脚站", typicalAgeMonths: 60 },
	// 6-12 years (school_age)
	{ stage: "school_age", domain: "cognitive", description: "能独立阅读", typicalAgeMonths: 84 },
	{ stage: "school_age", domain: "social", description: "形成稳定友谊", typicalAgeMonths: 96 },
	// 12+ years
	{ stage: "teen", domain: "cognitive", description: "抽象思维发展", typicalAgeMonths: 156 },
	{ stage: "teen", domain: "social", description: "同伴关系重要性增加", typicalAgeMonths: 168 },
];

/** Get milestones expected for given age (in months). */
export function getMilestonesForAge(ageMonths: number): Milestone[] {
	// ±3 months window
	return MILESTONES.filter((m) => Math.abs(m.typicalAgeMonths - ageMonths) <= 3);
}

/** Medication dosing (basic, weight-based). */
export interface DoseInfo {
	drug: "acetaminophen" | "ibuprofen";
	minAgeMonths: number;
	dosePerKgMg: number; // mg per kg
	maxDailyDoses: number;
	intervalHours: number;
}

export const PEDIATRIC_DOSES: DoseInfo[] = [
	{ drug: "acetaminophen", minAgeMonths: 2, dosePerKgMg: 10, maxDailyDoses: 4, intervalHours: 6 },
	{ drug: "ibuprofen", minAgeMonths: 6, dosePerKgMg: 5, maxDailyDoses: 4, intervalHours: 6 },
];

/** Calculate dose for a child weight. */
export function calculateDose(drug: DoseInfo["drug"], weightKg: number, ageMonths: number): {
	ok: boolean;
	reason?: string;
	singleDoseMg: number;
} {
	const info = PEDIATRIC_DOSES.find((d) => d.drug === drug);
	if (!info) return { ok: false, reason: "unknown drug", singleDoseMg: 0 };
	if (ageMonths < info.minAgeMonths) {
		return { ok: false, reason: `age too young (need ${info.minAgeMonths}+ months)`, singleDoseMg: 0 };
	}
	return { ok: true, singleDoseMg: info.dosePerKgMg * weightKg };
}
