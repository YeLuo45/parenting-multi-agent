import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import type { CryDistribution, CryReason } from "../src/index.js";
import {
	_formatAdvice,
	_formatDistribution,
	_formatFiveS,
	_urgencyFromMax,
	buildEmptyDistribution,
	buildSoothingPlan,
	CRY_REASON_BY_ID,
	CRY_REASON_PROFILES,
	CryDecoderAgent,
	classifyCry,
	createCryDecoderAgent,
	FIVE_S,
	formatSoothingPlan,
	getAdaptiveNextStep,
	maxUrgencyOf,
	scoreReason,
	topReasons,
} from "../src/index.js";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

const makeChild = (
	ageDays: number,
	id = "c1",
	name = "TestBaby",
	stage: ChildProfile["stage"] = "infant",
): ChildProfile => ({
	id,
	name,
	birthDate: daysAgo(ageDays),
	stage,
});

describe("Knowledge: cry reason profiles", () => {
	it("contains all 12 reason profiles", () => {
		expect(CRY_REASON_PROFILES.length).toBe(12);
	});

	it("every reason has a positive trigger weight", () => {
		for (const p of CRY_REASON_PROFILES) {
			expect(p.triggerWeight).toBeGreaterThan(0);
		}
	});

	it("CRY_REASON_BY_ID maps every profile", () => {
		for (const p of CRY_REASON_PROFILES) {
			expect(CRY_REASON_BY_ID.get(p.id)?.id).toBe(p.id);
		}
	});

	it("buildEmptyDistribution gives all reasons score 0", () => {
		const d = buildEmptyDistribution();
		expect(d.length).toBe(CRY_REASON_PROFILES.length);
		for (const x of d) {
			expect(x.score).toBe(0);
		}
	});
});

describe("Knowledge: 5 S soothing methods", () => {
	it("has all 5 standard S's", () => {
		expect(FIVE_S.length).toBe(5);
		const ids = FIVE_S.map((s) => s.id);
		expect(ids).toEqual(["swaddle", "side", "shush", "swing", "suck"]);
	});

	it("swaddle is restricted to early infancy", () => {
		const swaddle = FIVE_S.find((s) => s.id === "swaddle");
		expect(swaddle?.maxAgeMonths).toBeLessThanOrEqual(4);
	});
});

describe("scoreReason", () => {
	it("returns 0 when no triggers match", () => {
		const p = CRY_REASON_BY_ID.get("hunger")!;
		const r = scoreReason("完全无关的问题", p);
		expect(r.score).toBe(0);
		expect(r.triggersMatched).toEqual([]);
	});

	it("returns full weight for a single trigger", () => {
		const p = CRY_REASON_BY_ID.get("hunger")!;
		const r = scoreReason("宝宝饿了", p);
		expect(r.score).toBe(p.triggerWeight);
		expect(r.triggersMatched.length).toBe(1);
	});

	it("returns diminishing-returns weight for multiple triggers", () => {
		const p = CRY_REASON_BY_ID.get("hunger")!;
		const r = scoreReason("宝宝饿 喂奶 该吃了", p);
		expect(r.triggersMatched.length).toBeGreaterThanOrEqual(2);
		const single = scoreReason("宝宝饿", p).score;
		expect(r.score).toBeGreaterThan(single);
		expect(r.score).toBeLessThan(single * r.triggersMatched.length);
	});

	it("matches case-insensitively", () => {
		const p = CRY_REASON_BY_ID.get("hunger")!;
		expect(scoreReason("HUNGRY baby", p).score).toBeGreaterThan(0);
	});
});

describe("classifyCry", () => {
	it("returns normalized distribution summing to ~1 for matched reasons", () => {
		const d = classifyCry("宝宝肠绞痛 胀气");
		const total = d.reduce((s, x) => s + x.score, 0);
		expect(total).toBeGreaterThan(0.99);
		expect(total).toBeLessThan(1.01);
	});

	it("puts the matched reason on top", () => {
		const d = classifyCry("宝宝出牙 流口水");
		const colicIdx = d.findIndex((x) => x.reason === "teething");
		expect(d[colicIdx].score).toBeGreaterThan(d[0].score / 2);
	});

	it("returns only 'unknown' weighted when nothing matches", () => {
		const d = classifyCry("???");
		const unknown = d.find((x) => x.reason === "unknown")!;
		expect(unknown.score).toBe(1);
		for (const x of d) {
			if (x.reason === "unknown") continue;
			expect(x.score).toBe(0);
		}
	});

	it("flags 'illness' as highest urgency when illness triggers are present", () => {
		const d = classifyCry("宝宝发烧 咳嗽");
		const illness = d.find((x) => x.reason === "illness")!;
		expect(illness.score).toBeGreaterThan(0);
	});
});

