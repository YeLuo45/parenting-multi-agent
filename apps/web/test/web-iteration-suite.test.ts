import { describe, expect, it } from "vitest";
import {
	buildAcceptanceEvidence,
	buildActionPlanGenerator,
	buildAgentCollaborationExplanation,
	buildAllDirectionsProductHub,
	buildBilingualKnowledgeBase,
	buildClosedLoopEvidenceLedger,
	buildDeliveryReportExport,
	buildE2eDrill,
	buildFamilyProfileCenter,
	buildFamilyTimelineFilters,
	buildFeedbackRepairLoop,
	buildIterationSuite,
	buildLlmProviderConfigForm,
	buildMedicalSafetyEscalation,
	buildMemoryTimeline,
	buildMultiChildContextSwitcher,
	buildOfflineSyncOperations,
	buildParentingClosedLoopPlan,
	buildParentingExecutionCenter,
	buildParentProgressDashboard,
	buildProviderConfigSnapshot,
	buildProviderModeOptions,
	buildReleaseGatePlan,
	buildRuntimeDashboardSnapshot,
	buildSafetyFirstMode,
	buildScenarioPack,
	buildScenarioTemplateLibrary,
	buildScenarioWorkflow,
	buildSyncConflictResolution,
	buildSyncQueueActions,
	buildSyncQueueOperationPlan,
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
		expect(pack[0]).toMatchObject({
			childStage: "toddler",
			agentIds: expect.arrayContaining(["sleep-coach"]),
		});
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
		const workflow = buildScenarioWorkflow(buildScenarioPack()[0], {
			childId: "c1",
			childStage: "toddler",
		});
		expect(workflow.scenarioId).toBe("bedtime-delay");
		expect(workflow.childId).toBe("c1");
		expect(workflow.prompt).toContain("睡前");
		expect(workflow.routePreview.agentIds).toEqual([
			"sleep-coach",
			"psychologist",
			"parent-support",
		]);
		expect(workflow.ready).toBe(true);
	});

	it("builds acceptance evidence from release and e2e state", () => {
		const evidence = buildAcceptanceEvidence({
			tests: 259,
			passed: 259,
			statements: 99.11,
			branches: 95.3,
			assets: 7,
			e2eReady: true,
		});
		expect(evidence.ready).toBe(true);
		expect(evidence.summary).toContain("259/259");
		expect(evidence.items.map((item) => item.id)).toEqual([
			"tests",
			"coverage",
			"build",
			"smoke",
			"e2e",
		]);
	});

	it("builds memory timeline entries from children, facts, episodes, and feedback", () => {
		const timeline = buildMemoryTimeline({
			children: [
				{
					id: "c1",
					name: "C1",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
			],
			facts: [
				{
					id: "f1",
					childId: "c1",
					category: "preference",
					key: "sleep",
					value: {},
					createdAt: "2026-01-01T00:00:00.000Z",
				},
			],
			episodes: [
				{
					id: "e1",
					childId: "c1",
					type: "qa",
					content: {},
					createdAt: "2026-01-01T00:01:00.000Z",
				},
			],
			feedback: [
				{
					id: "fb1",
					childId: "c1",
					episodeId: "e1",
					agentId: "sleep-coach",
					rating: 1,
					createdAt: "2026-01-01T00:02:00.000Z",
				},
			],
		});
		expect(timeline).toHaveLength(4);
		expect(timeline.map((entry) => entry.kind)).toEqual([
			"feedback",
			"episode",
			"fact",
			"child",
		]);
	});

	it("builds sync queue actions for pending and synced states", () => {
		const pending = buildSyncQueueActions({
			total: 2,
			unsynced: 2,
			byTable: { children: 2 },
			byOp: { upsert: 2 },
		});
		expect(pending.status).toBe("pending");
		expect(pending.actions.map((action) => action.id)).toEqual([
			"retry",
			"mark-synced",
			"preview-conflicts",
		]);
		const synced = buildSyncQueueActions({
			total: 2,
			unsynced: 0,
			byTable: {},
			byOp: {},
		});
		expect(synced.status).toBe("synced");
		expect(synced.actions.every((action) => action.enabled)).toBe(false);
	});

	it("builds an E2E drill from child, scenario, and evidence", () => {
		const drill = buildE2eDrill({
			childId: "c1",
			scenarioId: "bedtime-delay",
			evidenceReady: true,
			memoryTimelineCount: 4,
		});
		expect(drill.ready).toBe(true);
		expect(drill.steps.map((step) => step.id)).toEqual([
			"select-child",
			"load-scenario",
			"ask",
			"feedback",
			"evidence",
		]);
	});

	it("builds a runtime dashboard snapshot from real memory and release state", () => {
		const snapshot = buildRuntimeDashboardSnapshot({
			children: [
				{
					id: "c1",
					name: "C1",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
			],
			facts: [
				{
					id: "f1",
					childId: "c1",
					category: "preference",
					key: "sleep",
					value: {},
					createdAt: "2026-01-01T00:00:00.000Z",
				},
			],
			episodes: [
				{
					id: "e1",
					childId: "c1",
					type: "qa",
					content: {},
					createdAt: "2026-01-01T00:01:00.000Z",
				},
			],
			feedback: [
				{
					id: "fb1",
					childId: "c1",
					episodeId: "e1",
					agentId: "sleep-coach",
					rating: 1,
					createdAt: "2026-01-01T00:02:00.000Z",
				},
			],
			deltaStats: {
				total: 3,
				unsynced: 2,
				byTable: { children: 1, facts: 1, feedback: 1 },
				byOp: { upsert: 1, insert: 2 },
			},
			provider: {
				primaryProviderId: "remote",
				fallbackProviderId: "rule-fallback",
				ready: true,
			},
			release: {
				tests: 270,
				passed: 270,
				statements: 99.2,
				branches: 96.1,
				assets: 8,
			},
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
		const plan = buildSyncQueueOperationPlan("retry", {
			total: 4,
			unsynced: 3,
			byTable: { facts: 2, feedback: 1 },
			byOp: { insert: 3 },
		});
		expect(plan.enabled).toBe(true);
		expect(plan.summary).toContain("Retry 3 pending operations");
		expect(plan.affectedTables).toEqual(["facts", "feedback"]);
	});

	it("plans all sync queue operation labels and disabled empty state", () => {
		expect(
			buildSyncQueueOperationPlan("mark-synced", {
				total: 2,
				unsynced: 1,
				byTable: { children: 1 },
				byOp: {},
			}).summary,
		).toContain("Mark synced 1 pending");
		expect(
			buildSyncQueueOperationPlan("preview-conflicts", {
				total: 2,
				unsynced: 1,
				byTable: { children: 1 },
				byOp: {},
			}).summary,
		).toContain("Preview conflicts for 1 pending");
		const empty = buildSyncQueueOperationPlan("retry", {
			total: 2,
			unsynced: 0,
			byTable: {},
			byOp: {},
		});
		expect(empty.enabled).toBe(false);
		expect(empty.summary).toBe("No pending sync operations");
	});

	it("builds provider mode options with one selected mode", () => {
		const options = buildProviderModeOptions({
			primaryProviderId: "remote",
			fallbackProviderId: "rule-fallback",
			ready: false,
		});
		expect(options.map((option) => option.id)).toEqual([
			"fallback",
			"primary",
			"api-health",
		]);
		expect(options.find((option) => option.selected)?.id).toBe("fallback");
		expect(options.find((option) => option.id === "primary")?.enabled).toBe(
			false,
		);
	});

	it("builds primary provider options and fallback-none label", () => {
		const primary = buildProviderModeOptions({
			primaryProviderId: "remote",
			fallbackProviderId: null,
			ready: true,
		});
		expect(primary.find((option) => option.selected)?.id).toBe("primary");
		expect(
			primary.find((option) => option.id === "fallback")?.label,
		).toContain("none");
		expect(
			primary.find((option) => option.id === "api-health")?.label,
		).toContain("ready");
	});

	it("exports delivery evidence as markdown and json text", () => {
		const report = buildDeliveryReportExport({
			proposalId: "P-20260624-008",
			commit: "local",
			acceptance: buildAcceptanceEvidence({
				tests: 270,
				passed: 270,
				statements: 99.2,
				branches: 96.1,
				assets: 8,
				e2eReady: true,
			}),
			drill: buildE2eDrill({
				childId: "c1",
				scenarioId: "bedtime-delay",
				evidenceReady: true,
				memoryTimelineCount: 4,
			}),
			sync: buildSyncQueueActions({
				total: 3,
				unsynced: 0,
				byTable: {},
				byOp: {},
			}),
		});
		expect(report.markdown).toContain("P-20260624-008");
		expect(report.markdown).toContain("270/270 passed");
		expect(JSON.parse(report.json).proposalId).toBe("P-20260624-008");
	});

	it("builds family timeline filters from timeline entries", () => {
		const filters = buildFamilyTimelineFilters([
			{
				id: "c1",
				kind: "child",
				childId: "c1",
				title: "C1",
				createdAt: "2024-01-01",
			},
			{
				id: "fb1",
				kind: "feedback",
				childId: "c1",
				title: "sleep-coach: 1",
				createdAt: "2026-01-01",
			},
			{
				id: "e2",
				kind: "episode",
				childId: "c2",
				title: "qa",
				createdAt: "2026-01-02",
			},
		]);
		expect(filters.childIds).toEqual(["c1", "c2"]);
		expect(filters.kinds).toEqual(["child", "episode", "feedback"]);
		expect(filters.defaultLabel).toBe(
			"3 timeline entries across 2 children",
		);
	});

	it("builds a family profile center with risk and next action", () => {
		const profile = buildFamilyProfileCenter({
			children: [
				{
					id: "c1",
					name: "米粒",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
				{
					id: "c2",
					name: "小树",
					birthDate: "2018-01-01",
					stage: "school_age",
				},
			],
			memory: {
				children: 2,
				facts: 5,
				episodes: 3,
				sessions: 2,
				feedback: 4,
				unsyncedDeltas: 1,
			},
			lastFeedbackRating: -1,
		});
		expect(profile.primaryChildName).toBe("米粒");
		expect(profile.riskLevel).toBe("attention");
		expect(profile.nextBestAction).toContain("复盘");
		expect(profile.highlights).toContain("2 children");
	});

	it("explains multi-agent collaboration routing in human-readable steps", () => {
		const explanation = buildAgentCollaborationExplanation({
			question: "孩子发烧还咳嗽怎么办？",
			scenario: buildScenarioPack().find(
				(scenario) => scenario.id === "food-picky",
			)!,
			selectedAgentIds: [
				"pediatrician",
				"safety-guard",
				"parent-support",
			],
		});
		expect(explanation.primaryAgentId).toBe("pediatrician");
		expect(explanation.steps.map((step) => step.kind)).toEqual([
			"route",
			"consult",
			"merge",
			"guardrail",
		]);
		expect(explanation.summary).toContain("3 agents");
	});

	it("plans offline sync conflict resolution choices without mutating data", () => {
		const plan = buildSyncConflictResolution({
			conflicts: [
				{
					table: "children",
					localUpdatedAt: "2026-01-02",
					remoteUpdatedAt: "2026-01-01",
				},
				{
					table: "facts",
					localUpdatedAt: "2026-01-01",
					remoteUpdatedAt: "2026-01-03",
				},
			],
		});
		expect(plan.totalConflicts).toBe(2);
		expect(plan.choices.map((choice) => choice.id)).toEqual([
			"preview",
			"local-wins",
			"remote-wins",
			"merge-manual",
		]);
		expect(plan.recommendedChoiceId).toBe("merge-manual");
	});

	it("builds a scenario template library grouped by child stage", () => {
		const library = buildScenarioTemplateLibrary(buildScenarioPack());
		expect(library.total).toBe(7);
		expect(
			library.groups.some(
				(group) => group.stage === "toddler" && group.count >= 2,
			),
		).toBe(true);
		expect(library.quickStartPrompts[0]).toContain("孩子");
	});

	it("builds an editable LLM provider config form model", () => {
		const form = buildLlmProviderConfigForm({
			primaryProviderId: "remote",
			fallbackProviderId: "rule-fallback",
			ready: false,
		});
		expect(form.fields.map((field) => field.id)).toEqual([
			"baseUrl",
			"model",
			"apiKey",
			"fallbackProvider",
		]);
		expect(form.testConnection.enabled).toBe(false);
		expect(form.testConnection.reason).toContain("API key");
		expect(
			buildLlmProviderConfigForm({
				primaryProviderId: "remote",
				fallbackProviderId: "rule-fallback",
				ready: true,
			}).testConnection.reason,
		).toBe("Primary provider ready");
	});

	it("builds bilingual knowledge base entries with evidence levels", () => {
		const kb = buildBilingualKnowledgeBase("zh-CN");
		expect(kb.locale).toBe("zh-CN");
		expect(kb.entries.length).toBeGreaterThanOrEqual(6);
		expect(kb.entries[0]).toHaveProperty("evidenceLevel");
		expect(buildBilingualKnowledgeBase("en-US").entries[0].title).not.toBe(
			kb.entries[0].title,
		);
	});

	it("escalates medical and emergency safety boundaries", () => {
		const safe = buildMedicalSafetyEscalation("孩子发烧38度但精神还好");
		const doctor = buildMedicalSafetyEscalation("孩子高烧39度并持续皮疹");
		const urgent = buildMedicalSafetyEscalation("孩子呼吸困难并且嘴唇发紫");
		expect(safe.level).toBe("watch");
		expect(doctor.level).toBe("doctor");
		expect(doctor.matchedSignals).toEqual(
			expect.arrayContaining(["高烧", "39", "持续", "皮疹"]),
		);
		expect(urgent.level).toBe("emergency");
		expect(urgent.disclaimer).toContain("not a medical diagnosis");
	});

	it("combines all eight directions into a product hub snapshot", () => {
		const hub = buildAllDirectionsProductHub({
			children: [
				{
					id: "c1",
					name: "米粒",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
			],
			memory: {
				children: 1,
				facts: 2,
				episodes: 1,
				sessions: 1,
				feedback: 1,
				unsyncedDeltas: 0,
			},
			provider: {
				primaryProviderId: null,
				fallbackProviderId: "rule-fallback",
				ready: false,
			},
			question: "孩子睡前拖延怎么办？",
		});
		expect(hub.sections.map((section) => section.id)).toEqual([
			"family-profile",
			"agent-collaboration",
			"sync-conflicts",
			"scenario-library",
			"llm-provider",
			"acceptance-evidence",
			"knowledge-base",
			"safety-boundary",
		]);
		expect(hub.readyCount).toBe(8);
		expect(hub.summary).toContain("8/8");
	});

	it("builds a parent-facing closed loop from question to next action evidence", () => {
		const loop = buildParentingClosedLoopPlan({
			question: "孩子睡前拖延怎么办？",
			child: { id: "c1", name: "米粒", stage: "toddler" },
			memory: {
				children: 1,
				facts: 3,
				episodes: 2,
				sessions: 4,
				feedback: 1,
				unsyncedDeltas: 2,
			},
			provider: {
				primaryProviderId: null,
				fallbackProviderId: "rule-fallback",
				ready: false,
			},
		});
		expect(loop.stageIds).toEqual([
			"ask",
			"route",
			"answer",
			"practice",
			"record",
			"sync",
		]);
		expect(loop.summary).toContain("6-step closed loop");
		expect(loop.primaryAgentId).toBe("sleep-coach");
		expect(loop.nextAction.label).toContain("开始睡前演练");
		expect(loop.evidence).toEqual(
			expect.arrayContaining([
				"scenario:bedtime-delay",
				"sync:2 pending",
				"provider:rule-fallback",
			]),
		);
	});

	it("covers closed-loop primary provider and clear-sync fallback paths", () => {
		const loop = buildParentingClosedLoopPlan({
			question: "没有匹配标题的青春期压力问题",
			child: { id: "teen", name: "阿宁", stage: "teen" },
			memory: {
				children: 1,
				facts: 1,
				episodes: 0,
				sessions: 0,
				feedback: 0,
				unsyncedDeltas: 0,
			},
			provider: {
				primaryProviderId: null,
				fallbackProviderId: "rule-fallback",
				ready: true,
			},
		});
		expect(loop.primaryAgentId).toBe("psychologist");
		expect(loop.nextAction.label).toBe("开始青春期焦虑演练");
		expect(loop.evidence).toEqual(
			expect.arrayContaining(["sync:clear", "provider:primary"]),
		);
	});

	it("builds the execution center from all seven visible product primitives", () => {
		const input = {
			question: "孩子高烧39度还持续皮疹怎么办？",
			children: [
				{
					id: "c1",
					name: "米粒",
					birthDate: "2024-01-01",
					stage: "toddler" as const,
				},
				{
					id: "c2",
					name: "阿宁",
					birthDate: "2012-01-01",
					stage: "teen" as const,
				},
			],
			selectedChildId: "c1",
			memory: {
				children: 2,
				facts: 5,
				episodes: 4,
				sessions: 3,
				feedback: 2,
				unsyncedDeltas: 3,
			},
			provider: {
				primaryProviderId: null,
				fallbackProviderId: "rule-fallback",
				ready: false,
			},
			lastFeedbackRating: -1,
		};
		const loop = buildParentingClosedLoopPlan({
			question: input.question,
			child: { id: "c1", name: "米粒", stage: "toddler" },
			memory: input.memory,
			provider: input.provider,
		});
		const ledger = buildClosedLoopEvidenceLedger({
			loop,
			feedbackRating: -1,
			synced: false,
		});
		const actionPlan = buildActionPlanGenerator({ loop, days: 7 });
		const repair = buildFeedbackRepairLoop({
			loop,
			feedbackRating: -1,
			reason: "建议太笼统",
		});
		const switcher = buildMultiChildContextSwitcher({
			children: input.children,
			selectedChildId: "c1",
			memory: input.memory,
		});
		const safety = buildSafetyFirstMode(input.question);
		const emergencySafety = buildSafetyFirstMode("孩子呼吸困难意识模糊");
		const sync = buildOfflineSyncOperations({
			unsynced: input.memory.unsyncedDeltas,
			conflicts: 1,
		});
		const progress = buildParentProgressDashboard({
			memory: input.memory,
			recentQuestions: [input.question],
			completedActions: 2,
			pendingActions: 3,
		});
		const emptyProgress = buildParentProgressDashboard({
			memory: { ...input.memory, feedback: 0 },
			recentQuestions: [],
			completedActions: 0,
			pendingActions: 0,
		});
		const center = buildParentingExecutionCenter(input);
		expect(ledger.status).toBe("needs-repair");
		expect(actionPlan.days).toHaveLength(7);
		expect(repair.repairPrompt).toContain("建议太笼统");
		expect(switcher.options).toHaveLength(2);
		expect(safety.mode).toBe("doctor-first");
		expect(emergencySafety.cta).toBe("立即寻求急救支持");
		expect(sync.actions.map((action) => action.id)).toEqual([
			"preview",
			"resolve-conflicts",
			"mark-synced",
			"export-deltas",
		]);
		expect(progress.summary).toContain("3 pending");
		expect(emptyProgress.highFrequencyTopics).toEqual(["暂无高频问题"]);
		expect(emptyProgress.completionRate).toBe(1);
		expect(emptyProgress.nextReview).toBe("先完成一次行动记录");
		expect(center.directionIds).toEqual([
			"evidence-ledger",
			"action-plan",
			"feedback-repair",
			"multi-child",
			"safety-first",
			"offline-sync",
			"parent-progress",
		]);
		expect(center.readyCount).toBe(7);
	});
});
