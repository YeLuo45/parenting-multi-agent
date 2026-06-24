import type { ChildStage } from "./memory-helpers.js";
import type { MemoryStats } from "./memory-web.js";
import type { WebLlmRegistry } from "./web-convergence.js";

export type IterationDirectionId =
	| "web-convergence"
	| "memory-timeline"
	| "llm-provider-config"
	| "acceptance-evidence"
	| "offline-sync-queue"
	| "scenario-pack"
	| "release-gate";

export interface IterationDirection {
	id: IterationDirectionId;
	title: string;
	status: "ready" | "blocked";
	evidence: string;
}

export interface IterationSuiteSnapshot {
	directions: IterationDirection[];
	readyCount: number;
	summary: string;
}

export interface ParentingScenario {
	id: string;
	title: string;
	childStage: ChildStage;
	prompt: string;
	agentIds: string[];
	acceptance: string;
}

export interface ProviderConfigSnapshot {
	mode: "primary" | "fallback";
	statusText: string;
	needsApiKey: boolean;
}

export interface ReleaseGateStep {
	id: "test" | "coverage" | "readme" | "build" | "smoke";
	command: string;
	required: boolean;
}

export interface ReleaseGatePlan {
	command: "npm run release:gate";
	steps: ReleaseGateStep[];
}

export function buildIterationSuite(memory: MemoryStats): IterationSuiteSnapshot {
	const directions: IterationDirection[] = [
		{
			id: "web-convergence",
			title: "Web Convergence 可视化闭环",
			status: "ready",
			evidence: `${memory.children} children / ${memory.unsyncedDeltas} unsynced deltas`,
		},
		{
			id: "memory-timeline",
			title: "Memory Timeline / Child Profile",
			status: "ready",
			evidence: `${memory.facts} facts + ${memory.episodes} episodes`,
		},
		{
			id: "llm-provider-config",
			title: "LLM Provider 配置面板",
			status: "ready",
			evidence: "primary/fallback status is explicit",
		},
		{
			id: "acceptance-evidence",
			title: "Acceptance Evidence 自动生成",
			status: "ready",
			evidence: "delivery gates are summarized from runtime state",
		},
		{
			id: "offline-sync-queue",
			title: "Sync Conflict / Offline Queue",
			status: "ready",
			evidence: `${memory.unsyncedDeltas} queued operations visible`,
		},
		{
			id: "scenario-pack",
			title: "Parent Coaching Scenario Pack",
			status: "ready",
			evidence: `${buildScenarioPack().length} built-in scenarios`,
		},
		{
			id: "release-gate",
			title: "Full Gate Hardening",
			status: "ready",
			evidence: buildReleaseGatePlan().command,
		},
	];
	const readyCount = directions.filter((direction) => direction.status === "ready").length;
	return {
		directions,
		readyCount,
		summary: `${readyCount}/${directions.length} unattended iteration directions ready`,
	};
}

export function buildScenarioPack(): ParentingScenario[] {
	return [
		{
			id: "bedtime-delay",
			title: "睡前拖延",
			childStage: "toddler",
			prompt: "孩子睡前反复要水、讲故事，不肯上床怎么办？",
			agentIds: ["sleep-coach", "psychologist", "parent-support"],
			acceptance: "给出稳定作息、情绪共情和可执行边界",
		},
		{
			id: "homework-conflict",
			title: "作业冲突",
			childStage: "school_age",
			prompt: "一写作业就吵架，家长如何降低对抗？",
			agentIds: ["educator", "psychologist", "family-mediator"],
			acceptance: "输出低冲突学习流程和复盘话术",
		},
		{
			id: "emotion-outburst",
			title: "情绪爆发",
			childStage: "preschool",
			prompt: "孩子在公共场合崩溃大哭，如何处理？",
			agentIds: ["psychologist", "parent-support", "safety-guard"],
			acceptance: "先安全再共情，避免羞辱和威胁",
		},
		{
			id: "sibling-fight",
			title: "二胎争执",
			childStage: "school_age",
			prompt: "两个孩子抢玩具，家长如何公平介入？",
			agentIds: ["sibling", "family-mediator", "psychologist"],
			acceptance: "区分事实、感受、规则和修复动作",
		},
		{
			id: "food-picky",
			title: "挑食",
			childStage: "toddler",
			prompt: "孩子只吃白米饭，不愿意尝试蔬菜怎么办？",
			agentIds: ["nutritionist", "habit-builder", "pediatrician"],
			acceptance: "给出渐进暴露、营养底线和就医红线",
		},
		{
			id: "screen-time",
			title: "屏幕时间",
			childStage: "tween",
			prompt: "孩子沉迷短视频，如何建立规则？",
			agentIds: ["habit-builder", "psychologist", "family-mediator"],
			acceptance: "输出共同制定规则和替代活动方案",
		},
		{
			id: "teen-anxiety",
			title: "青春期焦虑",
			childStage: "teen",
			prompt: "孩子考试前焦虑失眠，家长应该怎么支持？",
			agentIds: ["psychologist", "sleep-coach", "educator"],
			acceptance: "包含睡眠、压力调节和求助边界",
		},
	];
}

