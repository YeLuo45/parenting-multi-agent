import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import {
	createLegalAgent,
	getTipsForStage,
	LEGAL_TIPS,
	matchTopic,
} from "../src/index.js";

const TODAY = new Date("2026-06-20T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

const makeChild = (
	ageDays: number,
	stage: ChildProfile["stage"],
): ChildProfile => ({
	id: "test-child",
	name: "测试",
	birthDate: daysAgo(ageDays),
	stage,
});

describe("Knowledge: legal tips", () => {
	it("returns tips for infant stage", () => {
		expect(getTipsForStage("infant").length).toBeGreaterThan(0);
	});
	it("returns empty for newborn", () => {
		expect(getTipsForStage("newborn")).toEqual([]);
	});
	it("filters by topic", () => {
		const tips = getTipsForStage("toddler", "custody");
		expect(tips.length).toBe(1);
	});
	it("LEGAL_TIPS has expected structure", () => {
		for (const tip of LEGAL_TIPS) {
			expect(tip.topic).toBeTruthy();
			expect(tip.advice.length).toBeGreaterThan(0);
			expect(tip.jurisdiction).toBeTruthy();
		}
	});
});

describe("Knowledge: matchTopic", () => {
	it("matches custody", () => expect(matchTopic("监护权")).toBe("custody"));
	it("matches support", () => expect(matchTopic("抚养费")).toBe("support"));
	it("matches adoption", () => expect(matchTopic("收养")).toBe("adoption"));
	it("matches immigration", () =>
		expect(matchTopic("移民签证")).toBe("immigration"));
	it("matches school_law", () =>
		expect(matchTopic("休学")).toBe("school_law"));
	it("matches wills", () => expect(matchTopic("遗嘱")).toBe("wills"));
	it("matches rights", () => expect(matchTopic("儿童权利")).toBe("rights"));
	it("returns null for unrelated", () =>
		expect(matchTopic("宝宝发烧")).toBeNull());
});

describe("LegalAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createLegalAgent();
		expect(a.id).toBe("legal");
		expect(a.name).toBe("法律顾问");
	});
	it("has family topic", () => {
		expect(createLegalAgent().topics).toEqual(["family"]);
	});
});

describe("LegalAgent — topic queries", () => {
	const agent = createLegalAgent();
	const ctx = { memory: undefined } as any;

	it("returns custody tips", async () => {
		const r = await agent.respond(
			"监护权",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/监护|抚养/);
	});
	it("returns support tips", async () => {
		const r = await agent.respond(
			"抚养费",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/抚养费|support/);
	});
	it("returns adoption tips", async () => {
		const r = await agent.respond(
			"收养",
			makeChild(365 * 2, "toddler"),
			ctx,
		);
		expect(r.content).toMatch(/收养|adoption/);
	});
	it("returns immigration tips", async () => {
		const r = await agent.respond(
			"移民签证",
			makeChild(365 * 10, "school_age"),
			ctx,
		);
		expect(r.content).toMatch(/移民|签证|immigration/);
	});
	it("returns school_law tips", async () => {
		const r = await agent.respond(
			"休学",
			makeChild(365 * 12, "tween"),
			ctx,
		);
		expect(r.content).toMatch(/学校|休学|school.law/);
	});
	it("returns wills tips", async () => {
		const r = await agent.respond(
			"遗嘱",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/遗嘱|监护人/);
	});
	it("returns rights tips", async () => {
		const r = await agent.respond(
			"儿童权利",
			makeChild(365 * 8, "school_age"),
			ctx,
		);
		expect(r.content).toMatch(/权利|受虐/);
	});
});

describe("LegalAgent — general fallback", () => {
	const agent = createLegalAgent();
	const ctx = { memory: undefined } as any;

	it("introduces itself for vague question", async () => {
		const r = await agent.respond(
			"你好",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toContain("法律顾问");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns help when no tips for newborn", async () => {
		const r = await agent.respond("你好", makeChild(15, "newborn"), ctx);
		expect(r.content).toContain("法律顾问");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns intro for newborn", async () => {
		const r = await agent.respond(
			"anything",
			makeChild(15, "newborn"),
			ctx,
		);
		expect(r.content).toContain("法律顾问");
	});
});

describe("LegalAgent — factory and stage undefined", () => {
	it("computes stage when undefined", async () => {
		const child = {
			id: "c1",
			name: "T",
			birthDate: "2020-06-19",
			stage: undefined as unknown as "toddler",
		};
		const r = await createLegalAgent().respond("监护", child, {
			memory: undefined as any,
		});
		expect(r.agentId).toBe("legal");
	});
});