describe("topReasons", () => {
	it("returns at most n entries", () => {
		const d = classifyCry("宝宝饿了 困 胀气");
		expect(topReasons(d, 2).length).toBeLessThanOrEqual(2);
	});

	it("sorts by descending score", () => {
		const d = classifyCry("宝宝发烧 咳嗽 流鼻涕");
		const top = topReasons(d, 5);
		for (let i = 1; i < top.length; i++) {
			expect(top[i - 1].score).toBeGreaterThanOrEqual(top[i].score);
		}
	});

	it("skips zero-scored reasons", () => {
		const d = buildEmptyDistribution();
		expect(topReasons(d, 3).length).toBe(0);
	});

	it("breaks score ties by urgency (higher urgency first)", () => {
		// Build a synthetic distribution where two reasons have equal
		// score but different urgency. illness (urgency 5) should sort
		// before tired (urgency 1).
		const dist: CryDistribution[] = [
			{ reason: "tired", name: "困了", score: 0.5, triggersMatched: [] },
			{
				reason: "illness",
				name: "可能生病",
				score: 0.5,
				triggersMatched: [],
			},
		];
		const top = topReasons(dist, 5);
		expect(top[0].reason).toBe("illness");
		expect(top[1].reason).toBe("tired");
	});

	it("falls back to alphabetical order when both score AND urgency tie", () => {
		// Two reasons with identical score and identical urgency
		// (synthetic — manually constructed). Tie-breaker should be
		// the names' localeCompare, so the earlier name wins.
		const dist: CryDistribution[] = [
			{
				reason: "tired",
				name: "B 困了",
				score: 0.5,
				triggersMatched: [],
			},
			{
				reason: "hunger",
				name: "A 饿了",
				score: 0.5,
				triggersMatched: [],
			},
		];
		const top = topReasons(dist, 5);
		// Both urgency 1, so localeCompare picks "A 饿了" first.
		expect(top[0].name).toBe("A 饿了");
	});

	it("handles unknown reason ids gracefully (pa/pb short-circuits)", () => {
		// A reason id that doesn't exist in CRY_REASON_BY_ID. topReasons
		// must not throw — it just falls through to the localeCompare
		// branch with `pb?.name ?? ""`.
		const dist: CryDistribution[] = [
			{
				reason: "fake-reason-a" as CryReason,
				name: "A",
				score: 0.5,
				triggersMatched: [],
			},
			{
				reason: "fake-reason-b" as CryReason,
				name: "B",
				score: 0.5,
				triggersMatched: [],
			},
		];
		const top = topReasons(dist, 5);
		// Both reasons are unknown to the registry; we just verify the
		// function didn't throw and that the alphabetical order is preserved.
		expect(top.length).toBe(2);
		expect(top[0].name).toBe("A");
		expect(top[1].name).toBe("B");
	});
});

describe("maxUrgencyOf", () => {
	it("returns 0 for an empty distribution", () => {
		expect(maxUrgencyOf([])).toBe(0);
	});

	it("returns the urgency of a single reason", () => {
		const dist: CryDistribution[] = [
			{
				reason: "illness",
				name: "可能生病",
				score: 1,
				triggersMatched: [],
			},
		];
		expect(maxUrgencyOf(dist)).toBe(5);
	});

	it("returns the maximum across multiple reasons", () => {
		const dist: CryDistribution[] = [
			{ reason: "tired", name: "困了", score: 0.3, triggersMatched: [] },
			{
				reason: "colic",
				name: "肠绞痛",
				score: 0.7,
				triggersMatched: [],
			},
			{
				reason: "illness",
				name: "可能生病",
				score: 0.5,
				triggersMatched: [],
			},
		];
		expect(maxUrgencyOf(dist)).toBe(5);
	});

	it("returns 3 (medium) when top reason is colic", () => {
		const dist: CryDistribution[] = [
			{ reason: "colic", name: "肠绞痛", score: 1, triggersMatched: [] },
		];
		expect(maxUrgencyOf(dist)).toBe(3);
	});

	it("returns 0 when reason is not in CRY_REASON_BY_ID", () => {
		const dist: CryDistribution[] = [
			{
				reason: "fake-reason" as CryReason,
				name: "X",
				score: 1,
				triggersMatched: [],
			},
		];
		// p is undefined → returns acc (0)
		expect(maxUrgencyOf(dist)).toBe(0);
	});
});

