import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { OrchestratorCore, MessageBus, detectTopics } from "../src/index.js";
import { MemoryLayer, computeStage } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply, ChildProfile, ChildStage } from "../src/index.js";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string => {
	const d = new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000);
	return d.toISOString().split("T")[0];
};

const makeChild = (ageDays: number, id: string = "c1", name: string = "TestChild"): ChildProfile => ({
	id,
	name,
	birthDate: daysAgo(ageDays),
	stage: computeStage(daysAgo(ageDays), TODAY),
});

const makeAgent = (overrides: Partial<Agent> = {}): Agent => ({
	id: "test-agent",
	name: "Test Agent",
	topics: ["health", "illness", "development", "sleep", "emotion", "behavior", "education", "school", "family", "nutrition", "vaccine", "finance", "legal", "parent_support"],
	stages: ["newborn", "infant", "toddler", "preschool", "school_age", "tween", "teen", "young_adult"],
	respond: vi.fn(async (q: string) => ({
		agentId: "test-agent",
		agentName: "Test Agent",
		content: `Reply to: ${q}`,
		confidence: 0.8,
	})),
	...overrides,
});

describe("MessageBus", () => {
	it("subscribe + publish delivers events to handler", () => {
		const bus = new MessageBus();
		const handler = vi.fn();
		bus.subscribe(handler);
		bus.publish({ type: "ask_started", question: "x", childId: "c1", at: 1 });
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith({ type: "ask_started", question: "x", childId: "c1", at: 1 });
	});

	it("multiple subscribers all receive event", () => {
		const bus = new MessageBus();
		const h1 = vi.fn();
		const h2 = vi.fn();
		bus.subscribe(h1);
		bus.subscribe(h2);
		bus.publish({ type: "ask_started", question: "x", childId: "c1", at: 1 });
		expect(h1).toHaveBeenCalledTimes(1);
		expect(h2).toHaveBeenCalledTimes(1);
	});

	it("unsubscribe stops delivery", () => {
		const bus = new MessageBus();
		const handler = vi.fn();
		const unsub = bus.subscribe(handler);
		bus.publish({ type: "ask_started", question: "x", childId: "c1", at: 1 });
		unsub();
		bus.publish({ type: "ask_started", question: "y", childId: "c1", at: 2 });
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("subscriber count tracks handlers", () => {
		const bus = new MessageBus();
		expect(bus.subscriberCount).toBe(0);
		const u1 = bus.subscribe(() => {});
		expect(bus.subscriberCount).toBe(1);
		bus.subscribe(() => {});
		expect(bus.subscriberCount).toBe(2);
		u1();
		expect(bus.subscriberCount).toBe(1);
	});

	it("history retains published events up to limit", () => {
		const bus = new MessageBus(3);
		bus.publish({ type: "ask_started", question: "a", childId: "c", at: 1 });
		bus.publish({ type: "ask_started", question: "b", childId: "c", at: 2 });
		bus.publish({ type: "ask_started", question: "c", childId: "c", at: 3 });
		bus.publish({ type: "ask_started", question: "d", childId: "c", at: 4 });
		const h = bus.getHistory();
		expect(h.length).toBe(3);
		expect(h[0].at).toBe(2);
		expect(h[2].at).toBe(4);
	});

	it("getHistory filters by type", () => {
		const bus = new MessageBus();
		bus.publish({ type: "ask_started", question: "a", childId: "c", at: 1 });
		bus.publish({ type: "routing", childId: "c", matchedAgentIds: [], at: 2 });
		bus.publish({ type: "ask_started", question: "b", childId: "c", at: 3 });
		const started = bus.getHistory("ask_started");
		expect(started.length).toBe(2);
	});

	it("clearHistory empties history", () => {
		const bus = new MessageBus();
		bus.publish({ type: "ask_started", question: "a", childId: "c", at: 1 });
		bus.clearHistory();
		expect(bus.getHistory().length).toBe(0);
	});

	it("handler errors don't break bus", () => {
		const bus = new MessageBus();
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		bus.subscribe(() => {
			throw new Error("boom");
		});
		bus.subscribe(vi.fn());
		expect(() => bus.publish({ type: "ask_started", question: "x", childId: "c", at: 1 })).not.toThrow();
		consoleSpy.mockRestore();
	});
});

describe("detectTopics", () => {
	it("detects health keyword in Chinese", () => {
		expect(detectTopics("宝宝最近不太舒服")).toContain("health");
	});

	it("detects illness keyword in English", () => {
		const topics = detectTopics("My baby has a fever and cough");
		expect(topics).toContain("illness");
	});

	it("detects sleep topic", () => {
		expect(detectTopics("宝宝夜醒怎么办")).toContain("sleep");
	});

	it("detects multiple topics", () => {
		const topics = detectTopics("宝宝发烧不肯吃奶一直哭");
		expect(topics.length).toBeGreaterThan(1);
	});

	it("returns empty for unrelated questions", () => {
		const topics = detectTopics("今天天气真好");
		expect(topics).toEqual([]);
	});

	it("deduplicates topics", () => {
		const topics = detectTopics("宝宝发烧了又发烧 fever");
		const unique = new Set(topics);
		expect(topics.length).toBe(unique.size);
	});
});

describe("OrchestratorCore", () => {
	let memory: MemoryLayer;
	let orch: OrchestratorCore;

	beforeEach(() => {
		memory = new MemoryLayer({ dbPath: ":memory:" });
		orch = new OrchestratorCore({ memory });
	});

	afterEach(() => {
		memory.close();
	});

	describe("Registration", () => {
		it("registers an agent", () => {
			const agent = makeAgent({ id: "pediatrician" });
			orch.registerAgent(agent);
			expect(orch.listAgents().length).toBe(1);
			expect(orch.getAgent("pediatrician")?.id).toBe("pediatrician");
		});

		it("unregisters an agent", () => {
			const agent = makeAgent({ id: "test" });
			orch.registerAgent(agent);
			expect(orch.unregisterAgent("test")).toBe(true);
			expect(orch.listAgents().length).toBe(0);
		});

		it("unregister returns false for unknown", () => {
			expect(orch.unregisterAgent("nope")).toBe(false);
		});

		it("getAgent returns undefined for unknown", () => {
			expect(orch.getAgent("nope")).toBeUndefined();
		});

		it("subscribe exposes MessageBus events", () => {
			const handler = vi.fn();
			orch.subscribe(handler);
			orch.busOrFail().publish({ type: "ask_started", question: "x", childId: "c1", at: 1 });
			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe("L0 escalation", () => {
		it("returns immediately on emergency without invoking agents", async () => {
			const agent = makeAgent();
			orch.registerAgent(agent);
			const result = await orch.ask("我家宝宝3个月发烧38.5度", makeChild(90));
			expect(result.emergencyEscalation).toBe(true);
			expect(result.redFlag?.severity).toBe("emergency");
			expect(agent.respond).not.toHaveBeenCalled();
		});

		it("logs emergency episode to memory", async () => {
			orch.registerAgent(makeAgent());
			const child = makeChild(90);
			memory.upsertChild(child);
			await orch.ask("3 month old baby has fever 39", child);
			const eps = memory.getEpisodes(child.id, "qa");
			expect(eps.length).toBe(1);
			expect(eps[0].content.redFlag).toBe(true);
		});

		it("publishes l0_escalation event", async () => {
			orch.registerAgent(makeAgent());
			const events: string[] = [];
			orch.subscribe((e) => events.push(e.type));
			await orch.ask("宝宝3个月发烧40度", makeChild(90));
			expect(events).toContain("l0_escalation");
		});
	});

	describe("Routing", () => {
		it("routes health question to health agent", async () => {
			const pedAgent = makeAgent({ id: "pediatrician", topics: ["health", "illness"] });
			orch.registerAgent(pedAgent);
			await orch.ask("宝宝有点不舒服", makeChild(365 * 5));
			expect(pedAgent.respond).toHaveBeenCalled();
		});

		it("does not route to unrelated agent", async () => {
			const unrelated = makeAgent({ id: "finance", topics: ["finance"] });
			orch.registerAgent(unrelated);
			await orch.ask("宝宝发烧了", makeChild(90));
			expect(unrelated.respond).not.toHaveBeenCalled();
		});

		it("routes to multiple agents when topics overlap", async () => {
			const ped = makeAgent({ id: "pediatrician", topics: ["illness", "health"] });
			const psych = makeAgent({ id: "psychologist", topics: ["emotion", "sleep"] });
			orch.registerAgent(ped);
			orch.registerAgent(psych);
			await orch.ask("宝宝发烧哭闹不肯睡", makeChild(90));
			expect(ped.respond).toHaveBeenCalled();
			expect(psych.respond).toHaveBeenCalled();
		});

		it("respects maxAgentsPerAsk", async () => {
			const a = makeAgent({ id: "a1", topics: ["health", "illness"] });
			const b = makeAgent({ id: "a2", topics: ["health", "illness"] });
			const c = makeAgent({ id: "a3", topics: ["health", "illness"] });
			orch.registerAgent(a);
			orch.registerAgent(b);
			orch.registerAgent(c);
			orch = new OrchestratorCore({ memory, maxAgentsPerAsk: 2 });
			orch.registerAgent(a);
			orch.registerAgent(b);
			orch.registerAgent(c);
			const events: string[] = [];
			orch.subscribe((e) => {
				if (e.type === "routing") events.push(`routing:${e.matchedAgentIds.join(",")}`);
			});
			await orch.ask("宝宝发烧", makeChild(90));
			// last routing event should have at most 2 agents
			const last = events[events.length - 1];
			const ids = last.split(":")[1].split(",");
			expect(ids.length).toBeLessThanOrEqual(2);
		});

		it("alwaysInvoke forces agent invocation", async () => {
			orch = new OrchestratorCore({ memory, alwaysInvoke: ["pediatrician"] });
			const ped = makeAgent({ id: "pediatrician", topics: ["health"] });
			orch.registerAgent(ped);
			// ask about finance, pediatrician should still be called
			await orch.ask("教育金怎么规划", makeChild(365 * 5));
			expect(ped.respond).toHaveBeenCalled();
		});
	});

	describe("Multi-agent coordination", () => {
		it("collects replies from multiple agents", async () => {
			orch.registerAgent(makeAgent({ id: "a1", topics: ["health"] }));
			orch.registerAgent(makeAgent({ id: "a2", topics: ["health"] }));
			const result = await orch.ask("宝宝不舒服", makeChild(90));
			expect(result.replies.length).toBe(2);
		});

		it("filters out low-confidence replies", async () => {
			orch.registerAgent(
				makeAgent({
					id: "low",
					topics: ["health"],
					respond: async () => ({ agentId: "low", agentName: "Low", content: "x", confidence: 0.1 }),
				}),
			);
			orch.registerAgent(
				makeAgent({
					id: "high",
					topics: ["health"],
					respond: async () => ({ agentId: "high", agentName: "High", content: "x", confidence: 0.9 }),
				}),
			);
			orch = new OrchestratorCore({ memory, minConfidence: 0.5 });
			orch.registerAgent(
				makeAgent({
					id: "low",
					topics: ["health"],
					respond: async () => ({ agentId: "low", agentName: "Low", content: "x", confidence: 0.1 }),
				}),
			);
			orch.registerAgent(
				makeAgent({
					id: "high",
					topics: ["health"],
					respond: async () => ({ agentId: "high", agentName: "High", content: "x", confidence: 0.9 }),
				}),
			);
			const result = await orch.ask("宝宝不舒服", makeChild(90));
			expect(result.replies.length).toBe(1);
			expect(result.replies[0].agentId).toBe("high");
		});

		it("handles agent errors gracefully", async () => {
			orch.registerAgent(
				makeAgent({
					id: "broken",
					topics: ["health"],
					respond: async () => {
						throw new Error("agent down");
					},
				}),
			);
			orch.registerAgent(
				makeAgent({
					id: "good",
					topics: ["health"],
					respond: async () => ({ agentId: "good", agentName: "Good", content: "ok", confidence: 0.9 }),
				}),
			);
			orch = new OrchestratorCore({ memory });
			orch.registerAgent(
				makeAgent({
					id: "broken",
					topics: ["health"],
					respond: async () => {
						throw new Error("agent down");
					},
				}),
			);
			orch.registerAgent(
				makeAgent({
					id: "good",
					topics: ["health"],
					respond: async () => ({ agentId: "good", agentName: "Good", content: "ok", confidence: 0.9 }),
				}),
			);
			const result = await orch.ask("宝宝不舒服", makeChild(90));
			expect(result.replies.length).toBe(1);
			expect(result.replies[0].agentId).toBe("good");
		});

		it("records episode to memory", async () => {
			orch.registerAgent(makeAgent({ id: "pediatrician" }));
			const child = makeChild(90);
			memory.upsertChild(child);
			await orch.ask("宝宝不舒服", child);
			const eps = memory.getEpisodes(child.id, "qa");
			expect(eps.length).toBe(1);
			expect(eps[0].content.question).toBe("宝宝不舒服");
		});
	});

	describe("Stage awareness", () => {
		it("prefers agent matching child stage via bonus", async () => {
			const infantOnly = makeAgent({
				id: "infant-only",
				topics: ["health"],
				stages: ["infant"],
			});
			const allStages = makeAgent({
				id: "all-stages",
				topics: ["health"],
				stages: ["newborn", "infant", "toddler", "preschool", "school_age", "tween", "teen", "young_adult"],
			});
			orch = new OrchestratorCore({ memory, maxAgentsPerAsk: 1 });
			orch.registerAgent(infantOnly);
			orch.registerAgent(allStages);
			const events: string[] = [];
			orch.subscribe((e) => {
				if (e.type === "routing") events.push(...e.matchedAgentIds);
			});
			await orch.ask("宝宝不舒服", makeChild(90));
			expect(events).toContain("infant-only");
		});
	});

	describe("Result structure", () => {
		it("includes question, childId, replies, timing", async () => {
			orch.registerAgent(makeAgent({ id: "p" }));
			const child = makeChild(365 * 2);
			const result = await orch.ask("宝宝咳嗽", child);
			expect(result.question).toBe("宝宝咳嗽");
			expect(result.childId).toBe(child.id);
			expect(result.replies.length).toBeGreaterThan(0);
			expect(result.completedAt).toBeGreaterThanOrEqual(result.startedAt);
		});

		it("returns no emergency on normal question", async () => {
			orch.registerAgent(makeAgent({ id: "p" }));
			const result = await orch.ask("宝宝最近挑食怎么办", makeChild(365 * 3));
			expect(result.emergencyEscalation).toBe(false);
		});
	});
});

// Helper to access bus for testing
declare module "../src/orchestrator.js" {
	interface OrchestratorCore {
		busOrFail(): MessageBus;
	}
}
OrchestratorCore.prototype.busOrFail = function (this: OrchestratorCore): MessageBus {
	return (this as unknown as { getBus: () => MessageBus }).getBus();
};
