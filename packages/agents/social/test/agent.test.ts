import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import {
	createSocialAgent,
	getTipsForStage,
	matchTopic,
	SOCIAL_TIPS,
} from "../src/index.js";

const TODAY = new Date("2026-06-20T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

const makeChild = (
	ageDays: number,
	stage?: ChildProfile["stage"],
): ChildProfile => ({
	id: "test-child",
	name: "测试宝宝",
	birthDate: daysAgo(ageDays),
	stage: stage ?? "toddler",
});

describe("Knowledge: social tips", () => {
	it("returns tips for toddler stage", () => {
		const tips = getTipsForStage("toddler");
		expect(tips.length).toBeGreaterThan(0);
	});

	it("returns empty for newborn (no social tips for 0-1 month)", () => {
		const tips = getTipsForStage("newborn");
		expect(tips.length).toBe(0);
	});

	it("filters by topic when provided", () => {
		const tips = getTipsForStage("preschool", "sharing");
		expect(tips.length).toBe(1);
		expect(tips[0].topic).toBe("sharing");
	});

	it("returns undefined topic tips for all stages when topic omitted", () => {
		const all = getTipsForStage("school_age");
		expect(all.length).toBeGreaterThan(1);
	});

	it("SOCIAL_TIPS has expected structure", () => {
		for (const tip of SOCIAL_TIPS) {
			expect(tip.topic).toBeTruthy();
			expect(tip.stage.length).toBeGreaterThan(0);
			expect(tip.advice.length).toBeGreaterThan(0);
			expect(tip.ageRange).toBeTruthy();
		}
	});
});

describe("Knowledge: matchTopic", () => {
	it("matches sharing", () =>
		expect(matchTopic("宝宝不会分享玩具")).toBe("sharing"));
	it("matches shyness", () =>
		expect(matchTopic("孩子害羞认生")).toBe("shyness"));
	it("matches playdate", () =>
		expect(matchTopic("如何安排playdate")).toBe("playdate"));
	it("matches conflict", () =>
		expect(matchTopic("小朋友吵架怎么办")).toBe("conflict"));
	it("matches cooperation", () =>
		expect(matchTopic("培养合作能力")).toBe("cooperation"));
	it("matches friendship", () =>
		expect(matchTopic("孩子交朋友困难")).toBe("friendship"));
	it("matches peer_pressure", () =>
		expect(matchTopic("同伴压力大")).toBe("peer_pressure"));
	it("returns null for unrelated query", () =>
		expect(matchTopic("宝宝发烧")).toBeNull());
});

describe("SocialAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createSocialAgent();
		expect(a.id).toBe("social");
		expect(a.name).toBe("社交教练");
	});

	it("handles social topic", () => {
		expect(createSocialAgent().topics).toEqual(["social"]);
	});

	it("supports all 8 stages", () => {
		expect(createSocialAgent().stages.length).toBe(8);
	});
});

