/**
 * Media reference knowledge base — videos, audio guides, and external
 * resources linked to parenting knowledge entries.
 *
 * Direction G: Voice/Video Reference.
 */

export type MediaKind = "video" | "audio" | "image" | "article";

export interface MediaReference {
	id: string;
	kind: MediaKind;
	title: string;
	titleEn: string;
	url: string;
	embed?: string; // iframe-ready URL (e.g. youtube embed)
	durationSeconds?: number;
	language: "zh" | "en" | "zh-en";
	tags: string[];
	ageMonthsMin?: number;
	ageMonthsMax?: number;
}

export const MEDIA_REFERENCES: MediaReference[] = [
	{
		id: "video-breastfeed-1",
		kind: "video",
		title: "母乳喂养正确姿势",
		titleEn: "Breastfeeding positions tutorial",
		url: "https://www.example.com/videos/breastfeed-1",
		embed: "https://www.example.com/embed/breastfeed-1",
		durationSeconds: 180,
		language: "zh",
		tags: ["newborn", "infant", "feeding"],
		ageMonthsMin: 0,
		ageMonthsMax: 6,
	},
	{
		id: "video-soothing-1",
		kind: "video",
		title: "5S 安抚法示范",
		titleEn: "5S soothing method demo",
		url: "https://www.example.com/videos/5s-demo",
		embed: "https://www.example.com/embed/5s-demo",
		durationSeconds: 240,
		language: "zh",
		tags: ["infant", "soothing", "cry"],
		ageMonthsMin: 0,
		ageMonthsMax: 4,
	},
	{
		id: "video-solids-1",
		kind: "video",
		title: "辅食添加全流程",
		titleEn: "Starting solids step-by-step",
		url: "https://www.example.com/videos/solids",
		durationSeconds: 360,
		language: "zh",
		tags: ["infant", "nutrition", "solids"],
		ageMonthsMin: 4,
		ageMonthsMax: 12,
	},
	{
		id: "video-sleep-1",
		kind: "video",
		title: "婴儿睡眠训练",
		titleEn: "Baby sleep training",
		url: "https://www.example.com/videos/sleep-training",
		embed: "https://www.example.com/embed/sleep-training",
		durationSeconds: 420,
		language: "zh",
		tags: ["infant", "toddler", "sleep"],
		ageMonthsMin: 4,
		ageMonthsMax: 24,
	},
	{
		id: "audio-lullaby-1",
		kind: "audio",
		title: "白噪音合集",
		titleEn: "White noise collection",
		url: "https://www.example.com/audio/whitenoise",
		durationSeconds: 1800,
		language: "zh-en",
		tags: ["infant", "sleep", "soothing"],
		ageMonthsMin: 0,
		ageMonthsMax: 12,
	},
	{
		id: "article-vaccine-1",
		kind: "article",
		title: "国家免疫规划疫苗时间表",
		titleEn: "National Immunization Schedule",
		url: "https://www.example.com/articles/vaccine-schedule",
		language: "zh",
		tags: ["infant", "toddler", "health", "vaccine"],
		ageMonthsMin: 0,
		ageMonthsMax: 72,
	},
	{
		id: "video-tantrum-1",
		kind: "video",
		title: "幼儿发脾气应对",
		titleEn: "Toddler tantrum handling",
		url: "https://www.example.com/videos/tantrum",
		durationSeconds: 300,
		language: "zh",
		tags: ["toddler", "preschool", "behavior"],
		ageMonthsMin: 18,
		ageMonthsMax: 60,
	},
	{
		id: "video-screens-1",
		kind: "video",
		title: "屏幕时间管理",
		titleEn: "Screen time management",
		url: "https://www.example.com/videos/screens",
		durationSeconds: 240,
		language: "zh",
		tags: ["toddler", "preschool", "habits", "screen"],
		ageMonthsMin: 24,
		ageMonthsMax: 72,
	},
];

const MEDIA_BY_ID: ReadonlyMap<string, MediaReference> = new Map(
	MEDIA_REFERENCES.map((m) => [m.id, m]),
);

/**
 * Link knowledge entries to media by tag overlap. Each entry gets at most
 * one media suggestion per tag.
 */
const ENTRY_TAG_HINTS: Record<string, string[]> = {
	breastfeed: ["video-breastfeed-1"],
	母乳: ["video-breastfeed-1"],
	feeding: ["video-breastfeed-1", "video-solids-1"],
	辅食: ["video-solids-1"],
	mixin: ["video-solids-1"],
	cry: ["video-soothing-1", "audio-lullaby-1"],
	哭: ["video-soothing-1", "audio-lullaby-1"],
	闹: ["video-soothing-1"],
	soothing: ["video-soothing-1", "audio-lullaby-1"],
	安抚: ["video-soothing-1", "audio-lullaby-1"],
	sleep: ["video-sleep-1", "audio-lullaby-1"],
	睡眠: ["video-sleep-1", "audio-lullaby-1"],
	白噪音: ["audio-lullaby-1"],
	nutrition: ["video-solids-1"],
	solids: ["video-solids-1"],
	vaccine: ["article-vaccine-1"],
	疫苗: ["article-vaccine-1"],
	免疫: ["article-vaccine-1"],
	tantrum: ["video-tantrum-1"],
	发脾气: ["video-tantrum-1"],
	behavior: ["video-tantrum-1"],
	行为: ["video-tantrum-1"],
	screen: ["video-screens-1"],
	屏幕: ["video-screens-1"],
	habit: ["video-screens-1"],
	习惯: ["video-screens-1"],
};

/**
 * Look up media by id.
 */
export function getMediaById(id: string): MediaReference | null {
	return MEDIA_BY_ID.get(id) ?? null;
}

/**
 * Find media references for a knowledge entry by inspecting its question
 * and answer text for known tag hints. Returns at most `maxResults` items.
 */
export function getMediaForEntry(
	entryText: string,
	maxResults = 3,
): MediaReference[] {
	const lower = entryText.toLowerCase();
	const matchedIds = new Set<string>();
	for (const [hint, ids] of Object.entries(ENTRY_TAG_HINTS)) {
		if (lower.includes(hint)) {
			for (const id of ids) matchedIds.add(id);
		}
	}
	const out: MediaReference[] = [];
	for (const id of matchedIds) {
		const m = MEDIA_BY_ID.get(id);
		if (m) out.push(m);
		if (out.length >= maxResults) break;
	}
	return out;
}

/**
 * Filter media by age window.
 */
export function getMediaForAge(
	ageMonths: number,
	kind?: MediaKind,
): MediaReference[] {
	return MEDIA_REFERENCES.filter((m) => {
		if (kind && m.kind !== kind) return false;
		if (m.ageMonthsMin !== undefined && ageMonths < m.ageMonthsMin)
			return false;
		if (m.ageMonthsMax !== undefined && ageMonths > m.ageMonthsMax)
			return false;
		return true;
	});
}

/**
 * Format a list of media references as Chinese markdown.
 */
export function formatMediaList(media: readonly MediaReference[]): string {
	if (media.length === 0) return "（暂无相关媒体）";
	const lines: string[] = ["🎬 相关媒体："];
	for (const m of media) {
		const dur =
			m.durationSeconds !== undefined
				? ` (${Math.round(m.durationSeconds / 60)}min)`
				: "";
		lines.push(`- [${m.kind}] ${m.title}${dur}`);
		lines.push(`  ${m.url}`);
	}
	return lines.join("\n");
}

/**
 * Build an embeddable iframe URL for a media reference (when embed is set).
 */
export function embedUrlFor(media: MediaReference): string | null {
	return media.embed ?? null;
}
