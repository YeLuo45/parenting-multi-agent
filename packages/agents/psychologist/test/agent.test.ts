import { describe, expect, it } from "vitest";
import {
	PsychologistAgent,
	detectEmotions,
	matchBehaviorProblem,
	getEriksonStage,
} from "../src/index.js";
import type { ChildProfile } from "@parenting/memory";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const makeChild = (ageDays: number, id = "c1", name = "TestChild"): ChildProfile => ({
	id,
	name,
	birthDate: daysAgo(ageDays),
	stage: "toddler",
});

describe("Knowledge: emotion detection", () => {
	it("detects 'sad' from Chinese", () => {
		const e = detectEmotions("孩子最近很伤心");
		expect(e).toContain("sad");
	});

	it("detects multiple emotions", () => {
		const e = detectEmotions("孩子又生气又害怕");
		expect(e).toContain("angry");
		expect(e).toContain("afraid");
	});

	it("detects anxiety", () => {
		const e = detectEmotions("宝宝很焦虑");
		expect(e).toContain("anxious");
	});

	it("returns empty for emotionless text", () => {
		const e = detectEmotions("今天天气真好");
		expect(e).toEqual([]);
	});

	it("deduplicates emotions", () => {
		const e = detectEmotions("宝宝伤心了又很伤心");
		const unique = new Set(e);
		expect(e.length).toBe(unique.size);
	});
});

describe("Knowledge: behavior problem matching", () => {
	it("matches tantrum for 2-year-old", () => {
		const p = matchBehaviorProblem("宝宝总是发脾气", 30);
		expect(p?.id).toBe("B001_tantrum");
	});

	it("matches biting for 18-month-old", () => {
		const p = matchBehaviorProblem("宝宝在幼儿园咬人", 18);
		expect(p?.id).toBe("B002_biting");
	});

	it("matches separation anxiety for 10-month-old", () => {
		const p = matchBehaviorProblem("宝宝分离焦虑", 10);
		expect(p?.id).toBe("B006_separation_anxiety");
	});

	it("matches screen time concerns", () => {
		const p = matchBehaviorProblem("孩子天天看手机", 36);
		expect(p?.id).toBe("B008_screen_addiction");
	});

	it("matches self-harm as high urgency", () => {
		const p = matchBehaviorProblem("孩子说想死", 180);
		expect(p?.id).toBe("B009_self_harm");
		expect(p?.urgency).toBe("high");
	});

	it("returns null for non-behavior text", () => {
		const p = matchBehaviorProblem("今天学画画", 36);
		expect(p).toBeNull();
	});

	it("respects age range", () => {
		// tantrum is for 12-72 months
		const pTooYoung = matchBehaviorProblem("宝宝发脾气", 6);
		expect(pTooYoung).toBeNull();
		const pTooOld = matchBehaviorProblem("孩子发脾气", 240);
		expect(pTooOld).toBeNull();
	});
});

describe("Knowledge: Erikson stages", () => {
	it("returns toddler stage for toddler child", () => {
		const s = getEriksonStage("toddler");
		expect(s?.psychosocialCrisis).toContain("Autonomy");
	});

	it("returns teen stage for teen", () => {
		const s = getEriksonStage("tween");
		expect(s?.psychosocialCrisis).toContain("Identity");
	});

	it("returns null for infant (we have newborn instead)", () => {
		const s = getEriksonStage("infant");
		expect(s).toBeNull();
	});
});

describe("PsychologistAgent", () => {
	const agent = new PsychologistAgent();

	describe("metadata", () => {
		it("has correct id and name", () => {
			expect(agent.id).toBe("psychologist");
			expect(agent.name).toBe("儿童心理咨询师");
		});

		it("handles emotion/behavior/development/family topics", () => {
			expect(agent.topics).toContain("emotion");
			expect(agent.topics).toContain("behavior");
			expect(agent.topics).toContain("development");
			expect(agent.topics).toContain("family");
		});
	});

	describe("self-harm crisis", () => {
		it("returns emergency with red flag", async () => {
			const reply = await agent.respond("孩子说想死怎么办", makeChild(365 * 14), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.urgency).toBe("emergency");
			expect(reply.redFlag).toBeDefined();
			expect(reply.content).toContain("400-161-9995");
		});
	});

	describe("emotion queries", () => {
		it("identifies angry emotion", async () => {
			const reply = await agent.respond("孩子很生气", makeChild(365 * 4), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("生气");
		});

		it("identifies fear", async () => {
			const reply = await agent.respond("宝宝很害怕", makeChild(365 * 3), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("害怕");
		});

		it("identifies multiple emotions", async () => {
			const reply = await agent.respond("孩子又生气又焦虑", makeChild(365 * 8), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("生气");
			expect(reply.content).toContain("焦虑");
		});
	});

	describe("behavior queries", () => {
		it("returns tantrum strategies", async () => {
			const reply = await agent.respond("2岁宝宝总发脾气", makeChild(365 * 2), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("发脾气");
			expect(reply.confidence).toBeGreaterThan(0.7);
		});

		it("returns biting strategies", async () => {
			const reply = await agent.respond("宝宝在幼儿园咬小朋友", makeChild(365 * 2), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("咬");
		});

		it("returns screen time guidance", async () => {
			const reply = await agent.respond("3岁孩子天天看手机", makeChild(365 * 3), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("屏幕");
		});

		it("returns sibling rivalry guidance", async () => {
			const reply = await agent.respond("老大和弟弟老是抢东西", makeChild(365 * 5), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/同胞|兄弟姐妹|哥哥|弟弟/);
		});
	});

	describe("development queries", () => {
		it("returns Erikson stage for teen", async () => {
			const reply = await agent.respond("青春期孩子叛逆", { ...makeChild(365 * 14), stage: "tween" }, {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("Erikson");
			expect(reply.content).toContain("Identity");
		});

		it("returns toddler stage guidance", async () => {
			const reply = await agent.respond("孩子自主性发展", { ...makeChild(365 * 2), stage: "toddler" }, {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("自主");
		});
	});

	describe("family queries", () => {
		it("returns family dynamics guidance", async () => {
			const reply = await agent.respond("夫妻总是吵架孩子怎么办", makeChild(365 * 5), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("父母");
		});
	});

	describe("general queries", () => {
		it("introduces itself for vague questions", async () => {
			const reply = await agent.respond("你好", makeChild(365 * 3), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("心理咨询师");
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});
});
