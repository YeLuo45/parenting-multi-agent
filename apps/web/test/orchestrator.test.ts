/**
 * Tests for the in-process web orchestrator factory.
 *
 * The web app runs the real parenting multi-agent stack in the browser via
 * this factory. These tests verify the factory wiring, not the agents
 * themselves (which have their own package-level tests).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWebOrchestrator, listWebAgentIds, type WebOrchestrator } from "../src/index.js";
import type { ChildProfile } from "@parenting/memory";

function makeChild(overrides: Partial<ChildProfile> = {}): ChildProfile {
	return {
		id: "web-test-child",
		name: "Test Kid",
		birthDate: "2024-01-01",
		stage: "toddler",
		...overrides,
	};
}

let stack: WebOrchestrator;
beforeEach(() => {
	stack = createWebOrchestrator();
});
afterEach(() => {
	stack.close();
});

describe("createWebOrchestrator", () => {
	it("registers all 18 specialist agents", () => {
		const agents = stack.orchestrator.listAgents();
		expect(agents.length).toBe(18);
	});

	it("exposes the agent id list for the UI", () => {
		const ids = listWebAgentIds();
		expect(ids).toContain("pediatrician");
		expect(ids).toContain("psychologist");
		expect(ids).toContain("educator");
		expect(ids).toContain("nutritionist");
		expect(ids).toContain("sleep-coach");
		expect(ids).toContain("family-mediator");
		expect(ids).toContain("finance");
		expect(ids).toContain("parent-support");
		expect(ids).toContain("growth-tracker");
		expect(ids).toContain("habit-builder");
		expect(ids).toContain("knowledge-rag");
		expect(ids).toContain("safety-guard");
		expect(ids.length).toBe(18);
	});

	it("starts with no children in the in-memory store", () => {
		expect(stack.listChildren()).toEqual([]);
	});

	it("upsertChild stores and returns the child with stage", () => {
		const child = stack.upsertChild(makeChild({ id: "alice" }));
		expect(child.id).toBe("alice");
		expect(child.stage).toBe("toddler");
		expect(stack.listChildren()).toHaveLength(1);
	});

	it("ask routes a health question to the pediatrician", async () => {
		const child = stack.upsertChild(makeChild({ id: "c1" }));
		const result = await stack.ask(child, "宝宝发烧怎么办");
		expect(result.replies.length).toBeGreaterThan(0);
		const agentIds = result.replies.map((r) => r.agentId);
		expect(agentIds).toContain("pediatrician");
	});

	it("ask escalates L0 emergencies (infant fever)", async () => {
		const child = stack.upsertChild(makeChild({ id: "c2", birthDate: "2026-04-19" }));
		const result = await stack.ask(child, "3 month old baby has fever 39");
		expect(result.emergencyEscalation).toBe(true);
		expect(result.redFlag?.ruleId).toMatch(/R00[123]/);
	});

	it("ask uses the new L4 session for followup support", async () => {
		const child = stack.upsertChild(makeChild({ id: "c3" }));
		const r1 = await stack.ask(child, "宝宝发烧");
		expect(r1.sessionId).toBeDefined();
		const r2 = await stack.orchestrator.askFollowup(r1.sessionId!, "继续问", child);
		expect(r2.sessionId).toBe(r1.sessionId);
	});

	it("multiple stacks are independent", () => {
		const a = createWebOrchestrator();
		const b = createWebOrchestrator();
		a.upsertChild({ id: "x", name: "X", birthDate: "2024-01-01", stage: "toddler" });
		try {
			expect(a.listChildren()).toHaveLength(1);
			expect(b.listChildren()).toHaveLength(0);
		} finally {
			a.close();
			b.close();
		}
	});

	it("close releases the memory layer", () => {
		const s = createWebOrchestrator();
		s.upsertChild({ id: "x", name: "X", birthDate: "2024-01-01", stage: "toddler" });
		s.close();
		// After close, the in-memory layer is empty (data cleared).
		expect(s.listChildren()).toEqual([]);
		expect(s.memory.isClosed).toBe(true);
	});
});
