import { describe, expect, it } from "vitest";
import {
	buildIterationSuite,
	buildScenarioPack,
	buildScenarioWorkflow,
	buildAcceptanceEvidence,
	buildMemoryTimeline,
	buildSyncQueueActions,
	buildE2eDrill,
	buildProviderConfigSnapshot,
	buildReleaseGatePlan,
} from "../src/index.js";

describe("web unattended iteration suite", () => {
	it("summarizes all seven requested iteration directions in ROI order", () => {
		const suite = buildIterationSuite({
			children: 2,
			facts: 4,
			episodes: 3,
			sessions: 1,
			feedback: 2,
			unsyncedDeltas: 1,
		});
		expect(suite.directions.map((direction) => direction.id)).toEqual([
			"web-convergence",
			"memory-timeline",
			"llm-provider-config",
			"acceptance-evidence",
			"offline-sync-queue",
			"scenario-pack",
			"release-gate",
		]);
		expect(suite.readyCount).toBe(7);
		expect(suite.summary).toContain("7/7");
	});

	it("builds a visible scenario pack for common parenting cases", () => {
		const pack = buildScenarioPack();
		expect(pack).toHaveLength(7);
		expect(pack.map((scenario) => scenario.id)).toContain("bedtime-delay");
		expect(pack[0]).toMatchObject({ childStage: "toddler", agentIds: expect.arrayContaining(["sleep-coach"]) });
	});

	it("reports provider readiness and rule fallback without requiring an API key", () => {
		const snapshot = buildProviderConfigSnapshot({
			primaryProviderId: "remote-llm",
			fallbackProviderId: "rule-fallback",
			ready: false,
		});
		expect(snapshot.mode).toBe("fallback");
		expect(snapshot.statusText).toContain("rule-fallback");
		expect(snapshot.needsApiKey).toBe(true);
	});

	it("reports primary provider mode when the configured LLM is ready", () => {
		const snapshot = buildProviderConfigSnapshot({
			primaryProviderId: "remote-llm",
			fallbackProviderId: "rule-fallback",
			ready: true,
		});
		expect(snapshot.mode).toBe("primary");
		expect(snapshot.statusText).toContain("remote-llm");
		expect(snapshot.needsApiKey).toBe(false);
	});

	it("hardens release verification into a single command plan", () => {
		const gate = buildReleaseGatePlan();
		expect(gate.command).toBe("npm run release:gate");
		expect(gate.steps.map((step) => step.id)).toEqual([
			"test",
			"coverage",
			"readme",
			"build",
			"smoke",
		]);
		expect(gate.steps.every((step) => step.required)).toBe(true);
	});

	it("builds scenario workflows with selected child stage and expected routing", () => {
		const workflow = buildScenarioWorkflow(buildScenarioPack()[0], { childId: "c1", childStage: "toddler" });
		expect(workflow.scenarioId).toBe("bedtime-delay");
		expect(workflow.childId).toBe("c1");
		expect(workflow.prompt).toContain("睡前");
		expect(workflow.routePreview.agentIds).toEqual(["sleep-coach", "psychologist", "parent-support"]);
		expect(workflow.ready).toBe(true);
	});

	it("builds acceptance evidence from release and e2e state", () => {
		const evidence = buildAcceptanceEvidence({ tests: 259, passed: 259, statements: 99.11, branches: 95.3, assets: 7, e2eReady: true });
		expect(evidence.ready).toBe(true);
		expect(evidence.summary).toContain("259/259");
		expect(evidence.items.map((item) => item.id)).toEqual(["tests", "coverage", "build", "smoke", "e2e"]);
	});

	it("builds memory timeline entries from children, facts, episodes, and feedback", () => {
		const timeline = buildMemoryTimeline({
			children: [{ id: "c1", name: "C1", birthDate: "2024-01-01", stage: "toddler" }],
			facts: [{ id: "f1", childId: "c1", category: "preference", key: "sleep", value: {}, createdAt: "2026-01-01T00:00:00.000Z" }],
			episodes: [{ id: "e1", childId: "c1", type: "qa", content: {}, createdAt: "2026-01-01T00:01:00.000Z" }],
			feedback: [{ id: "fb1", childId: "c1", episodeId: "e1", agentId: "sleep-coach", rating: 1, createdAt: "2026-01-01T00:02:00.000Z" }],
		});
		expect(timeline).toHaveLength(4);
		expect(timeline.map((entry) => entry.kind)).toEqual(["feedback", "episode", "fact", "child"]);
	});

	it("builds sync queue actions for pending and synced states", () => {
		const pending = buildSyncQueueActions({ total: 2, unsynced: 2, byTable: { children: 2 }, byOp: { upsert: 2 } });
		expect(pending.status).toBe("pending");
		expect(pending.actions.map((action) => action.id)).toEqual(["retry", "mark-synced", "preview-conflicts"]);
		const synced = buildSyncQueueActions({ total: 2, unsynced: 0, byTable: {}, byOp: {} });
		expect(synced.status).toBe("synced");
		expect(synced.actions.every((action) => action.enabled)).toBe(false);
	});

	it("builds an E2E drill from child, scenario, and evidence", () => {
		const drill = buildE2eDrill({ childId: "c1", scenarioId: "bedtime-delay", evidenceReady: true, memoryTimelineCount: 4 });
		expect(drill.ready).toBe(true);
		expect(drill.steps.map((step) => step.id)).toEqual(["select-child", "load-scenario", "ask", "feedback", "evidence"]);
	});

});
