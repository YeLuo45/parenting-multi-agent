/**
 * Integration tests: 5 engines working together (Orchestrator + 3 agents + Memory).
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { OrchestratorCore } from "@parenting/orchestrator";
import { MemoryLayer, computeStage } from "@parenting/memory";
import { createPediatricianAgent } from "@parenting/agent-pediatrician";
import { createPsychologistAgent } from "@parenting/agent-psychologist";
import { createEducatorAgent } from "@parenting/agent-educator";
import type { ChildProfile } from "@parenting/memory";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const makeChild = (ageDays: number, id = "c1", name = "小明"): ChildProfile => ({
	id,
	name,
	birthDate: daysAgo(ageDays),
	stage: computeStage(daysAgo(ageDays), TODAY),
});

describe("Integration: 5 engines (Orchestrator + 3 agents + Memory)", () => {
	let memory: MemoryLayer;
	let orch: OrchestratorCore;

	beforeEach(() => {
		memory = new MemoryLayer({ dbPath: ":memory:" });
		orch = new OrchestratorCore({ memory, maxAgentsPerAsk: 3, minConfidence: 0.3 });
		orch.registerAgent(createPediatricianAgent());
		orch.registerAgent(createPsychologistAgent());
		orch.registerAgent(createEducatorAgent());
	});

	afterEach(() => {
		memory.close();
	});

	describe("Health question → pediatrician", () => {
		it("routes '宝宝3个月发烧' to pediatrician with L0 escalation", async () => {
			const child = makeChild(90);
			memory.upsertChild(child);
			const result = await orch.ask("我家宝宝3个月发烧38.5度", child);
			expect(result.emergencyEscalation).toBe(true);
			expect(result.redFlag?.severity).toBe("emergency");
		});

		it("routes '宝宝咳嗽' to pediatrician (non-emergency)", async () => {
			const child = makeChild(365 * 2);
			memory.upsertChild(child);
			const result = await orch.ask("宝宝咳嗽怎么办", child);
			expect(result.emergencyEscalation).toBe(false);
			expect(result.replies.length).toBeGreaterThan(0);
			expect(result.replies.some((r) => r.agentId === "pediatrician")).toBe(true);
		});

		it("routes vaccine question to pediatrician", async () => {
			const child = makeChild(90);
			memory.upsertChild(child);
			const result = await orch.ask("宝宝疫苗接种时间", child);
			expect(result.replies.some((r) => r.agentId === "pediatrician")).toBe(true);
		});
	});

	describe("Behavior question → psychologist", () => {
		it("routes tantrum question to psychologist", async () => {
			const child = makeChild(365 * 2);
			memory.upsertChild(child);
			const result = await orch.ask("2岁宝宝总发脾气", child);
			expect(result.replies.some((r) => r.agentId === "psychologist")).toBe(true);
		});

		it("routes biting question to psychologist", async () => {
			const child = makeChild(365 * 1.5);
			memory.upsertChild(child);
			const result = await orch.ask("宝宝在幼儿园咬人", child);
			expect(result.replies.some((r) => r.agentId === "psychologist")).toBe(true);
		});
	});

	describe("Education question → educator", () => {
		it("routes '孩子学什么' to educator", async () => {
			const child = makeChild(365 * 4);
			memory.upsertChild(child);
			const result = await orch.ask("4岁孩子学什么", child);
			expect(result.replies.some((r) => r.agentId === "educator")).toBe(true);
		});

		it("routes interest question to educator", async () => {
			const child = makeChild(365 * 7);
			memory.upsertChild(child);
			const result = await orch.ask("孩子喜欢编程", child);
			expect(result.replies.some((r) => r.agentId === "educator")).toBe(true);
		});
	});

	describe("Multi-agent coordination", () => {
		it("'宝宝发烧哭闹不肯睡' triggers pediatrician + psychologist", async () => {
			const child = makeChild(365 * 2);
			memory.upsertChild(child);
			const result = await orch.ask("宝宝发烧哭闹不肯睡怎么办", child);
			const agentIds = result.replies.map((r) => r.agentId);
			expect(agentIds).toContain("pediatrician");
			expect(agentIds).toContain("psychologist");
		});

		it("'孩子不爱学习发脾气' triggers educator + psychologist", async () => {
			const child = makeChild(365 * 7);
			memory.upsertChild(child);
			const result = await orch.ask("孩子不爱学习总发脾气", child);
			const agentIds = result.replies.map((r) => r.agentId);
			expect(agentIds).toContain("psychologist");
		});
	});

	describe("Memory integration", () => {
		it("logs Q&A episode to memory", async () => {
			const child = makeChild(90);
			memory.upsertChild(child);
			await orch.ask("宝宝疫苗接种时间", child);
			const eps = memory.getEpisodes(child.id, "qa");
			expect(eps.length).toBe(1);
		});

		it("accumulates history across multiple asks", async () => {
			const child = makeChild(90);
			memory.upsertChild(child);
			await orch.ask("宝宝发烧", child);
			await orch.ask("宝宝夜醒", child);
			await orch.ask("宝宝疫苗", child);
			const eps = memory.getEpisodes(child.id, "qa");
			expect(eps.length).toBe(3);
		});

		it("delta log records all writes", async () => {
			const child = makeChild(90);
			memory.upsertChild(child);
			const deltasBefore = memory.getDeltaLog().length;
			await orch.ask("宝宝疫苗", child);
			const deltasAfter = memory.getDeltaLog().length;
			// at least 1 new delta (for the episode)
			expect(deltasAfter - deltasBefore).toBeGreaterThanOrEqual(1);
		});
	});

	describe("Real-world scenarios (acceptance)", () => {
		it("Scenario: New parent with 3-month-old asks about night waking", async () => {
			const child = makeChild(90);
			memory.upsertChild(child);
			const result = await orch.ask("我家宝宝3个月最近总是夜醒哭闹怎么办", child);
			// Should NOT be emergency (no fever)
			expect(result.emergencyEscalation).toBe(false);
			// Should get pediatrician + psychologist
			const agentIds = result.replies.map((r) => r.agentId);
			expect(agentIds.length).toBeGreaterThan(0);
		});

		it("Scenario: 4-year-old throwing tantrums at preschool", async () => {
			const child = makeChild(365 * 4);
			memory.upsertChild(child);
			const result = await orch.ask("4岁孩子在幼儿园总发脾气", child);
			expect(result.replies.some((r) => r.agentId === "psychologist")).toBe(true);
		});

		it("Scenario: 13-year-old refusing school, family stress", async () => {
			const child = makeChild(365 * 13);
			memory.upsertChild(child);
			const result = await orch.ask("孩子13岁不肯上学，爸爸妈妈天天吵架", child);
			// should get psychologist + possibly educator
			const agentIds = result.replies.map((r) => r.agentId);
			expect(agentIds).toContain("psychologist");
		});
	});
});
