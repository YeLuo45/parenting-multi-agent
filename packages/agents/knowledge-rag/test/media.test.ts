import { describe, expect, it } from "vitest";
import {
	embedUrlFor,
	formatMediaList,
	getMediaById,
	getMediaForAge,
	getMediaForEntry,
	MEDIA_REFERENCES,
} from "../src/index.js";

describe("MEDIA_REFERENCES data integrity", () => {
	it("has at least 6 entries", () => {
		expect(MEDIA_REFERENCES.length).toBeGreaterThanOrEqual(6);
	});

	it("every entry has unique id", () => {
		const ids = MEDIA_REFERENCES.map((m) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("every entry has required fields", () => {
		for (const m of MEDIA_REFERENCES) {
			expect(m.id).toBeTruthy();
			expect(m.title).toBeTruthy();
			expect(m.titleEn).toBeTruthy();
			expect(m.url).toBeTruthy();
			expect(["video", "audio", "image", "article"]).toContain(m.kind);
			expect(["zh", "en", "zh-en"]).toContain(m.language);
			expect(m.tags.length).toBeGreaterThan(0);
		}
	});

	it("every entry has valid age range (min <= max)", () => {
		for (const m of MEDIA_REFERENCES) {
			if (m.ageMonthsMin !== undefined && m.ageMonthsMax !== undefined) {
				expect(m.ageMonthsMin).toBeLessThanOrEqual(m.ageMonthsMax);
			}
		}
	});
});

describe("getMediaById", () => {
	it("returns media for valid id", () => {
		const m = getMediaById("video-soothing-1");
		expect(m?.id).toBe("video-soothing-1");
		expect(m?.kind).toBe("video");
	});

	it("returns null for unknown id", () => {
		expect(getMediaById("does-not-exist")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(getMediaById("")).toBeNull();
	});
});

describe("getMediaForEntry", () => {
	it("matches cry-related text", () => {
		const out = getMediaForEntry("宝宝哭闹不止,如何安抚?");
		expect(out.length).toBeGreaterThan(0);
		const ids = out.map((m) => m.id);
		expect(ids).toContain("video-soothing-1");
	});

	it("matches sleep-related text", () => {
		const out = getMediaForEntry("婴儿睡眠不好怎么办");
		expect(out.length).toBeGreaterThan(0);
		const ids = out.map((m) => m.id);
		expect(ids).toContain("video-sleep-1");
	});

	it("matches tantrum-related text", () => {
		const out = getMediaForEntry("孩子发脾气怎么办");
		expect(out.length).toBeGreaterThan(0);
		const ids = out.map((m) => m.id);
		expect(ids).toContain("video-tantrum-1");
	});

	it("matches vaccine-related text", () => {
		const out = getMediaForEntry("vaccine 疫苗时间表");
		expect(out.length).toBeGreaterThan(0);
	});

	it("matches habit-related text", () => {
		const out = getMediaForEntry("habit 习惯养成");
		expect(out.length).toBeGreaterThan(0);
	});

	it("matches screen-related text", () => {
		const out = getMediaForEntry("screen 屏幕时间管理");
		expect(out.length).toBeGreaterThan(0);
	});

	it("matches feeding text", () => {
		const out = getMediaForEntry("breastfeed 母乳姿势");
		expect(out.length).toBeGreaterThan(0);
	});

	it("returns empty for unrelated text", () => {
		const out = getMediaForEntry("完全不相关的查询 xyz");
		expect(out).toEqual([]);
	});

	it("respects maxResults parameter", () => {
		const out = getMediaForEntry(
			"cry soothing sleep habit tantrum screen",
			2,
		);
		expect(out.length).toBeLessThanOrEqual(2);
	});

	it("dedupes by id across multiple tag matches", () => {
		const out = getMediaForEntry("cry soothing 5S");
		const ids = out.map((m) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("is case-insensitive", () => {
		const a = getMediaForEntry("CRY");
		const b = getMediaForEntry("cry");
		expect(a.length).toBe(b.length);
	});
});

describe("getMediaForAge", () => {
	it("newborn (1mo) → soothing videos", () => {
		const out = getMediaForAge(1);
		const ids = out.map((m) => m.id);
		expect(ids).toContain("video-soothing-1");
	});

	it("6-month-old → solids video", () => {
		const out = getMediaForAge(6);
		expect(out.some((m) => m.id === "video-solids-1")).toBe(true);
	});

	it("3-year-old (36mo) → tantrum video", () => {
		const out = getMediaForAge(36);
		expect(out.some((m) => m.id === "video-tantrum-1")).toBe(true);
	});

	it("filters by kind=video", () => {
		const out = getMediaForAge(6, "video");
		for (const m of out) expect(m.kind).toBe("video");
	});

	it("filters by kind=audio", () => {
		const out = getMediaForAge(3, "audio");
		for (const m of out) expect(m.kind).toBe("audio");
	});

	it("empty result for out-of-range age with kind filter", () => {
		const out = getMediaForAge(120, "audio");
		expect(out).toEqual([]);
	});

	it("returns media with no age constraint at any age", () => {
		const out = getMediaForAge(36);
		// vaccine article has ageMonthsMax=72, included for 36mo
		expect(out.some((m) => m.id === "article-vaccine-1")).toBe(true);
	});
});

describe("formatMediaList", () => {
	it("empty list → placeholder text", () => {
		expect(formatMediaList([])).toContain("暂无");
	});

	it("renders each entry with kind + title + url", () => {
		const out = formatMediaList([MEDIA_REFERENCES[0]!]);
		expect(out).toContain("video");
		expect(out).toContain(MEDIA_REFERENCES[0]!.url);
	});

	it("includes duration when present", () => {
		const withDuration = MEDIA_REFERENCES.find((m) => m.durationSeconds);
		expect(withDuration).toBeDefined();
		const out = formatMediaList([withDuration!]);
		expect(out).toMatch(/\d+min/);
	});

	it("renders multiple entries", () => {
		const out = formatMediaList([
			MEDIA_REFERENCES[0]!,
			MEDIA_REFERENCES[1]!,
		]);
		const bulletCount = (out.match(/^-/gm) || []).length;
		expect(bulletCount).toBe(2);
	});

	it("omits duration for media without it", () => {
		const noDuration = MEDIA_REFERENCES.find((m) => !m.durationSeconds);
		// Skip if all have duration; if all have duration, that's fine
		if (noDuration) {
			const out = formatMediaList([noDuration]);
			expect(out).not.toContain("min)");
		}
	});
});

describe("embedUrlFor", () => {
	it("returns embed URL when set", () => {
		const m = MEDIA_REFERENCES.find((x) => x.embed);
		if (m) {
			expect(embedUrlFor(m)).toBe(m.embed);
		}
	});

	it("returns null when embed is missing", () => {
		const m = MEDIA_REFERENCES.find((x) => !x.embed);
		if (m) {
			expect(embedUrlFor(m)).toBeNull();
		} else {
			// all media have embed — synthetic test with cast
			const fake = {
				...MEDIA_REFERENCES[0]!,
				id: "no-embed",
				embed: undefined,
			};
			expect(embedUrlFor(fake)).toBeNull();
		}
	});
});
