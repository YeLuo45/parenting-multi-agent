import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import {
	createSiblingAgent,
	getTipsForStage,
	matchTopic,
	SIBLING_TIPS,
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

describe("Knowledge: sibling tips", () => {
	it("returns tips for preschool stage", () => {
		expect(getTipsForStage("preschool").length).toBeGreaterThan(0);
	});
	it("returns empty for newborn", () => {
		expect(getTipsForStage("newborn")).toEqual([]);
	});
	it("filters by topic", () => {
		const tips = getTipsForStage("preschool", "rivalry");
		expect(tips.length).toBe(1);
	});
	it("SIBLING_TIPS has expected structure", () => {
		for (const tip of SIBLING_TIPS) {
			expect(tip.topic).toBeTruthy();
			expect(tip.advice.length).toBeGreaterThan(0);
		}
	});
});

describe("Knowledge: matchTopic", () => {
	it("matches rivalry", () => expect(matchTopic("手足之争")).toBe("rivalry"));
	it("matches new_baby", () => expect(matchTopic("新宝宝")).toBe("new_baby"));
	it("matches sharing", () => expect(matchTopic("分享")).toBe("sharing"));
	it("matches fighting", () => expect(matchTopic("打架")).toBe("fighting"));
	it("matches age_gap", () => expect(matchTopic("年龄差")).toBe("age_gap"));
	it("matches favoritism", () =>
		expect(matchTopic("偏爱")).toBe("favoritism"));
	it("matches twin", () => expect(matchTopic("双胞胎")).toBe("twin"));
	it("returns null for unrelated", () =>
		expect(matchTopic("宝宝发烧")).toBeNull());
});

describe("SiblingAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createSiblingAgent();
		expect(a.id).toBe("sibling");
		expect(a.name).toBe("兄弟姐妹顾问");
	});
	it("has family and social topics", () => {
		expect(createSiblingAgent().topics).toEqual(["family", "social"]);
	});
});

describe("SiblingAgent — topic queries", () => {
	const agent = createSiblingAgent();
	const ctx = { memory: undefined } as any;

	it("returns rivalry tips", async () => {
		const r = await agent.respond(
			"手足之争",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/手足|竞争/);
	});
	it("returns new_baby tips", async () => {
		const r = await agent.respond(
			"新宝宝",
			makeChild(365 * 3, "toddler"),
			ctx,
		);
		expect(r.content).toMatch(/新宝宝|二宝/);
	});
	it("returns sharing tips", async () => {
		const r = await agent.respond(
			"分享",
			makeChild(365 * 3, "toddler"),
			ctx,
		);
		expect(r.content).toMatch(/分享/);
	});
	it("returns fighting tips", async () => {
		const r = await agent.respond(
			"打架",
			makeChild(365 * 6, "school_age"),
			ctx,
		);
		expect(r.content).toMatch(/打架|fight/);
	});
	it("returns age_gap tips", async () => {
		const r = await agent.respond(
			"年龄差",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/年龄差|age.gap/);
	});
	it("returns favoritism tips", async () => {
		const r = await agent.respond(
			"偏爱",
			makeChild(365 * 8, "school_age"),
			ctx,
		);
		expect(r.content).toMatch(/偏爱|不公平/);
	});
	it("returns twin tips", async () => {
		const r = await agent.respond(
			"双胞胎",
			makeChild(365 * 2, "toddler"),
			ctx,
		);
		expect(r.content).toMatch(/双胞胎|twin/);
	});
});

describe("SiblingAgent — general fallback", () => {
	const agent = createSiblingAgent();
	const ctx = { memory: undefined } as any;

	it("introduces itself for vague question", async () => {
		const r = await agent.respond(
			"你好",
			makeChild(365 * 5, "preschool"),
			ctx,
		);
		expect(r.content).toContain("兄弟姐妹");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns help when no tips for newborn", async () => {
		const r = await agent.respond("你好", makeChild(15, "newborn"), ctx);
		expect(r.content).toContain("兄弟姐妹");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns intro for newborn", async () => {
		const r = await agent.respond(
			"anything",
			makeChild(15, "newborn"),
			ctx,
		);
		expect(r.content).toContain("兄弟姐妹");
	});
});

describe("SiblingAgent — factory and stage undefined", () => {
	it("computes stage when undefined", async () => {
		const child = {
			id: "c1",
			name: "T",
			birthDate: "2020-06-19",
			stage: undefined as unknown as "preschool",
		};
		const r = await createSiblingAgent().respond("手足", child, {
			memory: undefined as any,
		});
		expect(r.agentId).toBe("sibling");
	});
});