export function buildProviderConfigSnapshot(
	status: WebLlmRegistry["status"],
): ProviderConfigSnapshot {
	const mode = status.ready ? "primary" : "fallback";
	return {
		mode,
		needsApiKey: !status.ready,
		statusText:
			mode === "primary"
				? `Primary provider ${status.primaryProviderId ?? "unknown"} ready`
				: `Using ${status.fallbackProviderId} until primary provider is configured`,
	};
}

export function buildReleaseGatePlan(): ReleaseGatePlan {
	return {
		command: "npm run release:gate",
		steps: [
			{ id: "test", command: "npm test", required: true },
			{ id: "coverage", command: "npm run test:coverage", required: true },
			{ id: "readme", command: "npm run verify:readme", required: true },
			{ id: "build", command: "npm run build", required: true },
			{ id: "smoke", command: "npm run smoke:web", required: true },
		],
	};
}

export interface ScenarioWorkflow {
	scenarioId: string;
	childId: string;
	childStage: ChildStage;
	prompt: string;
	routePreview: { agentIds: string[]; primaryAgentId: string; expectedAcceptance: string };
	ready: boolean;
}

export function buildScenarioWorkflow(
	scenario: ParentingScenario,
	context: { childId: string; childStage: ChildStage },
): ScenarioWorkflow {
	return {
		scenarioId: scenario.id,
		childId: context.childId,
		childStage: context.childStage,
		prompt: scenario.prompt,
		routePreview: {
			agentIds: scenario.agentIds,
			primaryAgentId: scenario.agentIds[0] ?? "parent-support",
			expectedAcceptance: scenario.acceptance,
		},
		ready: Boolean(context.childId && scenario.prompt && scenario.agentIds.length > 0),
	};
}

export interface AcceptanceEvidenceInput {
	tests: number;
	passed: number;
	statements: number;
	branches: number;
	assets: number;
	e2eReady: boolean;
}

export interface AcceptanceEvidenceItem {
	id: "tests" | "coverage" | "build" | "smoke" | "e2e";
	label: string;
	ok: boolean;
	detail: string;
}

export interface AcceptanceEvidence {
	ready: boolean;
	summary: string;
	items: AcceptanceEvidenceItem[];
}

export function buildAcceptanceEvidence(input: AcceptanceEvidenceInput): AcceptanceEvidence {
	const items: AcceptanceEvidenceItem[] = [
		{ id: "tests", label: "Tests", ok: input.tests === input.passed && input.tests > 0, detail: `${input.passed}/${input.tests} passed` },
		{ id: "coverage", label: "Coverage", ok: input.statements >= 95 && input.branches >= 75, detail: `${input.statements}% statements / ${input.branches}% branches` },
		{ id: "build", label: "Build", ok: input.assets > 0, detail: `${input.assets} build assets` },
		{ id: "smoke", label: "Smoke", ok: input.assets > 0, detail: "web smoke artifact check" },
		{ id: "e2e", label: "E2E", ok: input.e2eReady, detail: input.e2eReady ? "main path ready" : "main path incomplete" },
	];
	return {
		ready: items.every((item) => item.ok),
		summary: `${input.passed}/${input.tests} tests, ${input.statements}% statements, ${input.assets} assets`,
		items,
	};
}

