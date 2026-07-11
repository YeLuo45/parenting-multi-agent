/**
 * Vaccine schedule + reminder logic (Direction S).
 *
 * China National Immunization Program (NIP) + common optional vaccines.
 * All pure functions; no LLM call.
 */

export type VaccineId =
	| "hep_b_birth"
	| "bcg"
	| "ipv_1"
	| "ipv_2"
	| "ipv_3"
	| "dtap_1"
	| "dtap_2"
	| "dtap_3"
	| "dtap_4"
	| "mmr_1"
	| "mmr_2"
	| "je_1"
	| "je_2"
	| "hepa_1"
	| "hepa_2"
	| "flu_annual"
	| "hpv_1"
	| "hpv_2"
	| "hpv_3"
	| "covid_1"
	| "covid_2"
	| "covid_booster";

export type VaccineCategory = "national" | "optional";

export interface Vaccine {
	id: VaccineId;
	name: string;
	nameEn: string;
	category: VaccineCategory;
	doseLabel: string;
	doseLabelEn: string;
	recommendedAgeMonths: number;
	windowMonthsBefore?: number;
	windowMonthsAfter?: number;
	description: string;
}

export interface VaccineScheduleEntry {
	vaccine: Vaccine;
	recommendedDate: number; // epoch ms
	dueStatus: "upcoming" | "due" | "overdue" | "completed" | "future";
	daysUntilDue: number; // negative if overdue
}

export interface VaccineRecord {
	id: string;
	vaccineId: VaccineId;
	administeredAt: number; // epoch ms
	batchNumber?: string;
	provider?: string;
}