describe("SocialAgent — sharing queries", () => {
	const agent = createSocialAgent();
	const ctx = { memory: undefined } as any;

	it("returns sharing tips for toddler", async () => {
		const r = await agent.respond(
			"宝宝不会分享玩具",
			makeChild(365 * 2, "toddler"),
			ctx,
		);
		expect(r.content).toMatch(/分享/);
		expect(r.confidence).toBe(0.85);
	});

	it("returns sharing tips for preschool", async () => {
		const r = await agent.respond(
			"4岁孩子不愿意轮流玩",
			makeChild(365 * 4, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/分享|轮流/);
	});
});

describe("SocialAgent — shyness queries", () => {
	const agent = createSocialAgent();
	const ctx = { memory: undefined } as any;

	it("returns shyness tips for school_age", async () => {
		const r = await agent.respond(
			"孩子太害羞了",
			makeChild(365 * 8, "school_age"),
			ctx,
		);
		expect(r.content).toMatch(/害羞|shy/i);
	});
});

describe("SocialAgent — playdate queries", () => {
	const agent = createSocialAgent();
	const ctx = { memory: undefined } as any;

	it("returns playdate tips", async () => {
		const r = await agent.respond(
			"怎么安排小朋友一起玩",
			makeChild(365 * 4, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/playdate|玩耍约会|1对1/);
	});
});

describe("SocialAgent — conflict queries", () => {
	const agent = createSocialAgent();
	const ctx = { memory: undefined } as any;

	it("returns conflict resolution tips", async () => {
		const r = await agent.respond(
			"两个孩子吵架了",
			makeChild(365 * 6, "school_age"),
			ctx,
		);
		expect(r.content).toMatch(/冲突|吵架/);
	});
});

describe("SocialAgent — cooperation queries", () => {
	const agent = createSocialAgent();
	const ctx = { memory: undefined } as any;

	it("returns cooperation tips for preschool", async () => {
		const r = await agent.respond(
			"怎么教孩子合作",
			makeChild(365 * 4, "preschool"),
			ctx,
		);
		expect(r.content).toMatch(/合作/);
	});
});

describe("SocialAgent — friendship queries", () => {
	const agent = createSocialAgent();
	const ctx = { memory: undefined } as any;

	it("returns friendship tips", async () => {
		const r = await agent.respond(
			"孩子交不到朋友",
			makeChild(365 * 7, "school_age"),
			ctx,
		);
		expect(r.content).toMatch(/朋友|友谊/);
	});
});

describe("SocialAgent — peer pressure queries", () => {
	const agent = createSocialAgent();
	const ctx = { memory: undefined } as any;

	it("returns peer pressure tips for tween", async () => {
		const r = await agent.respond(
			"孩子受同伴压力影响",
			makeChild(365 * 13, "tween"),
			ctx,
		);
		expect(r.content).toMatch(/同伴压力/);
	});
});

describe("SocialAgent — general fallback", () => {
	const agent = createSocialAgent();
	const ctx = { memory: undefined } as any;

	it("introduces itself for vague questions", async () => {
		const r = await agent.respond(
			"你好",
			makeChild(365 * 5, "school_age"),
			ctx,
		);
		expect(r.content).toContain("社交教练");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns help text when no tips for stage", async () => {
		const r = await agent.respond("你好", makeChild(15, "newborn"), ctx);
		expect(r.content).toContain("社交教练");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns topic-specific tips for teen stage", async () => {
		const r = await agent.respond(
			"朋友问题",
			makeChild(365 * 15, "teen"),
			ctx,
		);
		expect(r.content).toMatch(/朋友|友谊/);
	});

	it("returns help when no match found for unrelated query", async () => {
		const r = await agent.respond(
			"asdfqwerty",
			makeChild(365 * 5, "school_age"),
			ctx,
		);
		expect(r.content).toContain("社交教练");
		expect(r.confidence).toBeLessThan(0.5);
	});
});

describe("SocialAgent — factory", () => {
	it("createSocialAgent returns working agent", async () => {
		const a = createSocialAgent();
		expect(a.id).toBe("social");
		const r = await a.respond(
			"孩子害羞",
			makeChild(365 * 5, "school_age"),
			{
				memory: undefined as any,
			},
		);
		expect(r.agentId).toBe("social");
	});

	it("computes stage when child.stage is undefined", async () => {
		const childWithoutStage = {
			id: "c1",
			name: "Test",
			birthDate: "2024-01-01",
			stage: undefined as unknown as "infant",
		};
		const r = await agent.respond("害羞", childWithoutStage, ctx);
		expect(r.agentId).toBe("social");
	});

	it("always includes disclaimer", async () => {
		const r = await agent.respond(
			"孩子害羞",
			makeChild(365 * 5, "school_age"),
			ctx,
		);
		expect(r.content).toContain("⚠️");
	});
});

// Fix: agent/ctx needed for the undefined stage test above
const agent = createSocialAgent();
const ctx = { memory: undefined } as any;
