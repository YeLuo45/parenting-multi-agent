import { describe, expect, it } from "vitest";
import {
	buildIterationSuite,
	buildScenarioPack,
	buildScenarioWorkflow,
	buildAcceptanceEvidence,
	buildMemoryTimeline,
	buildSyncQueueActions,
	buildE2eDrill,
	buildDeliveryReportExport,
	buildFamilyTimelineFilters,
	buildProviderModeOptions,
	buildRuntimeDashboardSnapshot,
	buildSyncQueueOperationPlan,
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

	it("builds a runtime dashboard snapshot from real memory and release state", () => {
		const snapshot = buildRuntimeDashboardSnapshot({
			children: [{ id: "c1", name: "C1", birthDate: "2024-01-01", stage: "toddler" }],
			facts: [{ id: "f1", childId: "c1", category: "preference", key: "sleep", value: {}, createdAt: "2026-01-01T00:00:00.000Z" }],
			episodes: [{ id: "e1", childId: "c1", type: "qa", content: {}, createdAt: "2026-01-01T00:01:00.000Z" }],
			feedback: [{ id: "fb1", childId: "c1", episodeId: "e1", agentId: "sleep-coach", rating: 1, createdAt: "2026-01-01T00:02:00.000Z" }],
			deltaStats: { total: 3, unsynced: 2, byTable: { children: 1, facts: 1, feedback: 1 }, byOp: { upsert: 1, insert: 2 } },
			provider: { primaryProviderId: "remote", fallbackProviderId: "rule-fallback", ready: true },
			release: { tests: 270, passed: 270, statements: 99.2, branches: 96.1, assets: 8 },
			selectedChildId: "c1",
			scenarioId: "bedtime-delay",
		});
		expect(snapshot.timeline).toHaveLength(4);
		expect(snapshot.sync.status).toBe("pending");
		expect(snapshot.provider.mode).toBe("primary");
		expect(snapshot.acceptance.ready).toBe(true);
		expect(snapshot.drill.ready).toBe(true);
	});

	it("plans sync queue operations without mutating the queue", () => {
		const plan = buildSyncQueueOperationPlan("retry", { total: 4, unsynced: 3, byTable: { facts: 2, feedback: 1 }, byOp: { insert: 3 } });
		expect(plan.enabled).toBe(true);
		expect(plan.summary).toContain("Retry 3 pending operations");
		expect(plan.affectedTables).toEqual(["facts", "feedback"]);
	});

	it("plans all sync queue operation labels and disabled empty state", () => {
		expect(buildSyncQueueOperationPlan("mark-synced", { total: 2, unsynced: 1, byTable: { children: 1 }, byOp: {} }).summary).toContain("Mark synced 1 pending");
		expect(buildSyncQueueOperationPlan("preview-conflicts", { total: 2, unsynced: 1, byTable: { children: 1 }, byOp: {} }).summary).toContain("Preview conflicts for 1 pending");
		const empty = buildSyncQueueOperationPlan("retry", { total: 2, unsynced: 0, byTable: {}, byOp: {} });
		expect(empty.enabled).toBe(false);
		expect(empty.summary).toBe("No pending sync operations");
	});

	it("builds provider mode options with one selected mode", () => {
		const options = buildProviderModeOptions({ primaryProviderId: "remote", fallbackProviderId: "rule-fallback", ready: false });
		expect(options.map((option) => option.id)).toEqual(["fallback", "primary", "api-health"]);
		expect(options.find((option) => option.selected)?.id).toBe("fallback");
		expect(options.find((option) => option.id === "primary")?.enabled).toBe(false);
	});

	it("builds primary provider options and fallback-none label", () => {
		const primary = buildProviderModeOptions({ primaryProviderId: "remote", fallbackProviderId: null, ready: true });
		expect(primary.find((option) => option.selected)?.id).toBe("primary");
		expect(primary.find((option) => option.id === "fallback")?.label).toContain("none");
		expect(primary.find((option) => option.id === "api-health")?.label).toContain("ready");
	});

	it("exports delivery evidence as markdown and json text", () => {
		const report = buildDeliveryReportExport({
			proposalId: "P-20260624-008",
			commit: "local",
			acceptance: buildAcceptanceEvidence({ tests: 270, passed: 270, statements: 99.2, branches: 96.1, assets: 8, e2eReady: true }),
			drill: buildE2eDrill({ childId: "c1", scenarioId: "bedtime-delay", evidenceReady: true, memoryTimelineCount: 4 }),
			sync: buildSyncQueueActions({ total: 3, unsynced: 0, byTable: {}, byOp: {} }),
		});
		expect(report.markdown).toContain("P-20260624-008");
		expect(report.markdown).toContain("270/270 passed");
		expect(JSON.parse(report.json).proposalId).toBe("P-20260624-008");
	});

	it("builds family timeline filters from timeline entries", () => {
		const filters = buildFamilyTimelineFilters([
			{ id: "c1", kind: "child", childId: "c1", title: "C1", createdAt: "2024-01-01" },
			{ id: "fb1", kind: "feedback", childId: "c1", title: "sleep-coach: 1", createdAt: "2026-01-01" },
			{ id: "e2", kind: "episode", childId: "c2", title: "qa", createdAt: "2026-01-02" },
		]);
		expect(filters.childIds).toEqual(["c1", "c2"]);
		expect(filters.kinds).toEqual(["child", "episode", "feedback"]);
		expect(filters.defaultLabel).toBe("3 timeline entries across 2 children");
	});

});