describe("_urgencyFromMax", () => {
	it("returns 'high' when maxUrgency >= 4", () => {
		expect(_urgencyFromMax(4)).toBe("high");
		expect(_urgencyFromMax(5)).toBe("high");
	});

	it("returns 'medium' when maxUrgency is exactly 3", () => {
		expect(_urgencyFromMax(3)).toBe("medium");
	});

	it("returns 'info' when maxUrgency < 3", () => {
		expect(_urgencyFromMax(0)).toBe("info");
		expect(_urgencyFromMax(1)).toBe("info");
		expect(_urgencyFromMax(2)).toBe("info");
	});
});

describe("_formatDistribution", () => {
	it("returns the fallback message for an empty distribution", () => {
		expect(_formatDistribution([])).toContain("没有匹配到具体原因");
	});

	it("renders the distribution lines for non-empty input", () => {
		const dist: CryDistribution[] = [
			{
				reason: "hunger",
				name: "饿了",
				score: 0.6,
				triggersMatched: ["饿"],
			},
			{ reason: "tired", name: "困了", score: 0.4, triggersMatched: [] },
		];
		const out = _formatDistribution(dist);
		expect(out).toContain("饿了");
		expect(out).toContain("60%");
		expect(out).toContain("困了");
		expect(out).toContain("40%");
		expect(out).toContain("匹配: 饿");
	});
});

describe("_formatAdvice", () => {
	it("returns empty string for empty input", () => {
		expect(_formatAdvice([])).toBe("");
	});

	it("renders the advice for a known reason", () => {
		const dist: CryDistribution[] = [
			{ reason: "hunger", name: "饿了", score: 1, triggersMatched: [] },
		];
		const out = _formatAdvice(dist);
		expect(out).toContain("【饿了】");
		expect(out).toContain("喂奶");
	});

	it("skips reasons that aren't in CRY_REASON_BY_ID", () => {
		const dist: CryDistribution[] = [
			{
				reason: "fake-reason" as CryReason,
				name: "Fake",
				score: 1,
				triggersMatched: [],
			},
			{ reason: "hunger", name: "饿了", score: 0.5, triggersMatched: [] },
		];
		const out = _formatAdvice(dist);
		expect(out).toContain("【饿了】");
		expect(out).not.toContain("Fake");
	});
});

describe("_formatFiveS", () => {
	it("returns empty string for a 7-year-old (out of all 5S ranges)", () => {
		const out = _formatFiveS(7 * 12);
		expect(out).toBe("");
	});

	it("renders 5 S for a 2-month-old (within all ranges)", () => {
		const out = _formatFiveS(2);
		expect(out).toContain("包裹");
		expect(out).toContain("摇晃");
		expect(out).toContain("吮吸");
	});
});

