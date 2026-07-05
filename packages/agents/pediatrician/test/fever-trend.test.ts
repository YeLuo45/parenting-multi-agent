import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import { PediatricianAgent } from "../src/index.js";

describe("PediatricianAgent — fever-trend awareness", () => {
	const agent = new PediatricianAgent();

	function makeMemoryStub(opts: {
		trend: ReturnType<typeof Object> | null;
		readings?: Array<{ type: string; value: number; createdAt: string }>;
	}): import("@parenting/orchestrator").MemoryLayerLike {
		const stub: import("@parenting/orchestrator").MemoryLayerLike = {
			listSymptoms: () =>
				(opts.readings ?? []).map((r, i) => ({
					id: `s${i}`,
					childId: "alice",
					type: r.type as "fever",
					value: r.value,
					createdAt: r.createdAt,
				})) as never,
			computeFeverTrend: () => opts.trend as never,
		};
		return stub;
	}

	const emptyTrend = (
		overrides: Partial<{
			count: number;
			delta: number;
			direction: "rising" | "stable" | "falling" | "unknown";
			durationHours: number;
			actionFlag: "none" | "watch" | "see-doctor" | "urgent";
			min: number;
			max: number;
		}> = {},
	) => ({
		count: overrides.count ?? 0,
		min: overrides.min ?? 0,
		max: overrides.max ?? 0,
		avg: 0,
		delta: overrides.delta ?? 0,
		direction: overrides.direction ?? "unknown",
		durationHours: overrides.durationHours ?? 0,
		actionFlag: overrides.actionFlag ?? "none",
	});

	const child: ChildProfile = {
		id: "c1",
		name: "Test",
		birthDate: "2026-01-01",
		stage: "infant",
	} as never;

	it("appends a fever-trend line to the illness reply when memory has readings", async () => {
		const trend = emptyTrend({
			count: 4,
			delta: -1.5,
			direction: "falling",
			min: 37.5,
			max: 39.0,
		});
		const stub = makeMemoryStub({
			trend,
			readings: [
				{ type: "fever", value: 39.0, createdAt: "2026-06-18T08:00:00Z" },
				{ type: "fever", value: 37.5, createdAt: "2026-06-18T16:00:00Z" },
			],
		});
		const reply = await agent.respond("宝宝发烧了", child, {
			memory: stub,
		});
		expect(reply.content).toContain("体温趋势");
		expect(reply.content).toContain("下降");
	});

	it("does NOT add a trend line when no fever readings exist", async () => {
		const stub = makeMemoryStub({ trend: null });
		const reply = await agent.respond("宝宝发烧了", child, {
			memory: stub,
		});
		expect(reply.content).not.toContain("体温趋势");
	});

	it("escalates urgency when trend actionFlag is 'urgent'", async () => {
		const trend = emptyTrend({
			count: 5,
			delta: 1.0,
			direction: "rising",
			min: 38.0,
			max: 40.5,
			durationHours: 12,
			actionFlag: "urgent",
		});
		const stub = makeMemoryStub({
			trend,
			readings: [
				{
					type: "fever",
					value: 40.5,
					createdAt: "2026-06-18T20:00:00Z",
				},
			],
		});
		const reply = await agent.respond("宝宝发烧了", child, {
			memory: stub,
		});
		expect(reply.urgency).toBe("high");
		expect(reply.content).toContain("立即就医");
	});

	it("uses 'stable' wording when direction is stable and does NOT escalate", async () => {
		const trend = emptyTrend({
			count: 3,
			delta: 0.1,
			direction: "stable",
			min: 38.0,
			max: 38.2,
			durationHours: 4,
			actionFlag: "none",
		});
		const stub = makeMemoryStub({
			trend,
			readings: [{ type: "fever", value: 38.1, createdAt: "2026-06-18T18:00:00Z" }],
		});
		const reply = await agent.respond("宝宝发烧了", child, {
			memory: stub,
		});
		expect(reply.content).toContain("稳定");
		expect(reply.urgency).not.toBe("high");
	});

	it("uses '未知' wording when direction is unknown", async () => {
		const trend = emptyTrend({
			count: 1,
			delta: 0,
			direction: "unknown",
			min: 38.0,
			max: 38.0,
			durationHours: 0,
			actionFlag: "none",
		});
		const stub = makeMemoryStub({
			trend,
			readings: [{ type: "fever", value: 38.0, createdAt: "2026-06-18T18:00:00Z" }],
		});
		const reply = await agent.respond("宝宝发烧了", child, {
			memory: stub,
		});
		expect(reply.content).toContain("未知");
	});

	it("includes '建议就医' when actionFlag is see-doctor", async () => {
		const trend = emptyTrend({
			count: 4,
			delta: 0.6,
			direction: "rising",
			min: 37.8,
			max: 39.4,
			durationHours: 80,
			actionFlag: "see-doctor",
		});
		const stub = makeMemoryStub({
			trend,
			readings: [{ type: "fever", value: 39.4, createdAt: "2026-06-18T20:00:00Z" }],
		});
		const reply = await agent.respond("宝宝发烧了", child, {
			memory: stub,
		});
		expect(reply.content).toContain("建议就医");
	});

	it("includes '持续观察' when actionFlag is watch", async () => {
		const trend = emptyTrend({
			count: 2,
			delta: 0,
			direction: "stable",
			min: 39.6,
			max: 39.6,
			durationHours: 1,
			actionFlag: "watch",
		});
		const stub = makeMemoryStub({
			trend,
			readings: [{ type: "fever", value: 39.6, createdAt: "2026-06-18T20:00:00Z" }],
		});
		const reply = await agent.respond("宝宝发烧了", child, {
			memory: stub,
		});
		expect(reply.content).toContain("持续观察");
	});

	it("returns empty trend line when memory has no computeFeverTrend hook", async () => {
		const stub: import("@parenting/orchestrator").MemoryLayerLike = {};
		const reply = await agent.respond("宝宝发烧了", child, {
			memory: stub,
		});
		expect(reply.content).not.toContain("体温趋势");
	});

	it("returns empty trend line when trend has count=0", async () => {
		const stub = makeMemoryStub({
			trend: emptyTrend({ count: 0, direction: "unknown" }),
		});
		const reply = await agent.respond("宝宝发烧了", child, {
			memory: stub,
		});
		expect(reply.content).not.toContain("体温趋势");
	});
});
