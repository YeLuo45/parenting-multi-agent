import { describe, expect, it } from "vitest";
import {
	DEFAULT_LOCALE,
	detectLocaleFromQuery,
	formatDate,
	formatNumber,
	getLocalizedString,
	getMissingTranslations,
	getTranslationCoverage,
	I18N_DISCLAIMER,
	isSupportedLocale,
	SUPPORTED_LOCALES,
	TRANSLATIONS,
} from "../src/i18n-data.js";

describe("SUPPORTED_LOCALES", () => {
	it("contains exactly 3 locales", () => {
		expect(SUPPORTED_LOCALES).toHaveLength(3);
		expect(SUPPORTED_LOCALES).toContain("zh-CN");
		expect(SUPPORTED_LOCALES).toContain("en-US");
		expect(SUPPORTED_LOCALES).toContain("es-ES");
	});
});

describe("DEFAULT_LOCALE", () => {
	it("is zh-CN", () => {
		expect(DEFAULT_LOCALE).toBe("zh-CN");
	});
});

describe("getLocalizedString", () => {
	it("returns Chinese for zh-CN", () => {
		expect(getLocalizedString("app.title", "zh-CN")).toBe("家长多智能体");
	});

	it("returns English for en-US", () => {
		expect(getLocalizedString("app.title", "en-US")).toBe(
			"Parenting Multi-Agent",
		);
	});

	it("returns Spanish for es-ES", () => {
		expect(getLocalizedString("app.title", "es-ES")).toBe(
			"Agente Parental",
		);
	});

	it("falls back to default locale for unknown key (cast)", () => {
		expect(getLocalizedString("unknown.key" as never, "en-US")).toBe(
			"unknown.key",
		);
	});

	it("all 11 agent names translate", () => {
		const agentKeys = [
			"agent.educator",
			"agent.psychologist",
			"agent.pediatrician",
			"agent.cry_decoder",
			"agent.habit_builder",
			"agent.growth_tracker",
			"agent.homework_helper",
			"agent.knowledge_rag",
			"agent.screen",
			"agent.peer_benchmark",
			"agent.safety_guard",
		] as const;
		for (const locale of SUPPORTED_LOCALES) {
			for (const k of agentKeys) {
				expect(getLocalizedString(k, locale).length).toBeGreaterThan(0);
			}
		}
	});
});

describe("isSupportedLocale", () => {
	it("accepts valid locales", () => {
		expect(isSupportedLocale("zh-CN")).toBe(true);
		expect(isSupportedLocale("en-US")).toBe(true);
		expect(isSupportedLocale("es-ES")).toBe(true);
	});

	it("rejects invalid locales", () => {
		expect(isSupportedLocale("fr-FR")).toBe(false);
		expect(isSupportedLocale("")).toBe(false);
		expect(isSupportedLocale("ZH-CN")).toBe(false);
	});
});

describe("detectLocaleFromQuery", () => {
	it("detects zh-CN", () => {
		expect(detectLocaleFromQuery("你好，宝宝今天没怎么吃奶")).toBe("zh-CN");
	});

	it("detects en-US", () => {
		expect(detectLocaleFromQuery("Hello, my child has a fever")).toBe(
			"en-US",
		);
	});

	it("detects es-ES", () => {
		expect(detectLocaleFromQuery("Hola, mi bebé tiene fiebre")).toBe(
			"es-ES",
		);
	});

	it("returns null for ambiguous text", () => {
		expect(detectLocaleFromQuery("12345")).toBeNull();
	});
});

describe("formatNumber", () => {
	it("formats Chinese locale", () => {
		const out = formatNumber(1234.5, "zh-CN");
		expect(out).toContain("1,234");
	});

	it("formats English locale", () => {
		const out = formatNumber(1234.5, "en-US");
		expect(out).toContain("1,234");
	});

	it("formats Spanish locale", () => {
		const out = formatNumber(1234.5, "es-ES");
		// Spanish uses comma as decimal separator
		expect(out).toContain(",");
		expect(out).not.toContain(".");
	});

	it("respects options", () => {
		const out = formatNumber(0.5, "en-US", { style: "percent" });
		expect(out).toContain("%");
	});

	it("handles negative numbers", () => {
		const out = formatNumber(-42, "en-US");
		expect(out).toContain("-");
	});

	it("handles zero", () => {
		expect(formatNumber(0, "en-US")).toBe("0");
	});
});