/** NIP + optional schedule. */
export const VACCINES: Vaccine[] = [
	{
		id: "hep_b_birth",
		name: "乙肝疫苗（第1剂）",
		nameEn: "Hepatitis B (Dose 1)",
		category: "national",
		doseLabel: "出生24小时内",
		doseLabelEn: "Within 24h of birth",
		recommendedAgeMonths: 0,
		windowMonthsBefore: 0,
		windowMonthsAfter: 1,
		description: "出生后24小时内接种，第1剂乙肝疫苗",
	},
	{
		id: "bcg",
		name: "卡介苗",
		nameEn: "BCG (Tuberculosis)",
		category: "national",
		doseLabel: "出生时",
		doseLabelEn: "At birth",
		recommendedAgeMonths: 0,
		windowMonthsAfter: 3,
		description: "预防结核病",
	},
	{
		id: "ipv_1",
		name: "脊灰疫苗（第1剂）",
		nameEn: "Polio IPV (Dose 1)",
		category: "national",
		doseLabel: "2月龄",
		doseLabelEn: "2 months",
		recommendedAgeMonths: 2,
		windowMonthsBefore: 1,
		windowMonthsAfter: 2,
		description: "脊髓灰质炎灭活疫苗",
	},
	{
		id: "ipv_2",
		name: "脊灰疫苗（第2剂）",
		nameEn: "Polio IPV (Dose 2)",
		category: "national",
		doseLabel: "3月龄",
		doseLabelEn: "3 months",
		recommendedAgeMonths: 3,
		windowMonthsBefore: 1,
		windowMonthsAfter: 2,
		description: "脊髓灰质炎灭活疫苗",
	},
	{
		id: "ipv_3",
		name: "脊灰疫苗（第3剂）",
		nameEn: "Polio IPV (Dose 3)",
		category: "national",
		doseLabel: "4月龄",
		doseLabelEn: "4 months",
		recommendedAgeMonths: 4,
		windowMonthsBefore: 1,
		windowMonthsAfter: 2,
		description: "脊髓灰质炎灭活疫苗",
	},
	{
		id: "dtap_1",
		name: "百白破疫苗（第1剂）",
		nameEn: "DTaP (Dose 1)",
		category: "national",
		doseLabel: "3月龄",
		doseLabelEn: "3 months",
		recommendedAgeMonths: 3,
		windowMonthsBefore: 1,
		windowMonthsAfter: 2,
		description: "百日咳、白喉、破伤风",
	},
	{
		id: "dtap_2",
		name: "百白破疫苗（第2剂）",
		nameEn: "DTaP (Dose 2)",
		category: "national",
		doseLabel: "4月龄",
		doseLabelEn: "4 months",
		recommendedAgeMonths: 4,
		windowMonthsBefore: 1,
		windowMonthsAfter: 2,
		description: "百日咳、白喉、破伤风",
	},
	{
		id: "dtap_3",
		name: "百白破疫苗（第3剂）",
		nameEn: "DTaP (Dose 3)",
		category: "national",
		doseLabel: "5月龄",
		doseLabelEn: "5 months",
		recommendedAgeMonths: 5,
		windowMonthsBefore: 1,
		windowMonthsAfter: 2,
		description: "百日咳、白喉、破伤风",
	},
	{
		id: "dtap_4",
		name: "百白破疫苗（加强）",
		nameEn: "DTaP (Booster)",
		category: "national",
		doseLabel: "18月龄",
		doseLabelEn: "18 months",
		recommendedAgeMonths: 18,
		windowMonthsBefore: 2,
		windowMonthsAfter: 6,
		description: "加强免疫",
	},
	{
		id: "mmr_1",
		name: "麻腮风疫苗（第1剂）",
		nameEn: "MMR (Dose 1)",
		category: "national",
		doseLabel: "8月龄",
		doseLabelEn: "8 months",
		recommendedAgeMonths: 8,
		windowMonthsBefore: 1,
		windowMonthsAfter: 3,
		description: "麻疹、腮腺炎、风疹",
	},
	{
		id: "mmr_2",
		name: "麻腮风疫苗（第2剂）",
		nameEn: "MMR (Dose 2)",
		category: "national",
		doseLabel: "18月龄",
		doseLabelEn: "18 months",
		recommendedAgeMonths: 18,
		windowMonthsBefore: 2,
		windowMonthsAfter: 6,
		description: "加强免疫",
	},
	{
		id: "je_1",
		name: "乙脑疫苗（第1剂）",
		nameEn: "JE (Dose 1)",
		category: "national",
		doseLabel: "8月龄",
		doseLabelEn: "8 months",
		recommendedAgeMonths: 8,
		windowMonthsBefore: 1,
		windowMonthsAfter: 3,
		description: "乙型脑炎",
	},
	{
		id: "je_2",
		name: "乙脑疫苗（第2剂）",
		nameEn: "JE (Dose 2)",
		category: "national",
		doseLabel: "2岁",
		doseLabelEn: "2 years",
		recommendedAgeMonths: 24,
		windowMonthsBefore: 3,
		windowMonthsAfter: 6,
		description: "加强免疫",
	},
	{
		id: "hepa_1",
		name: "甲肝疫苗（第1剂）",
		nameEn: "HepA (Dose 1)",
		category: "national",
		doseLabel: "18月龄",
		doseLabelEn: "18 months",
		recommendedAgeMonths: 18,
		windowMonthsBefore: 2,
		windowMonthsAfter: 6,
		description: "甲型肝炎",
	},
	{
		id: "hepa_2",
		name: "甲肝疫苗（第2剂）",
		nameEn: "HepA (Dose 2)",
		category: "national",
		doseLabel: "2岁",
		doseLabelEn: "2 years",
		recommendedAgeMonths: 24,
		windowMonthsBefore: 3,
		windowMonthsAfter: 6,
		description: "加强免疫",
	},
	{
		id: "flu_annual",
		name: "流感疫苗（年度）",
		nameEn: "Influenza (Annual)",
		category: "optional",
		doseLabel: "6月龄起每年",
		doseLabelEn: "Annual from 6mo",
		recommendedAgeMonths: 6,
		description: "推荐每年秋季接种",
	},
	{
		id: "hpv_1",
		name: "HPV疫苗（第1剂）",
		nameEn: "HPV (Dose 1)",
		category: "optional",
		doseLabel: "9-14岁",
		doseLabelEn: "9-14 years",
		recommendedAgeMonths: 108,
		description: "预防宫颈癌及其他HPV相关癌症",
	},
	{
		id: "hpv_2",
		name: "HPV疫苗（第2剂）",
		nameEn: "HPV (Dose 2)",
		category: "optional",
		doseLabel: "首剂后6月",
		doseLabelEn: "6mo after dose 1",
		recommendedAgeMonths: 114,
		description: "第2剂",
	},
	{
		id: "hpv_3",
		name: "HPV疫苗（第3剂）",
		nameEn: "HPV (Dose 3)",
		category: "optional",
		doseLabel: "首剂后6月",
		doseLabelEn: "6mo after dose 2",
		recommendedAgeMonths: 120,
		description: "≥15岁需要3剂",
	},
	{
		id: "covid_1",
		name: "新冠疫苗（第1剂）",
		nameEn: "COVID-19 (Dose 1)",
		category: "optional",
		doseLabel: "3岁以上",
		doseLabelEn: "≥3 years",
		recommendedAgeMonths: 36,
		description: "按国家指引",
	},
	{
		id: "covid_2",
		name: "新冠疫苗（第2剂）",
		nameEn: "COVID-19 (Dose 2)",
		category: "optional",
		doseLabel: "首剂后8周",
		doseLabelEn: "8 weeks after dose 1",
		recommendedAgeMonths: 38,
		description: "基础免疫",
	},
	{
		id: "covid_booster",
		name: "新冠疫苗（加强）",
		nameEn: "COVID-19 (Booster)",
		category: "optional",
		doseLabel: "基础免疫后6月",
		doseLabelEn: "6mo after primary",
		recommendedAgeMonths: 44,
		description: "加强免疫",
	},
];

