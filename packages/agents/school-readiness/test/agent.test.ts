import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import {
	createSchoolReadinessAgent,
	getTipsForStage,
	matchTopic,
	READINESS_TIPS,
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
	name: "测试宝宝",
	birthDate: daysAgo(ageDays),
	stage,
});

describe("Knowledge: readiness tips", () => {
	it("returns tips for preschool stage", () => {
		const tips = getTipsForStage("preschool");
		expect(tips.length).toBeGreaterThan(0);
	});

	it("returns tips for school_age stage", () => {
		const tips = getTipsForStage("school_age");
		expect(tips.length).toBeGreaterThan(0);
	});

	it("returns empty for newborn", () => {
		expect(getTipsForStage("newborn")).toEqual([]);
	});

	it("filters by topic when provided", () => {
		const tips = getTipsForStage("preschool", "literacy");
		expect(tips.length).toBe(1);
		expect(tips[0].topic).toBe("literacy");
	});

	it("READINESS_TIPS has expected structure", () => {
		for (const tip of READINESS_TIPS) {
			expect(tip.topic).toBeTruthy();
			expect(tip.stage.length).toBeGreaterThan(0);
			expect(tip.advice.length).toBeGreaterThan(0);
			expect(tip.ageRange).toBeTruthy();
		}
	});
});

describe("Knowledge: matchTopic", () => {
	it("matches readiness", () =>
		expect(matchTopic("幼儿园入学准备")).toBe("readiness"));
	it("matches literacy", () =>
		expect(matchTopic("早期阅读")).toBe("literacy"));
	it("matches math", () => expect(matchTopic("数学启蒙")).toBe("math"));
	it("matches social", () => expect(matchTopic("课堂分享")).toBe("social"));
	it("matches transition", () =>
		expect(matchTopic("幼小衔接")).toBe("transition"));
	it("matches kindergarten", () =>
		expect(matchTopic("选择幼儿园")).toBe("kindergarten"));
	it("returns null for unrelated", () =>
		expect(matchTopic("宝宝发烧")).toBeNull());
});

describe("SchoolReadinessAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createSchoolReadinessAgent();
		expect(a.id).toBe("school-readiness");
		expect(a.name).toBe("入学准备顾问");
	});

	it("has education topic", () => {
		expect(createSchoolReadinessAgent().topics).toEqual(["education"]);
	});

	it("supports preschool and school_age stages", () => {
		const stages = createSchoolReadinessAgent().stages;
		expect(stages).toContain("toddler");
		expect(stages).toContain("preschool");
		expect(stages).toContain("school_age");
	});
});

describe("SchoolReadinessAgent — topic queries", () => {
	const agent = createSchoolReadinessAgent();
	const ctx = { memory: undefined } as any;

	it("returns literacy tips for preschool", async () => {
		const r = await agent.respond(
			"早期阅读",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/阅读|识字/);
		expect(r.confidence).toBe(0.85);
	});

	it("returns math tips", async () => {
		const r = await agent.respond(
			"数学启蒙",
			makeChild(365 * 4, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/数学|数数/);
	});

	it("returns transition tips for school_age", async () => {
		const r = await agent.respond(
			"幼小衔接",
			makeChild(365 * 6, "school_age"),
			ctx,
		);
		expect(r.content).toMatch(/衔接|过渡/);
	});

	it("returns kindergarten tips", async () => {
		const r = await agent.respond(
			"选择幼儿园",
			makeChild(365 * 3, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/幼儿园|选园/);
	});

	it("returns social skills tips", async () => {
		const r = await agent.respond(
			"课堂分享",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/分享|社交/);
	});

	it("returns readiness tips", async () => {
		const r = await agent.respond(
			"幼儿园入学准备",
			makeChild(365 * 4, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/入学|幼儿园/);
	});
});

describe("SchoolReadinessAgent — general fallback", () => {
	const agent = createSchoolReadinessAgent();
	const ctx = { memory: undefined } as any;

	it("introduces itself for vague questions with matching stage", async () => {
		const r = await agent.respond(
			"你好",
			makeChild(365 * 4, "preschool"),
			ctx,
		);
		expect(r.content).toContain("入学准备顾问");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns help when no tips for stage", async () => {
		const r = await agent.respond("你好", makeChild(15, "newborn"), ctx);
		expect(r.content).toContain("入学准备顾问");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns help for unrelated question with matching stage", async () => {
		const r = await agent.respond(
			"xyz123",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toContain("入学准备顾问");
	});

	it("returns intro message for newborn", async () => {
		const r = await agent.respond(
			"anything",
			makeChild(15, "newborn"),
			ctx,
		);
		expect(r.content).toContain("入学准备顾问");
	});
});

describe("SchoolReadinessAgent — factory and stage undefined", () => {
	it("createSchoolReadinessAgent returns a working agent", async () => {
		const a = createSchoolReadinessAgent();
		const r = await a.respond(
			"早期阅读",
			{
				id: "c1",
				name: "Test",
				birthDate: "2020-06-19",
				stage: "preschool",
			},
			{ memory: undefined as any },
		);
		expect(r.agentId).toBe("school-readiness");
	});

	it("computes stage when child.stage is undefined", async () => {
		const child = {
			id: "c1",
			name: "Test",
			birthDate: "2020-06-19",
			stage: undefined as unknown as "preschool",
		};
		const r = await createSchoolReadinessAgent().respond("阅读", child, {
			memory: undefined as any,
		});
		expect(r.agentId).toBe("school-readiness");
	});
});