describe("CryDecoderAgent", () => {
	const agent = new CryDecoderAgent();

	describe("metadata", () => {
		it("has correct id and Chinese name", () => {
			expect(agent.id).toBe("cry-decoder");
			expect(agent.name).toBe("哭闹解码师");
		});

		it("handles cry / behavior / emotion topics", () => {
			expect(agent.topics).toContain("cry");
			expect(agent.topics).toContain("behavior");
			expect(agent.topics).toContain("emotion");
		});

		it("handles newborn / infant / toddler / preschool stages", () => {
			expect(agent.stages).toContain("newborn");
			expect(agent.stages).toContain("infant");
			expect(agent.stages).toContain("toddler");
			expect(agent.stages).toContain("preschool");
		});
	});

	describe("classify intent", () => {
		it("returns a distribution with at least one reason for '为什么哭'", async () => {
			const reply = await agent.respond("宝宝为什么哭", makeChild(60));
			expect(reply.content).toMatch(/哭闹原因|原因/);
		});

		it("flags illness reason when user mentions fever", async () => {
			const reply = await agent.respond("宝宝发烧了 哭", makeChild(60));
			expect(reply.content).toContain("可能生病");
		});

		it("escalates urgency to 'high' when illness is the top reason", async () => {
			const reply = await agent.respond(
				"宝宝发烧 咳嗽 呕吐 哭",
				makeChild(60),
			);
			expect(reply.urgency).toBe("high");
		});

		it("returns info urgency for low-urgency reasons like tired", async () => {
			const reply = await agent.respond("宝宝困了 揉眼睛", makeChild(60));
			expect(reply.urgency).toBe("info");
		});

		it("returns medium urgency when top reason is colic (urgency 3)", async () => {
			const reply = await agent.respond(
				"宝宝哭 胀气 放屁 飞机抱",
				makeChild(60),
			);
			expect(reply.urgency).toBe("medium");
		});

		it("returns low confidence when no real reason matches (only 'unknown')", async () => {
			const reply = await agent.respond("宝宝哭 莫名其妙", makeChild(60));
			// '莫名其妙' has no trigger in any reason, so classifyCry
			// returns only 'unknown'. The agent should report low confidence.
			expect(reply.confidence).toBe(0.55);
		});
	});

	describe("soothe intent", () => {
		it("returns 5 S methods for an infant", async () => {
			const reply = await agent.respond("怎么哄宝宝", makeChild(60));
			expect(reply.content).toContain("5 S");
		});

		it("includes Swaddle step for a 1-month-old", async () => {
			const reply = await agent.respond("怎么哄", makeChild(30));
			expect(reply.content).toContain("Swaddle");
		});

		it("excludes Swaddle for a 6-month-old", async () => {
			const reply = await agent.respond("怎么哄", makeChild(180));
			expect(reply.content).not.toContain("包裹 (Swaddle)");
		});
	});

	describe("colic intent", () => {
		it("returns the colic protocol for colic keywords", async () => {
			const reply = await agent.respond("宝宝肠绞痛 胀气", makeChild(30));
			expect(reply.content).toContain("肠绞痛");
			expect(reply.content).toContain("飞机抱");
			expect(reply.urgency).toBe("medium");
		});
	});

	describe("teething intent", () => {
		it("returns teething advice for teething keywords", async () => {
			const reply = await agent.respond(
				"宝宝出牙 流口水",
				makeChild(180),
			);
			expect(reply.content).toContain("牙胶");
		});
	});

	describe("general / fallback", () => {
		it("introduces itself for vague questions", async () => {
			const reply = await agent.respond("你好", makeChild(60));
			expect(reply.content).toContain("哭闹解码师");
			expect(reply.confidence).toBeLessThan(0.5);
		});

		it("always includes the disclaimer", async () => {
			const reply = await agent.respond("宝宝哭", makeChild(60));
			expect(reply.content).toMatch(/持续哭闹|就医/);
		});
	});

	describe("factory", () => {
		it("createCryDecoderAgent returns a working agent", async () => {
			const a = createCryDecoderAgent();
			expect(a.id).toBe("cry-decoder");
			const reply = await a.respond("宝宝哭", makeChild(60), {
				memory: null as never,
			});
			expect(reply.agentId).toBe("cry-decoder");
		});
	});
});

// ───────────────────────────────────────────────────────────
// Direction D: Soothing Plan Scheduler
// ───────────────────────────────────────────────────────────

describe("buildSoothingPlan", () => {
	it("newborn colic plan puts swing/shush first", () => {
		const plan = buildSoothingPlan(2, ["colic"]);
		expect(plan.steps.length).toBeGreaterThan(0);
		const firstMethod = plan.steps[0]?.method.id;
		expect(["swing", "shush"]).toContain(firstMethod);
	});

	it("newborn hunger plan puts suck first", () => {
		const plan = buildSoothingPlan(2, ["hunger"]);
		expect(plan.steps[0]?.method.id).toBe("suck");
	});

	it("filters methods by age window — suck only allowed 0-12mo", () => {
		const plan = buildSoothingPlan(15, ["hunger"]);
		// suck max age 12, plan should not include it
		const hasSuck = plan.steps.some((s) => s.method.id === "suck");
		expect(hasSuck).toBe(false);
	});

	it("step count respects 5-step cap", () => {
		const plan = buildSoothingPlan(3, ["colic", "pain", "overstimulated"]);
		expect(plan.steps.length).toBeLessThanOrEqual(5);
	});

	it("step count respects budget cap", () => {
		const plan = buildSoothingPlan(3, ["colic"], 5);
		expect(plan.totalDurationMin).toBeLessThanOrEqual(5);
	});

	it("timeline is contiguous and starts at 0", () => {
		const plan = buildSoothingPlan(2, ["hunger"]);
		expect(plan.steps[0]?.startMin).toBe(0);
		for (let i = 1; i < plan.steps.length; i++) {
			expect(plan.steps[i]?.startMin).toBe(plan.steps[i - 1]?.endMin);
		}
	});

	it("totalDurationMin equals last step endMin", () => {
		const plan = buildSoothingPlan(2, ["hunger"]);
		const lastEnd = plan.steps[plan.steps.length - 1]?.endMin ?? 0;
		expect(plan.totalDurationMin).toBe(lastEnd);
	});

	it("unknown reason falls back to default 5S order", () => {
		const plan = buildSoothingPlan(2, ["unknown_reason" as CryReason]);
		expect(plan.steps.length).toBeGreaterThan(0);
	});

	it("empty reasons array returns default 5S order", () => {
		const plan = buildSoothingPlan(2, []);
		expect(plan.steps.length).toBeGreaterThan(0);
	});
});

