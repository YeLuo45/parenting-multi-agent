import { describe, expect, it } from "vitest";
import {
	type AnswerValue,
	applicableItems,
	createScreenAgent,
	detectRedFlags,
	formatScreenResult,
	itemsForScale,
	SCREEN_ITEMS,
	type ScaleId,
	scoreScale,
} from "../src/index.js";

const ALL_OK: Record<string, AnswerValue> = Object.fromEntries(
	SCREEN_ITEMS.map((it) => [it.id, 0]),
);
const ALL_BAD: Record<string, AnswerValue> = Object.fromEntries(
	SCREEN_ITEMS.map((it) => [it.id, 2]),
);

describe("SCREEN_ITEMS data integrity", () => {
	it("contains at least 20 items across scales", () => {
		expect(SCREEN_ITEMS.length).toBeGreaterThanOrEqual(20);
	});

	it("has unique item ids", () => {
		const ids = SCREEN_ITEMS.map((it) => it.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("each item has minAgeMonths <= maxAgeMonths", () => {
		for (const it of SCREEN_ITEMS) {
			expect(it.minAgeMonths).toBeLessThanOrEqual(it.maxAgeMonths);
		}
	});

	it("each scale has at least 10 items", () => {
		const counts: Record<ScaleId, number> = { cbcl: 0, asq: 0, mchat: 0 };
		for (const it of SCREEN_ITEMS) counts[it.scaleId]++;
		for (const scale of ["cbcl", "asq", "mchat"] as const) {
			expect(counts[scale]).toBeGreaterThanOrEqual(10);
		}
	});
});

describe("applicableItems", () => {
	it("filters by age window", () => {
		const items24 = applicableItems(24);
		for (const it of items24) {
			expect(it.minAgeMonths).toBeLessThanOrEqual(24);
			expect(it.maxAgeMonths).toBeGreaterThanOrEqual(24);
		}
	});

	it("returns empty for very young infants", () => {
		expect(applicableItems(3)).toEqual([]);
	});

	it("includes mchat at 18 months", () => {
		const items = applicableItems(18);
		const hasMchat = items.some((it) => it.scaleId === "mchat");
		expect(hasMchat).toBe(true);
	});
});

describe("itemsForScale", () => {
	it("filters by scale id", () => {
		const cbcl = itemsForScale("cbcl", 36);
		expect(cbcl.every((it) => it.scaleId === "cbcl")).toBe(true);
	});

	it("returns empty for invalid scale-age combo", () => {
		const mchat = itemsForScale("mchat", 60);
		expect(mchat).toEqual([]);
	});

	it("returns mchat items for 18mo", () => {
		const items = itemsForScale("mchat", 18);
		expect(items.length).toBeGreaterThan(0);
	});
});

describe("scoreScale", () => {
	it("all-zero answers → low risk", () => {
		const r = scoreScale("cbcl", ALL_OK, 36);
		expect(r.totalScore).toBe(0);
		expect(r.riskLevel).toBe("low");
	});

	it("all-max answers → high risk", () => {
		const r = scoreScale("cbcl", ALL_BAD, 36);
		expect(r.totalScore).toBeGreaterThanOrEqual(14);
		expect(r.riskLevel).toBe("high");
	});

	it("percentile decreases as score increases", () => {
		const low = scoreScale("cbcl", ALL_OK, 36);
		const high = scoreScale("cbcl", ALL_BAD, 36);
		expect(high.percentile).toBeLessThan(low.percentile);
	});

	it("borderline score for cbcl", () => {
		// 5 ones across 10 items = score 5 → borderline (≥ 5)
		const answers: Record<string, AnswerValue> = {};
		const items = itemsForScale("cbcl", 36);
		for (let i = 0; i < 5; i++) answers[items[i]!.id] = 1;
		const r = scoreScale("cbcl", answers, 36);
		expect(r.riskLevel).toBe("borderline");
	});

	it("computes per-domain scores", () => {
		const r = scoreScale("cbcl", ALL_OK, 36);
		expect(Object.keys(r.domainScores).length).toBeGreaterThan(0);
	});

	it("missing answers default to 0", () => {
		const r = scoreScale("cbcl", { "cbcl-1": 2 }, 36);
		expect(r.totalScore).toBe(2);
	});

	it("returns empty domainScores when no items match", () => {
		const r = scoreScale("mchat", {}, 100);
		expect(r.totalScore).toBe(0);
	});

	it("mchat with red-flag items triggers high risk", () => {
		const answers: Record<string, AnswerValue> = {};
		for (const it of itemsForScale("mchat", 18)) {
			answers[it.id] = it.id === "mchat-2" || it.id === "mchat-5" ? 2 : 1;
		}
		const r = scoreScale("mchat", answers, 18);
		expect(r.riskLevel).toBe("high");
	});

	it("asq all-zero is low risk", () => {
		const r = scoreScale("asq", ALL_OK, 36);
		expect(r.riskLevel).toBe("low");
	});

	it("asq all-max is high risk", () => {
		const r = scoreScale("asq", ALL_BAD, 36);
		expect(r.riskLevel).toBe("high");
	});
});

describe("detectRedFlags", () => {
	it("returns empty for all-zero mchat", () => {
		expect(detectRedFlags("mchat", ALL_OK, 18)).toEqual([]);
	});

	it("returns empty for cbcl (no red-flag rules)", () => {
		expect(detectRedFlags("cbcl", ALL_BAD, 36)).toEqual([]);
	});

	it("flags mchat-2 when answered 1+", () => {
		const r = detectRedFlags("mchat", { "mchat-2": 1 }, 18);
		expect(r).toHaveLength(1);
	});

	it("flags mchat-5 when answered 2", () => {
		const r = detectRedFlags("mchat", { "mchat-5": 2 }, 18);
		expect(r).toHaveLength(1);
	});

	it("flags mchat-10 when answered 1+", () => {
		const r = detectRedFlags("mchat", { "mchat-10": 1 }, 18);
		expect(r).toHaveLength(1);
	});

	it("flags multiple critical mchat items", () => {
		const r = detectRedFlags(
			"mchat",
			{ "mchat-2": 2, "mchat-5": 1, "mchat-10": 2 },
			18,
		);
		expect(r).toHaveLength(3);
	});

	it("returns empty for mchat when not in age range", () => {
		const r = detectRedFlags("mchat", { "mchat-2": 1 }, 100);
		expect(r).toEqual([]);
	});
});

describe("formatScreenResult", () => {
	it("renders scale id and risk", () => {
		const r = scoreScale("cbcl", ALL_OK, 36);
		const out = formatScreenResult(r);
		expect(out).toContain("CBCL");
		expect(out).toContain("低风险");
	});

	it("renders high risk marker", () => {
		const r = scoreScale("cbcl", ALL_BAD, 36);
		const out = formatScreenResult(r);
		expect(out).toContain("高风险");
	});

	it("renders red flags when present", () => {
		const answers: Record<string, AnswerValue> = {};
		for (const it of itemsForScale("mchat", 18)) answers[it.id] = 2;
		const r = scoreScale("mchat", answers, 18);
		const out = formatScreenResult(r);
		expect(out).toContain("🚨 红旗项");
	});

	it("renders recommendation", () => {
		const r = scoreScale("cbcl", ALL_OK, 36);
		const out = formatScreenResult(r);
		expect(out).toContain("建议");
	});

	it("renders borderline marker", () => {
		const answers: Record<string, AnswerValue> = {};
		const items = itemsForScale("cbcl", 36);
		for (let i = 0; i < 5; i++) answers[items[i]!.id] = 1;
		const r = scoreScale("cbcl", answers, 36);
		const out = formatScreenResult(r);
		expect(out).toContain("临界");
	});
});

describe("ScreenAgent", () => {
	const agent = createScreenAgent();
	const ctx = {
		memory: null as unknown as import("@parenting/memory").MemoryLayer,
	};

	function makeChild(birthDate: string, stage = "preschool") {
		return {
			id: "c",
			name: "Kid",
			birthDate,
			stage,
		} as never;
	}

	it("mchat intent returns applicable items", async () => {
		const r = await agent.respond(
			"M-CHAT 筛查",
			makeChild("2024-06-19"),
			ctx,
		);
		expect(r.content).toContain("MCHAT");
	});

	it("cbcl intent returns items for valid age", async () => {
		const r = await agent.respond(
			"CBCL 测评",
			makeChild("2023-01-01"),
			ctx,
		);
		expect(r.content).toContain("CBCL");
	});

	it("asq intent returns items", async () => {
		const r = await agent.respond("ASQ 测评", makeChild("2023-06-01"), ctx);
		expect(r.content).toContain("ASQ");
	});

	it("scale intent (generic) returns cbcl by default", async () => {
		const r = await agent.respond(
			"做一个筛查",
			makeChild("2023-01-01"),
			ctx,
		);
		expect(r.content).toContain("CBCL");
	});

	it("score request parses answers and returns result", async () => {
		const answers = Object.fromEntries(
			itemsForScale("cbcl", 36).map((it) => [it.id, 2]),
		);
		const answerStr = Object.entries(answers)
			.map(([k, v]) => `${k}=${v}`)
			.join(" ");
		const r = await agent.respond(answerStr, makeChild("2023-01-01"), ctx);
		expect(r.content).toContain("高风险");
	});

	it("returns intro for general query", async () => {
		const r = await agent.respond("你好", makeChild("2023-01-01"), ctx);
		expect(r.content).toContain("发育筛查");
	});

	it("returns invalid scale-age notice for incompatible age", async () => {
		const r = await agent.respond(
			"M-CHAT 测评",
			makeChild("2020-01-01"),
			ctx,
		);
		expect(r.content).toContain("不在");
	});

	it("ignores parsed answers with unknown scale prefix", async () => {
		// 'xxx-1=2' has no mchat/asq/cbcl prefix → falls through to general
		const r = await agent.respond(
			"xxx-1=2 xxx-2=1",
			makeChild("2023-01-01"),
			ctx,
		);
		// General intro message since unknown scale prefix
		expect(r.content).toContain("发育筛查");
	});

	it("score request with asq-* answers", async () => {
		const r = await agent.respond(
			"asq-comm-1=2 asq-comm-2=1",
			makeChild("2023-01-01"),
			ctx,
		);
		expect(r.content).toContain("筛查结果");
	});

	it("score request with single asq answer routes to asq", async () => {
		const r = await agent.respond(
			"asq-cog-1=2",
			makeChild("2023-01-01"),
			ctx,
		);
		expect(r.content).toContain("ASQ");
	});

	it("score request with single cbcl answer routes to cbcl", async () => {
		const r = await agent.respond("cbcl-3=2", makeChild("2023-01-01"), ctx);
		expect(r.content).toContain("CBCL");
	});

	it("score request with mchat-only answer routes to mchat", async () => {
		const r = await agent.respond(
			"mchat-1=2",
			makeChild("2024-09-19"),
			ctx,
		);
		expect(r.content).toContain("MCHAT");
	});

	it("age 18 months: M-CHAT applicable", async () => {
		const r = await agent.respond("你好", makeChild("2024-11-19"), ctx);
		expect(r.content).toContain("M-CHAT");
	});

	it("score request with cbcl-* answers", async () => {
		const r = await agent.respond(
			"cbcl-1=2 cbcl-2=1",
			makeChild("2023-01-01"),
			ctx,
		);
		expect(r.content).toContain("筛查结果");
	});

	it("empty answer string returns general intro", async () => {
		const r = await agent.respond("", makeChild("2023-01-01"), ctx);
		expect(r.content).toContain("发育筛查");
	});

	it("age 1 month: all scales '不适用此月龄'", async () => {
		const r = await agent.respond("你好", makeChild("2026-05-19"), ctx);
		expect(r.content).toContain("不适用此月龄");
	});
});
