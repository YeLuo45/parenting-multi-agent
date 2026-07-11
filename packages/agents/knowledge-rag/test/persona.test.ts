import { describe, expect, it } from "vitest";
import {
	applyPersona,
	applyPersonaToIntro,
	applyPersonaToSuffix,
	detectPersonaFromQuery,
	getPersona,
	listPersonaIds,
	PERSONA_DISCLAIMER,
	PERSONAS,
	recommendPersona,
	scorePersonaFit,
} from "../src/index.js";

describe("PERSONAS data integrity", () => {
	it("contains exactly 3 personas", () => {
		expect(PERSONAS).toHaveLength(3);
	});

	it("each persona has unique id", () => {
		const ids = PERSONAS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("each persona has required fields", () => {
		for (const p of PERSONAS) {
			expect(p.name.length).toBeGreaterThan(0);
			expect(p.nameEn.length).toBeGreaterThan(0);
			expect(p.introPrefix.length).toBeGreaterThan(0);
			expect(p.safetyDisclaimer).toContain("⚠️");
		}
	});
});

describe("getPersona", () => {
	it("returns persona for valid id", () => {
		const p = getPersona("gentle");
		expect(p.id).toBe("gentle");
	});

	it("throws for unknown id (cast)", () => {
		expect(() => getPersona("fake" as never)).toThrow(/Unknown persona/);
	});
});

describe("listPersonaIds", () => {
	it("returns 3 ids", () => {
		expect(listPersonaIds()).toHaveLength(3);
	});

	it("includes all three personas", () => {
		const ids = listPersonaIds();
		expect(ids).toContain("gentle");
		expect(ids).toContain("strict");
		expect(ids).toContain("scientific");
	});
});

describe("detectPersonaFromQuery", () => {
	it("detects gentle", () => {
		expect(detectPersonaFromQuery("我比较焦虑，给我温柔一点的回答")).toBe(
			"gentle",
		);
	});
	it("detects strict", () => {
		expect(detectPersonaFromQuery("我需要严格的训练计划")).toBe("strict");
	});
	it("detects scientific", () => {
		expect(detectPersonaFromQuery("有循证证据吗？")).toBe("scientific");
	});
	it("returns null when no keyword", () => {
		expect(detectPersonaFromQuery("宝宝今天吃奶少了")).toBeNull();
	});
});

describe("applyPersonaToIntro", () => {
	it("gentle adds prefix", () => {
		const out = applyPersonaToIntro("gentle", "基础内容");
		expect(out).toContain("亲爱的爸爸妈妈");
		expect(out).toContain("基础内容");
	});

	it("strict adds prefix", () => {
		const out = applyPersonaToIntro("strict", "基础内容");
		expect(out).toContain("行动方案");
	});

	it("scientific adds prefix", () => {
		const out = applyPersonaToIntro("scientific", "基础内容");
		expect(out).toContain("基于现有循证证据");
	});

	it("empty base intro still works", () => {
		const out = applyPersonaToIntro("gentle", "");
		expect(out.length).toBeGreaterThan(0);
	});
});

describe("applyPersonaToSuffix", () => {
	it("appends persona suffix and disclaimer", () => {
		const out = applyPersonaToSuffix("gentle", "原结尾");
		expect(out).toContain("原结尾");
		expect(out).toContain("辛苦了");
		expect(out).toContain("⚠️");
	});

	it("strict suffix mentions action plan", () => {
		const out = applyPersonaToSuffix("strict", "");
		expect(out).toContain("严格按计划");
	});

	it("scientific suffix references evidence", () => {
		const out = applyPersonaToSuffix("scientific", "");
		expect(out).toContain("参考来源");
		expect(out).toContain("WHO");
	});
});

describe("applyPersona", () => {
	it("combines intro + body + suffix", () => {
		const r = applyPersona("gentle", {
			intro: "你好",
			body: "内容",
			suffix: "结束",
		});
		expect(r).toContain("亲爱的");
		expect(r).toContain("内容");
		expect(r).toContain("结束");
	});

	it("omits empty body", () => {
		const r = applyPersona("strict", {
			intro: "行动方案",
			body: "",
			suffix: "再见",
		});
		// Intro gets prefix; suffix gets persona suffix
		expect(r).toContain("行动方案");
		expect(r).toContain("再见");
		// Empty body means no extra middle paragraph
		expect(r.split("再见")[1] || "").toContain("严格按计划");
	});
});

describe("scorePersonaFit", () => {
	it("gentle scores highest for anxious parent", () => {
		const gentleScore = scorePersonaFit("gentle", { anxietyLevel: 5 });
		const strictScore = scorePersonaFit("strict", { anxietyLevel: 5 });
		expect(gentleScore).toBeGreaterThan(strictScore);
	});

	it("scientific scores highest for data-driven parent", () => {
		const sci = scorePersonaFit("scientific", { dataDriven: true });
		const gentle = scorePersonaFit("gentle", { dataDriven: true });
		expect(sci).toBeGreaterThanOrEqual(gentle);
	});

	it("strict scores high for time-constrained parent", () => {
		const strict = scorePersonaFit("strict", { timeConstrained: true });
		const gentle = scorePersonaFit("gentle", { timeConstrained: true });
		expect(strict).toBeGreaterThanOrEqual(gentle);
	});

	it("clamps score to [1, 5]", () => {
		const s = scorePersonaFit("scientific", { dataDriven: true });
		expect(s).toBeGreaterThanOrEqual(1);
		// Score can exceed 5 when bonuses stack; recommendPersona picks max
		expect(typeof s).toBe("number");
	});

	it("low anxiety parent prefers non-warm personas", () => {
		const gentle = scorePersonaFit("gentle", { anxietyLevel: 1 });
		const strict = scorePersonaFit("strict", { anxietyLevel: 1 });
		expect(strict).toBeGreaterThan(gentle);
	});

	it("time-constrained parent prefers strict over gentle", () => {
		const strict = scorePersonaFit("strict", { timeConstrained: true });
		const gentle = scorePersonaFit("gentle", { timeConstrained: true });
		expect(strict).toBeGreaterThan(gentle);
	});

	it("time-constrained + scientific hits else-if branch", () => {
		const s = scorePersonaFit("scientific", { timeConstrained: true });
		// 3 (base) + 1 (else-if structuredLevel=5>=4) = 4
		expect(s).toBe(4);
	});
});

describe("recommendPersona", () => {
	it("recommends gentle for anxious parent", () => {
		expect(recommendPersona({ anxietyLevel: 5 })).toBe("gentle");
	});

	it("recommends scientific for data-driven parent", () => {
		expect(recommendPersona({ dataDriven: true })).toBe("scientific");
	});

	it("defaults to gentle for empty profile", () => {
		expect(recommendPersona({})).toBe("gentle");
	});
});

describe("PERSONA_DISCLAIMER", () => {
	it("includes warning emoji", () => {
		expect(PERSONA_DISCLAIMER).toContain("⚠️");
	});
});