describe("getAdaptiveNextStep", () => {
	const plan = buildSoothingPlan(2, ["colic"]);

	it("returns step 2 when at step 1 with no elapsed time", () => {
		const next = getAdaptiveNextStep(plan, 1, 0);
		expect(next?.stepIdx).toBe(2);
	});

	it("returns next normally if elapsed within step window", () => {
		const next = getAdaptiveNextStep(plan, 1, 3);
		expect(next?.stepIdx).toBeGreaterThanOrEqual(2);
	});

	it("returns null when past last step", () => {
		const next = getAdaptiveNextStep(plan, 99, 999);
		expect(next).toBeNull();
	});

	it("skips a step if elapsed > step window + 1min", () => {
		// step 1 endMin is 3 (swing); at currentStepIdx=1, elapsedMin=5
		const step1 = plan.steps.find((s) => s.stepIdx === 1);
		if (step1) {
			const overshoot = step1.endMin + 2;
			const next = getAdaptiveNextStep(plan, 1, overshoot);
			// should skip step 2 and try step 3
			expect(next?.stepIdx).toBeGreaterThan(2);
		}
	});
});

describe("formatSoothingPlan", () => {
	it("renders plan with timeline and tip", () => {
		const plan = buildSoothingPlan(2, ["colic"]);
		const out = formatSoothingPlan(plan);
		expect(out).toContain("安抚计划");
		expect(out).toMatch(/总计 \d+ 分钟/);
		expect(out).toContain("💡");
	});

	it("renders empty plan with 0 minutes", () => {
		const plan = buildSoothingPlan(2, [], 0);
		const out = formatSoothingPlan(plan);
		expect(out).toContain("总计 0 分钟");
	});

	it("includes each step's number and method", () => {
		const plan = buildSoothingPlan(2, ["hunger"]);
		const out = formatSoothingPlan(plan);
		for (const s of plan.steps) {
			expect(out).toContain(`${s.stepIdx}.`);
			expect(out).toContain(s.method.name);
		}
	});
});

describe("FIVE_S integrity (extended)", () => {
	it("each method has minAgeMonths <= maxAgeMonths", () => {
		for (const m of FIVE_S) {
			expect(m.minAgeMonths).toBeLessThanOrEqual(m.maxAgeMonths);
		}
	});
});

describe("buildSoothingPlan specific reason-method branches", () => {
	it("overstimulated + swaddle note (line 429-430)", () => {
		const plan = buildSoothingPlan(3, ["overstimulated"]);
		const swaddleStep = plan.steps.find((s) => s.method.id === "swaddle");
		expect(swaddleStep?.notes).toContain("过度刺激");
	});

	it("sleep + swaddle note (line 435-436)", () => {
		const plan = buildSoothingPlan(3, ["tired"]);
		const swaddleStep = plan.steps.find((s) => s.method.id === "swaddle");
		expect(swaddleStep?.notes).toContain("困倦");
	});

	it("sleep + shush note (line 435-436)", () => {
		const plan = buildSoothingPlan(3, ["tired"]);
		const shushStep = plan.steps.find((s) => s.method.id === "shush");
		expect(shushStep?.notes).toContain("困倦");
	});
});

describe("buildSoothingPlan overstimulated/tired branches", () => {
	it("overstimulated + swaddle note", () => {
		const plan = buildSoothingPlan(3, ["overstimulated"]);
		const swaddleStep = plan.steps.find((s) => s.method.id === "swaddle");
		expect(swaddleStep?.notes).toContain("过度刺激");
	});

	it("tired + swaddle note", () => {
		const plan = buildSoothingPlan(3, ["tired"]);
		const swaddleStep = plan.steps.find((s) => s.method.id === "swaddle");
		expect(swaddleStep?.notes).toContain("困倦");
	});

	it("tired + shush note", () => {
		const plan = buildSoothingPlan(3, ["tired"]);
		const shushStep = plan.steps.find((s) => s.method.id === "shush");
		expect(shushStep?.notes).toContain("困倦");
	});
});
