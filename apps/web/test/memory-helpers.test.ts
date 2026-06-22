import { describe, expect, it } from "vitest";
import { computeStage, genId, matchL0Rule } from "../src/memory-helpers.js";

describe("computeStage", () => {
	const ref = new Date("2026-06-21T00:00:00Z");

	it("returns newborn for under 1 month", () => {
		expect(computeStage("2026-06-01T00:00:00Z", ref)).toBe("newborn");
	});

	it("returns infant for 1mo..12mo", () => {
		expect(computeStage("2025-09-01T00:00:00Z", ref)).toBe("infant");
	});

	it("returns toddler for 1y..3y", () => {
		expect(computeStage("2024-06-01T00:00:00Z", ref)).toBe("toddler");
	});

	it("returns preschool for 3y..6y", () => {
		expect(computeStage("2021-06-01T00:00:00Z", ref)).toBe("preschool");
	});

	it("returns school_age for 6y..12y", () => {
		expect(computeStage("2017-06-01T00:00:00Z", ref)).toBe("school_age");
	});

	it("returns tween for 12y..15y", () => {
		expect(computeStage("2013-06-01T00:00:00Z", ref)).toBe("tween");
	});

	it("returns teen for 15y..18y", () => {
		expect(computeStage("2010-06-01T00:00:00Z", ref)).toBe("teen");
	});

	it("returns young_adult for >= 18y", () => {
		expect(computeStage("2005-06-01T00:00:00Z", ref)).toBe("young_adult");
	});
});

describe("genId", () => {
	it("returns a string with the given prefix", () => {
		expect(genId("fact")).toMatch(/^fact_/);
	});

	it("returns a default id when no prefix given", () => {
		expect(genId()).toMatch(/^id_/);
	});
});

describe("matchL0Rule", () => {
	it("matches infant fever emergency", () => {
		const rule = matchL0Rule("我家宝宝3个月发烧38.5度");
		expect(rule?.id).toBe("R001_infant_fever");
		expect(rule?.severity).toBe("emergency");
	});

	it("matches self-harm emergency", () => {
		const rule = matchL0Rule("I am thinking about suicide");
		expect(rule?.id).toBe("R010_self_harm");
	});

	it("returns null when no rule fires", () => {
		expect(matchL0Rule("我家宝宝今天学会走路了")).toBeNull();
	});

	it("picks the highest-severity rule when multiple match", () => {
		const rule = matchL0Rule("婴儿 40度 发烧");
		expect(rule?.severity).toBe("emergency");
	});
});