describe("formatDate", () => {
	it("formats date in English", () => {
		const d = new Date("2026-06-19T00:00:00Z");
		const out = formatDate(d, "en-US", { year: "numeric", month: "long" });
		expect(out.length).toBeGreaterThan(0);
	});

	it("formats date in Chinese", () => {
		const d = new Date("2026-06-19T00:00:00Z");
		const out = formatDate(d, "zh-CN", { year: "numeric" });
		expect(out.length).toBeGreaterThan(0);
	});

	it("formats timestamp number", () => {
		const out = formatDate(Date.now(), "en-US", { year: "numeric" });
		expect(out.length).toBeGreaterThan(0);
	});

	it("formats date in Spanish", () => {
		const d = new Date("2026-06-19T00:00:00Z");
		const out = formatDate(d, "es-ES", { year: "numeric" });
		expect(out.length).toBeGreaterThan(0);
	});
});

describe("getTranslationCoverage", () => {
	it("returns 1.0 for default locale", () => {
		expect(getTranslationCoverage("zh-CN")).toBe(1);
	});

	it("returns 1.0 for fully translated locale", () => {
		// Both en-US and es-ES are fully translated in our data
		expect(getTranslationCoverage("en-US")).toBe(1);
		expect(getTranslationCoverage("es-ES")).toBe(1);
	});

	it("returns 0 for unknown locale", () => {
		expect(getTranslationCoverage("ja-JP" as never)).toBe(0);
	});
});

describe("getMissingTranslations", () => {
	it("returns empty for default locale", () => {
		expect(getMissingTranslations("zh-CN")).toEqual([]);
	});

	it("returns empty for fully translated locale", () => {
		expect(getMissingTranslations("en-US")).toEqual([]);
		expect(getMissingTranslations("es-ES")).toEqual([]);
	});

	it("returns missing keys for partial translation", () => {
		// Manually delete a key to simulate partial translation
		const partial = { ...TRANSLATIONS["en-US"] };
		delete partial["app.title"];
		const originalMap = TRANSLATIONS["en-US"];
		(TRANSLATIONS as Record<string, Record<string, string>>)["en-US"] =
			partial;
		try {
			const missing = getMissingTranslations("en-US");
			expect(missing).toContain("app.title");
		} finally {
			(TRANSLATIONS as Record<string, Record<string, string>>)["en-US"] =
				originalMap;
		}
	});
});

describe("TRANSLATIONS integrity", () => {
	it("all 3 locales have the same keys", () => {
		const zhKeys = Object.keys(TRANSLATIONS["zh-CN"]).sort();
		const enKeys = Object.keys(TRANSLATIONS["en-US"]).sort();
		const esKeys = Object.keys(TRANSLATIONS["es-ES"]).sort();
		expect(zhKeys).toEqual(enKeys);
		expect(zhKeys).toEqual(esKeys);
	});

	it("no translation is empty string", () => {
		for (const locale of SUPPORTED_LOCALES) {
			for (const v of Object.values(TRANSLATIONS[locale])) {
				expect(v.length).toBeGreaterThan(0);
			}
		}
	});

	it("each locale has at least 30 translations", () => {
		for (const locale of SUPPORTED_LOCALES) {
			expect(
				Object.keys(TRANSLATIONS[locale]).length,
			).toBeGreaterThanOrEqual(30);
		}
	});
});

describe("I18N_DISCLAIMER", () => {
	it("includes warning emoji", () => {
		expect(I18N_DISCLAIMER).toContain("⚠️");
	});
});