const VACCINES_BY_ID: ReadonlyMap<VaccineId, Vaccine> = new Map(
	VACCINES.map((v) => [v.id, v]),
);

const DAY = 24 * 60 * 60 * 1000;

/** Compute the recommended date (epoch ms) for a vaccine given birth date. */
export function recommendedDateForVaccine(
	vaccineId: VaccineId,
	birthDate: string,
): number {
	const v = VACCINES_BY_ID.get(vaccineId);
	if (!v) return 0;
	const birth = new Date(birthDate).getTime();
	return birth + vaccineId === "hep_b_birth" || vaccineId === "bcg"
		? birth
		: birth + v.recommendedAgeMonths * 30.44 * DAY;
}

/** Build a complete vaccine schedule for a child, marking completed doses. */
export function buildVaccineSchedule(
	birthDate: string,
	records: readonly VaccineRecord[],
	asOf: number = Date.now(),
): VaccineScheduleEntry[] {
	const completed = new Set(records.map((r) => r.vaccineId));
	const entries: VaccineScheduleEntry[] = [];
	for (const v of VACCINES) {
		const recommended = recommendedDateForVaccine(v.id, birthDate);
		const daysUntil = Math.round((recommended - asOf) / DAY);
		let status: VaccineScheduleEntry["dueStatus"];
		if (completed.has(v.id)) {
			status = "completed";
		} else if (daysUntil > 30) {
			status = "future";
		} else if (daysUntil > 0) {
			status = "upcoming";
		} else if (daysUntil >= -30) {
			status = "due";
		} else {
			status = "overdue";
		}
		entries.push({
			vaccine: v,
			recommendedDate: recommended,
			dueStatus: status,
			daysUntilDue: daysUntil,
		});
	}
	return entries;
}

/** Get all due + overdue + upcoming (within 30 days) vaccines. */
export function getDueVaccines(
	schedule: readonly VaccineScheduleEntry[],
): VaccineScheduleEntry[] {
	return schedule.filter(
		(e) =>
			e.dueStatus === "due" ||
			e.dueStatus === "overdue" ||
			e.dueStatus === "upcoming",
	);
}

/** Format a vaccine reminder as Chinese text. */
export function formatVaccineReminder(entry: VaccineScheduleEntry): string {
	const v = entry.vaccine;
	const date = new Date(entry.recommendedDate).toISOString().split("T")[0];
	const sign = entry.daysUntilDue >= 0 ? "还有" : "已过期";
	const absDays = Math.abs(entry.daysUntilDue);
	const statusZh = {
		overdue: `⚠️ 已过期 ${absDays} 天`,
		due: "🔔 现在可接种",
		upcoming: `⏰ ${sign} ${absDays} 天`,
		future: `📅 计划 ${absDays} 天后`,
		completed: "✅ 已完成",
	}[entry.dueStatus];
	return `${statusZh} — ${v.name}（${v.doseLabel}，建议 ${date}）`;
}

/** Format a complete schedule as Chinese markdown. */
export function formatVaccineSchedule(
	schedule: readonly VaccineScheduleEntry[],
	limit = 20,
): string {
	const lines: string[] = ["💉 疫苗接种计划："];
	for (const e of schedule.slice(0, limit)) {
		lines.push(`- ${formatVaccineReminder(e)}`);
	}
	if (schedule.length > limit) {
		lines.push(`...还有 ${schedule.length - limit} 项`);
	}
	return lines.join("\n");
}

/** Check if a specific vaccine is due (returns boolean). */
export function isVaccineDue(
	vaccineId: VaccineId,
	birthDate: string,
	asOf: number = Date.now(),
): boolean {
	const v = VACCINES_BY_ID.get(vaccineId);
	if (!v) return false;
	const recommended = recommendedDateForVaccine(vaccineId, birthDate);
	const days = Math.round((recommended - asOf) / DAY);
	return days <= 30 && days >= -30;
}

export const VACCINE_DISCLAIMER =
	"⚠️ 疫苗接种计划仅供参考。具体接种时间请咨询当地疾控中心或社区卫生服务中心。";
