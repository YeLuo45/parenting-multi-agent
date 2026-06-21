import { describe, expect, it } from "vitest";
import {
	CollegePrepAgent,
	createCollegePrepAgent,
	COLLEGE_PREP_TIPS,
	getTipsForStage,
	matchTopic,
} from "../src/index.js";
import type { ChildProfile } from "@parenting/memory";

const TODAY = new Date("2026-06-20T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const makeChild = (ageDays: number, stage: ChildProfile["stage"]): ChildProfile => ({
	id: "test-child",
	name: "测试",
	birthDate: daysAgo(ageDays),
	stage,
});

describe("Knowledge: college prep tips", () => {
	it("returns tips for teen stage", () => {
		expect(getTipsForStage("teen").length).toBeGreaterThan(0);
	});
	it("returns tips for tween stage", () => {
		expect(getTipsForStage("tween").length).toBeGreaterThan(0);
	});
	it("returns empty for newborn", () => {
		expect(getTipsForStage("newborn")).toEqual([]);
	});
	it("filters by topic", () => {
		const tips = getTipsForStage("teen", "standardized_test");
		expect(tips.length).toBe(1);
	});
	it("COLLEGE_PREP_TIPS has expected structure", () => {
		for (const tip of COLLEGE_PREP_TIPS) {
			expect(tip.topic).toBeTruthy();
			expect(tip.stage.length).toBeGreaterThan(0);
			expect(tip.advice.length).toBeGreaterThan(0);
		}
	});
});

describe("Knowledge: matchTopic", () => {
	it("matches standardized_test", () => expect(matchTopic("SAT 备考")).toBe("standardized_test"));
	it("matches essay", () => expect(matchTopic("文书写作")).toBe("essay"));
	it("matches extracurricular", () => expect(matchTopic("社团活动")).toBe("extracurricular"));
	it("matches application", () => expect(matchTopic("ED申请")).toBe("application"));
	it("matches financial_aid", () => expect(matchTopic("FAFSA")).toBe("financial_aid"));
	it("matches selection", () => expect(matchTopic("选校")).toBe("selection"));
	it("matches academics", () => expect(matchTopic("GPA 提升")).toBe("academics"));
	it("returns null for unrelated", () => expect(matchTopic("宝宝发烧")).toBeNull());
});

describe("CollegePrepAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createCollegePrepAgent();
		expect(a.id).toBe("college-prep");
		expect(a.name).toBe("大学申请顾问");
	});
	it("has education topic", () => {
		expect(createCollegePrepAgent().topics).toEqual(["education"]);
	});
	it("supports tween/teen/young_adult", () => {
		const stages = createCollegePrepAgent().stages;
		expect(stages).toContain("tween");
		expect(stages).toContain("teen");
		expect(stages).toContain("young_adult");
	});
});

describe("CollegePrepAgent — topic queries", () => {
	const agent = createCollegePrepAgent();
	const ctx = { memory: undefined } as any;

	it("returns SAT tips", async () => {
		const r = await agent.respond("SAT备考", makeChild(365 * 17, "teen"), ctx);
		expect(r.content).toMatch(/SAT|标化/);
		expect(r.confidence).toBe(0.85);
	});

	it("returns essay tips", async () => {
		const r = await agent.respond("文书怎么写", makeChild(365 * 17, "teen"), ctx);
		expect(r.content).toMatch(/文书|essay/);
	});

	it("returns application tips", async () => {
		const r = await agent.respond("大学申请流程", makeChild(365 * 17, "teen"), ctx);
		expect(r.content).toMatch(/申请|application/);
	});

	it("returns financial_aid tips", async () => {
		const r = await agent.respond("奖学金", makeChild(365 * 17, "teen"), ctx);
		expect(r.content).toMatch(/奖学金|financial/);
	});

	it("returns selection tips", async () => {
		const r = await agent.respond("选校", makeChild(365 * 17, "teen"), ctx);
		expect(r.content).toMatch(/选校|大学/);
	});

	it("returns academics tips", async () => {
		const r = await agent.respond("GPA", makeChild(365 * 15, "tween"), ctx);
		expect(r.content).toMatch(/GPA|学业/);
	});

	it("returns extracurricular tips", async () => {
		const r = await agent.respond("社团活动", makeChild(365 * 15, "tween"), ctx);
		expect(r.content).toMatch(/社团|课外/);
	});
});

describe("CollegePrepAgent — general fallback", () => {
	const agent = createCollegePrepAgent();
	const ctx = { memory: undefined } as any;

	it("introduces itself for teen vague question", async () => {
		const r = await agent.respond("你好", makeChild(365 * 16, "teen"), ctx);
		expect(r.content).toContain("大学申请顾问");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns help when no tips for newborn", async () => {
		const r = await agent.respond("你好", makeChild(15, "newborn"), ctx);
		expect(r.content).toContain("大学申请顾问");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns help for unrelated with teen stage", async () => {
		const r = await agent.respond("xyz123", makeChild(365 * 16, "teen"), ctx);
		expect(r.content).toContain("大学申请顾问");
	});

	it("returns intro for newborn", async () => {
		const r = await agent.respond("anything", makeChild(15, "newborn"), ctx);
		expect(r.content).toContain("大学申请顾问");
	});
});

describe("CollegePrepAgent — factory and stage undefined", () => {
	it("createCollegePrepAgent returns working agent", async () => {
		const a = createCollegePrepAgent();
		const r = await a.respond("SAT", {
			id: "c1",
			name: "Test",
			birthDate: "2008-06-19",
			stage: "teen",
		}, { memory: undefined as any });
		expect(r.agentId).toBe("college-prep");
	});

	it("computes stage when child.stage is undefined", async () => {
		const child = {
			id: "c1",
			name: "Test",
			birthDate: "2008-06-19",
			stage: undefined as unknown as "teen",
		};
		const r = await createCollegePrepAgent().respond("SAT", child, { memory: undefined as any });
		expect(r.agentId).toBe("college-prep");
	});
});