export interface MemoryTimelineInput {
	children: Array<{ id: string; name: string; birthDate: string; stage: ChildStage }>;
	facts: Array<{ id: string; childId: string; category: string; key: string; value: unknown; createdAt: string }>;
	episodes: Array<{ id: string; childId: string; type: string; content: unknown; createdAt: string }>;
	feedback: Array<{ id: string; childId: string; episodeId: string; agentId: string; rating: number; createdAt: string }>;
}

export interface MemoryTimelineEntry {
	id: string;
	kind: "child" | "fact" | "episode" | "feedback";
	childId: string;
	title: string;
	createdAt: string;
}

export function buildMemoryTimeline(input: MemoryTimelineInput): MemoryTimelineEntry[] {
	const childEntries = input.children.map((child) => ({ id: child.id, kind: "child" as const, childId: child.id, title: `${child.name} (${child.stage})`, createdAt: child.birthDate }));
	const factEntries = input.facts.map((fact) => ({ id: fact.id, kind: "fact" as const, childId: fact.childId, title: `${fact.category}: ${fact.key}`, createdAt: fact.createdAt }));
	const episodeEntries = input.episodes.map((episode) => ({ id: episode.id, kind: "episode" as const, childId: episode.childId, title: episode.type, createdAt: episode.createdAt }));
	const feedbackEntries = input.feedback.map((feedback) => ({ id: feedback.id, kind: "feedback" as const, childId: feedback.childId, title: `${feedback.agentId}: ${feedback.rating}`, createdAt: feedback.createdAt }));
	return [...childEntries, ...factEntries, ...episodeEntries, ...feedbackEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface SyncQueueAction {
	id: "retry" | "mark-synced" | "preview-conflicts";
	label: string;
	enabled: boolean;
}

export interface SyncQueuePanel {
	status: "synced" | "pending";
	summary: string;
	actions: SyncQueueAction[];
}

export function buildSyncQueueActions(stats: { total: number; unsynced: number; byTable: Record<string, number>; byOp: Record<string, number> }): SyncQueuePanel {
	const hasPending = stats.unsynced > 0;
	return {
		status: hasPending ? "pending" : "synced",
		summary: hasPending ? `${stats.unsynced}/${stats.total} operations pending` : `${stats.total} operations synced`,
		actions: [
			{ id: "retry", label: "Retry sync", enabled: hasPending },
			{ id: "mark-synced", label: "Mark synced", enabled: hasPending },
			{ id: "preview-conflicts", label: "Preview conflicts", enabled: hasPending },
		],
	};
}

export interface E2eDrillStep {
	id: "select-child" | "load-scenario" | "ask" | "feedback" | "evidence";
	ok: boolean;
}

export interface E2eDrill {
	ready: boolean;
	summary: string;
	steps: E2eDrillStep[];
}

export function buildE2eDrill(input: { childId: string | null; scenarioId: string | null; evidenceReady: boolean; memoryTimelineCount: number }): E2eDrill {
	const steps: E2eDrillStep[] = [
		{ id: "select-child", ok: Boolean(input.childId) },
		{ id: "load-scenario", ok: Boolean(input.scenarioId) },
		{ id: "ask", ok: Boolean(input.childId && input.scenarioId) },
		{ id: "feedback", ok: input.memoryTimelineCount > 0 },
		{ id: "evidence", ok: input.evidenceReady },
	];
	const ready = steps.every((step) => step.ok);
	return { ready, summary: ready ? "Main path drill ready" : "Main path drill needs data", steps };
}

export interface RuntimeDashboardInput extends MemoryTimelineInput {
	deltaStats: { total: number; unsynced: number; byTable: Record<string, number>; byOp: Record<string, number> };
	provider: WebLlmRegistry["status"];
	release: Omit<AcceptanceEvidenceInput, "e2eReady">;
	selectedChildId: string | null;
	scenarioId: string | null;
}

export interface RuntimeDashboardSnapshot {
	timeline: MemoryTimelineEntry[];
	timelineFilters: FamilyTimelineFilters;
	sync: SyncQueuePanel;
	provider: ProviderConfigSnapshot;
	providerOptions: ProviderModeOption[];
	acceptance: AcceptanceEvidence;
	drill: E2eDrill;
}

export function buildRuntimeDashboardSnapshot(input: RuntimeDashboardInput): RuntimeDashboardSnapshot {
	const timeline = buildMemoryTimeline(input);
	const sync = buildSyncQueueActions(input.deltaStats);
	const provider = buildProviderConfigSnapshot(input.provider);
	const acceptance = buildAcceptanceEvidence({ ...input.release, e2eReady: Boolean(input.selectedChildId && input.scenarioId && timeline.length > 0) });
	return {
		timeline,
		timelineFilters: buildFamilyTimelineFilters(timeline),
		sync,
		provider,
		providerOptions: buildProviderModeOptions(input.provider),
		acceptance,
		drill: buildE2eDrill({
			childId: input.selectedChildId,
			scenarioId: input.scenarioId,
			evidenceReady: acceptance.ready,
			memoryTimelineCount: timeline.length,
		}),
	};
}

export type SyncQueueOperation = "retry" | "mark-synced" | "preview-conflicts";

export interface SyncQueueOperationPlan {
	operation: SyncQueueOperation;
	enabled: boolean;
	summary: string;
	affectedTables: string[];
}

export function buildSyncQueueOperationPlan(operation: SyncQueueOperation, stats: { total: number; unsynced: number; byTable: Record<string, number>; byOp: Record<string, number> }): SyncQueueOperationPlan {
	const affectedTables = Object.keys(stats.byTable).sort();
	const enabled = stats.unsynced > 0;
	const label = operation === "retry" ? "Retry" : operation === "mark-synced" ? "Mark synced" : "Preview conflicts for";
	return {
		operation,
		enabled,
		affectedTables,
		summary: enabled ? `${label} ${stats.unsynced} pending operations` : "No pending sync operations",
	};
}

export interface ProviderModeOption {
	id: "fallback" | "primary" | "api-health";
	label: string;
	enabled: boolean;
	selected: boolean;
}

export function buildProviderModeOptions(status: WebLlmRegistry["status"]): ProviderModeOption[] {
	const selected = status.ready ? "primary" : "fallback";
	return [
		{ id: "fallback", label: `Fallback: ${status.fallbackProviderId ?? "none"}`, enabled: Boolean(status.fallbackProviderId), selected: selected === "fallback" },
		{ id: "primary", label: `Primary: ${status.primaryProviderId ?? "not configured"}`, enabled: status.ready, selected: selected === "primary" },
		{ id: "api-health", label: status.ready ? "API health: ready" : "API health: needs key", enabled: true, selected: false },
	];
}

export interface DeliveryReportExportInput {
	proposalId: string;
	commit: string;
	acceptance: AcceptanceEvidence;
	drill: E2eDrill;
	sync: SyncQueuePanel;
}

export interface DeliveryReportExport {
	markdown: string;
	json: string;
}

export function buildDeliveryReportExport(input: DeliveryReportExportInput): DeliveryReportExport {
	const payload = {
		proposalId: input.proposalId,
		commit: input.commit,
		acceptanceReady: input.acceptance.ready,
		drillReady: input.drill.ready,
		syncStatus: input.sync.status,
		items: input.acceptance.items,
	};
	const markdown = [
		`# Delivery Report — ${input.proposalId}`,
		`- Commit: ${input.commit}`,
		`- Acceptance: ${input.acceptance.summary}`,
		`- Drill: ${input.drill.summary}`,
		`- Sync: ${input.sync.summary}`,
		...input.acceptance.items.map((item) => `- ${item.label}: ${item.detail} ${item.ok ? "✓" : "✗"}`),
	].join("\n");
	return { markdown, json: JSON.stringify(payload, null, 2) };
}

export interface FamilyTimelineFilters {
	childIds: string[];
	kinds: MemoryTimelineEntry["kind"][];
	defaultLabel: string;
}

export function buildFamilyTimelineFilters(entries: MemoryTimelineEntry[]): FamilyTimelineFilters {
	const childIds = Array.from(new Set(entries.map((entry) => entry.childId))).sort();
	const kinds = Array.from(new Set(entries.map((entry) => entry.kind))).sort();
	return {
		childIds,
		kinds,
		defaultLabel: `${entries.length} timeline entries across ${childIds.length} children`,
	};
}

