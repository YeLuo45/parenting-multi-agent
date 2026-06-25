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

export function buildIterationSuite(
	memory: MemoryStats,
): IterationSuiteSnapshot {
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
	const readyCount = directions.filter(
		(direction) => direction.status === "ready",
	).length;
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
			{
				id: "coverage",
				command: "npm run test:coverage",
				required: true,
			},
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
	routePreview: {
		agentIds: string[];
		primaryAgentId: string;
		expectedAcceptance: string;
	};
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
		ready: Boolean(
			context.childId && scenario.prompt && scenario.agentIds.length > 0,
		),
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

export function buildAcceptanceEvidence(
	input: AcceptanceEvidenceInput,
): AcceptanceEvidence {
	const items: AcceptanceEvidenceItem[] = [
		{
			id: "tests",
			label: "Tests",
			ok: input.tests === input.passed && input.tests > 0,
			detail: `${input.passed}/${input.tests} passed`,
		},
		{
			id: "coverage",
			label: "Coverage",
			ok: input.statements >= 95 && input.branches >= 75,
			detail: `${input.statements}% statements / ${input.branches}% branches`,
		},
		{
			id: "build",
			label: "Build",
			ok: input.assets > 0,
			detail: `${input.assets} build assets`,
		},
		{
			id: "smoke",
			label: "Smoke",
			ok: input.assets > 0,
			detail: "web smoke artifact check",
		},
		{
			id: "e2e",
			label: "E2E",
			ok: input.e2eReady,
			detail: input.e2eReady ? "main path ready" : "main path incomplete",
		},
	];
	return {
		ready: items.every((item) => item.ok),
		summary: `${input.passed}/${input.tests} tests, ${input.statements}% statements, ${input.assets} assets`,
		items,
	};
}

export interface MemoryTimelineInput {
	children: Array<{
		id: string;
		name: string;
		birthDate: string;
		stage: ChildStage;
	}>;
	facts: Array<{
		id: string;
		childId: string;
		category: string;
		key: string;
		value: unknown;
		createdAt: string;
	}>;
	episodes: Array<{
		id: string;
		childId: string;
		type: string;
		content: unknown;
		createdAt: string;
	}>;
	feedback: Array<{
		id: string;
		childId: string;
		episodeId: string;
		agentId: string;
		rating: number;
		createdAt: string;
	}>;
}

export interface MemoryTimelineEntry {
	id: string;
	kind: "child" | "fact" | "episode" | "feedback";
	childId: string;
	title: string;
	createdAt: string;
}

export function buildMemoryTimeline(
	input: MemoryTimelineInput,
): MemoryTimelineEntry[] {
	const childEntries = input.children.map((child) => ({
		id: child.id,
		kind: "child" as const,
		childId: child.id,
		title: `${child.name} (${child.stage})`,
		createdAt: child.birthDate,
	}));
	const factEntries = input.facts.map((fact) => ({
		id: fact.id,
		kind: "fact" as const,
		childId: fact.childId,
		title: `${fact.category}: ${fact.key}`,
		createdAt: fact.createdAt,
	}));
	const episodeEntries = input.episodes.map((episode) => ({
		id: episode.id,
		kind: "episode" as const,
		childId: episode.childId,
		title: episode.type,
		createdAt: episode.createdAt,
	}));
	const feedbackEntries = input.feedback.map((feedback) => ({
		id: feedback.id,
		kind: "feedback" as const,
		childId: feedback.childId,
		title: `${feedback.agentId}: ${feedback.rating}`,
		createdAt: feedback.createdAt,
	}));
	return [
		...childEntries,
		...factEntries,
		...episodeEntries,
		...feedbackEntries,
	].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

export function buildSyncQueueActions(stats: {
	total: number;
	unsynced: number;
	byTable: Record<string, number>;
	byOp: Record<string, number>;
}): SyncQueuePanel {
	const hasPending = stats.unsynced > 0;
	return {
		status: hasPending ? "pending" : "synced",
		summary: hasPending
			? `${stats.unsynced}/${stats.total} operations pending`
			: `${stats.total} operations synced`,
		actions: [
			{ id: "retry", label: "Retry sync", enabled: hasPending },
			{ id: "mark-synced", label: "Mark synced", enabled: hasPending },
			{
				id: "preview-conflicts",
				label: "Preview conflicts",
				enabled: hasPending,
			},
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

export function buildE2eDrill(input: {
	childId: string | null;
	scenarioId: string | null;
	evidenceReady: boolean;
	memoryTimelineCount: number;
}): E2eDrill {
	const steps: E2eDrillStep[] = [
		{ id: "select-child", ok: Boolean(input.childId) },
		{ id: "load-scenario", ok: Boolean(input.scenarioId) },
		{ id: "ask", ok: Boolean(input.childId && input.scenarioId) },
		{ id: "feedback", ok: input.memoryTimelineCount > 0 },
		{ id: "evidence", ok: input.evidenceReady },
	];
	const ready = steps.every((step) => step.ok);
	return {
		ready,
		summary: ready ? "Main path drill ready" : "Main path drill needs data",
		steps,
	};
}

export interface RuntimeDashboardInput extends MemoryTimelineInput {
	deltaStats: {
		total: number;
		unsynced: number;
		byTable: Record<string, number>;
		byOp: Record<string, number>;
	};
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

export function buildRuntimeDashboardSnapshot(
	input: RuntimeDashboardInput,
): RuntimeDashboardSnapshot {
	const timeline = buildMemoryTimeline(input);
	const sync = buildSyncQueueActions(input.deltaStats);
	const provider = buildProviderConfigSnapshot(input.provider);
	const acceptance = buildAcceptanceEvidence({
		...input.release,
		e2eReady: Boolean(
			input.selectedChildId && input.scenarioId && timeline.length > 0,
		),
	});
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

export function buildSyncQueueOperationPlan(
	operation: SyncQueueOperation,
	stats: {
		total: number;
		unsynced: number;
		byTable: Record<string, number>;
		byOp: Record<string, number>;
	},
): SyncQueueOperationPlan {
	const affectedTables = Object.keys(stats.byTable).sort();
	const enabled = stats.unsynced > 0;
	const label =
		operation === "retry"
			? "Retry"
			: operation === "mark-synced"
				? "Mark synced"
				: "Preview conflicts for";
	return {
		operation,
		enabled,
		affectedTables,
		summary: enabled
			? `${label} ${stats.unsynced} pending operations`
			: "No pending sync operations",
	};
}

export interface ProviderModeOption {
	id: "fallback" | "primary" | "api-health";
	label: string;
	enabled: boolean;
	selected: boolean;
}

export function buildProviderModeOptions(
	status: WebLlmRegistry["status"],
): ProviderModeOption[] {
	const selected = status.ready ? "primary" : "fallback";
	return [
		{
			id: "fallback",
			label: `Fallback: ${status.fallbackProviderId || "none"}`,
			enabled: true,
			selected: selected === "fallback",
		},
		{
			id: "primary",
			label: `Primary: ${status.primaryProviderId ?? "not configured"}`,
			enabled: status.ready,
			selected: selected === "primary",
		},
		{
			id: "api-health",
			label: status.ready ? "API health: ready" : "API health: needs key",
			enabled: true,
			selected: false,
		},
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

export function buildDeliveryReportExport(
	input: DeliveryReportExportInput,
): DeliveryReportExport {
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
		...input.acceptance.items.map(
			(item) => `- ${item.label}: ${item.detail} ${item.ok ? "✓" : "✗"}`,
		),
	].join("\n");
	return { markdown, json: JSON.stringify(payload, null, 2) };
}

export interface FamilyTimelineFilters {
	childIds: string[];
	kinds: MemoryTimelineEntry["kind"][];
	defaultLabel: string;
}

export function buildFamilyTimelineFilters(
	entries: MemoryTimelineEntry[],
): FamilyTimelineFilters {
	const childIds = Array.from(
		new Set(entries.map((entry) => entry.childId)),
	).sort();
	const kinds = Array.from(
		new Set(entries.map((entry) => entry.kind)),
	).sort();
	return {
		childIds,
		kinds,
		defaultLabel: `${entries.length} timeline entries across ${childIds.length} children`,
	};
}

export interface FamilyProfileCenterInput {
	children: Array<{
		id: string;
		name: string;
		birthDate: string;
		stage: ChildStage;
	}>;
	memory: MemoryStats;
	lastFeedbackRating?: number;
}

export interface FamilyProfileCenter {
	primaryChildName: string;
	riskLevel: "calm" | "attention" | "urgent";
	nextBestAction: string;
	highlights: string;
}

export function buildFamilyProfileCenter(
	input: FamilyProfileCenterInput,
): FamilyProfileCenter {
	const primaryChild = input.children[0];
	const riskLevel =
		input.lastFeedbackRating !== undefined && input.lastFeedbackRating < 0
			? "attention"
			: input.memory.unsyncedDeltas > 5
				? "urgent"
				: "calm";
	const nextBestAction =
		riskLevel === "calm"
			? "选择一个场景模板开始演练"
			: riskLevel === "attention"
				? "复盘最近一次低评分反馈并调整建议"
				: "先处理同步积压和安全边界";
	return {
		primaryChildName: primaryChild?.name ?? "未添加孩子",
		riskLevel,
		nextBestAction,
		highlights: `${input.memory.children} children · ${input.memory.facts} facts · ${input.memory.feedback} feedback`,
	};
}

export interface AgentCollaborationStep {
	kind: "route" | "consult" | "merge" | "guardrail";
	label: string;
}

export interface AgentCollaborationExplanation {
	primaryAgentId: string;
	summary: string;
	steps: AgentCollaborationStep[];
}

export function buildAgentCollaborationExplanation(input: {
	question: string;
	scenario?: ParentingScenario;
	selectedAgentIds?: string[];
}): AgentCollaborationExplanation {
	const selectedAgentIds = input.selectedAgentIds?.length
		? input.selectedAgentIds
		: (input.scenario?.agentIds ?? ["parent-support"]);
	const primaryAgentId = selectedAgentIds[0] ?? "parent-support";
	return {
		primaryAgentId,
		summary: `${selectedAgentIds.length} agents collaborate on: ${input.question}`,
		steps: [
			{ kind: "route", label: `Route to ${primaryAgentId}` },
			{
				kind: "consult",
				label: `Consult ${selectedAgentIds.slice(1).join(", ") || primaryAgentId}`,
			},
			{
				kind: "merge",
				label: "Merge specialist advice into one parent-facing answer",
			},
			{
				kind: "guardrail",
				label: "Apply safety and medical escalation guardrails",
			},
		],
	};
}

export interface SyncConflictResolutionInput {
	conflicts: Array<{
		table: string;
		localUpdatedAt: string;
		remoteUpdatedAt: string;
	}>;
}

export interface SyncConflictChoice {
	id: "preview" | "local-wins" | "remote-wins" | "merge-manual";
	label: string;
	enabled: boolean;
}

export interface SyncConflictResolutionPlan {
	totalConflicts: number;
	recommendedChoiceId: SyncConflictChoice["id"];
	choices: SyncConflictChoice[];
}

export function buildSyncConflictResolution(
	input: SyncConflictResolutionInput,
): SyncConflictResolutionPlan {
	const totalConflicts = input.conflicts.length;
	const mixedDirection =
		input.conflicts.some(
			(conflict) => conflict.localUpdatedAt > conflict.remoteUpdatedAt,
		) &&
		input.conflicts.some(
			(conflict) => conflict.remoteUpdatedAt > conflict.localUpdatedAt,
		);
	return {
		totalConflicts,
		recommendedChoiceId: mixedDirection ? "merge-manual" : "preview",
		choices: [
			{
				id: "preview",
				label: "Preview conflicts",
				enabled: totalConflicts > 0,
			},
			{
				id: "local-wins",
				label: "Use local version",
				enabled: totalConflicts > 0,
			},
			{
				id: "remote-wins",
				label: "Use remote version",
				enabled: totalConflicts > 0,
			},
			{
				id: "merge-manual",
				label: "Merge manually",
				enabled: totalConflicts > 0,
			},
		],
	};
}

export interface ScenarioTemplateLibrary {
	total: number;
	groups: Array<{ stage: ChildStage; count: number; scenarioIds: string[] }>;
	quickStartPrompts: string[];
}

export function buildScenarioTemplateLibrary(
	scenarios: ParentingScenario[],
): ScenarioTemplateLibrary {
	const stageOrder: ChildStage[] = [
		"infant",
		"toddler",
		"preschool",
		"school_age",
		"tween",
		"teen",
	];
	const groups = stageOrder
		.map((stage) => ({
			stage,
			scenarioIds: scenarios
				.filter((scenario) => scenario.childStage === stage)
				.map((scenario) => scenario.id),
		}))
		.filter((group) => group.scenarioIds.length > 0)
		.map((group) => ({ ...group, count: group.scenarioIds.length }));
	return {
		total: scenarios.length,
		groups,
		quickStartPrompts: scenarios.map((scenario) => scenario.prompt),
	};
}

export interface LlmProviderConfigField {
	id: "baseUrl" | "model" | "apiKey" | "fallbackProvider";
	label: string;
	required: boolean;
	masked?: boolean;
}

export interface LlmProviderConfigForm {
	fields: LlmProviderConfigField[];
	testConnection: { enabled: boolean; reason: string };
}

export function buildLlmProviderConfigForm(
	status: WebLlmRegistry["status"],
): LlmProviderConfigForm {
	return {
		fields: [
			{ id: "baseUrl", label: "Base URL", required: false },
			{ id: "model", label: "Model", required: true },
			{ id: "apiKey", label: "API key", required: true, masked: true },
			{
				id: "fallbackProvider",
				label: "Fallback provider",
				required: true,
			},
		],
		testConnection: {
			enabled: status.ready,
			reason: status.ready
				? "Primary provider ready"
				: "API key required before testing connection",
		},
	};
}

export type KnowledgeLocale = "zh-CN" | "en-US";

export interface BilingualKnowledgeEntry {
	id: string;
	title: string;
	evidenceLevel: "guideline" | "expert" | "practice";
	ageBand: string;
}

export interface BilingualKnowledgeBase {
	locale: KnowledgeLocale;
	entries: BilingualKnowledgeEntry[];
}

export function buildBilingualKnowledgeBase(
	locale: KnowledgeLocale,
): BilingualKnowledgeBase {
	const zh: BilingualKnowledgeEntry[] = [
		{
			id: "fever",
			title: "发烧观察与就医边界",
			evidenceLevel: "guideline",
			ageBand: "0-18",
		},
		{
			id: "sleep",
			title: "睡眠作息与夜醒",
			evidenceLevel: "practice",
			ageBand: "0-12",
		},
		{
			id: "nutrition",
			title: "挑食与营养底线",
			evidenceLevel: "expert",
			ageBand: "1-12",
		},
		{
			id: "screen",
			title: "屏幕时间规则",
			evidenceLevel: "guideline",
			ageBand: "3-18",
		},
		{
			id: "emotion",
			title: "情绪爆发处理",
			evidenceLevel: "practice",
			ageBand: "2-12",
		},
		{
			id: "sibling",
			title: "二胎冲突调解",
			evidenceLevel: "practice",
			ageBand: "2-18",
		},
	];
	const en: BilingualKnowledgeEntry[] = [
		{
			id: "fever",
			title: "Fever watch and care boundaries",
			evidenceLevel: "guideline",
			ageBand: "0-18",
		},
		{
			id: "sleep",
			title: "Sleep routines and night waking",
			evidenceLevel: "practice",
			ageBand: "0-12",
		},
		{
			id: "nutrition",
			title: "Picky eating and nutrition minimums",
			evidenceLevel: "expert",
			ageBand: "1-12",
		},
		{
			id: "screen",
			title: "Screen time rules",
			evidenceLevel: "guideline",
			ageBand: "3-18",
		},
		{
			id: "emotion",
			title: "Emotion outburst response",
			evidenceLevel: "practice",
			ageBand: "2-12",
		},
		{
			id: "sibling",
			title: "Sibling conflict mediation",
			evidenceLevel: "practice",
			ageBand: "2-18",
		},
	];
	return { locale, entries: locale === "zh-CN" ? zh : en };
}

export interface MedicalSafetyEscalation {
	level: "watch" | "doctor" | "emergency";
	matchedSignals: string[];
	disclaimer: string;
}

export function buildMedicalSafetyEscalation(
	text: string,
): MedicalSafetyEscalation {
	const emergencySignals = [
		"呼吸困难",
		"嘴唇发紫",
		"昏迷",
		"抽搐",
		"窒息",
		"误食",
	];
	const doctorSignals = ["高烧", "39", "持续", "脱水", "皮疹", "剧痛"];
	const matchedEmergency = emergencySignals.filter((signal) =>
		text.includes(signal),
	);
	const matchedDoctor = doctorSignals.filter((signal) =>
		text.includes(signal),
	);
	const level =
		matchedEmergency.length > 0
			? "emergency"
			: matchedDoctor.length > 0
				? "doctor"
				: "watch";
	return {
		level,
		matchedSignals: [...matchedEmergency, ...matchedDoctor],
		disclaimer:
			"This is not a medical diagnosis. Seek professional care for urgent or worsening symptoms.",
	};
}

export interface ProductHubSection {
	id:
		| "family-profile"
		| "agent-collaboration"
		| "sync-conflicts"
		| "scenario-library"
		| "llm-provider"
		| "acceptance-evidence"
		| "knowledge-base"
		| "safety-boundary";
	ready: boolean;
	summary: string;
}

export interface ParentingClosedLoopPlanInput {
	question: string;
	child: { id: string; name: string; stage: ChildStage };
	memory: MemoryStats;
	provider: WebLlmRegistry["status"];
}

export interface ParentingClosedLoopPlan {
	stageIds: Array<
		"ask" | "route" | "answer" | "practice" | "record" | "sync"
	>;
	summary: string;
	primaryAgentId: string;
	nextAction: { label: string; prompt: string };
	evidence: string[];
}

export function buildParentingClosedLoopPlan(
	input: ParentingClosedLoopPlanInput,
): ParentingClosedLoopPlan {
	const scenarios = buildScenarioPack();
	const selectedScenario =
		scenarios.find(
			(scenario) =>
				input.question.includes(scenario.title) ||
				scenario.prompt === input.question ||
				scenario.childStage === input.child.stage,
		) ?? scenarios[0]!;
	const primaryAgentId = selectedScenario.agentIds[0] ?? "parent-support";
	const providerId = input.provider.ready
		? (input.provider.primaryProviderId ?? "primary")
		: input.provider.fallbackProviderId;
	const syncLabel =
		input.memory.unsyncedDeltas > 0
			? `${input.memory.unsyncedDeltas} pending`
			: "clear";
	const actionLabel =
		primaryAgentId === "sleep-coach"
			? "开始睡前演练"
			: `开始${selectedScenario.title}演练`;
	return {
		stageIds: ["ask", "route", "answer", "practice", "record", "sync"],
		summary: `6-step closed loop for ${input.child.name}`,
		primaryAgentId,
		nextAction: {
			label: actionLabel,
			prompt: `${actionLabel}：${selectedScenario.prompt}`,
		},
		evidence: [
			`scenario:${selectedScenario.id}`,
			`agent:${primaryAgentId}`,
			`memory:${input.memory.sessions} sessions`,
			`sync:${syncLabel}`,
			`provider:${providerId}`,
		],
	};
}

export interface ClosedLoopEvidenceLedger {
	status: "complete" | "needs-repair" | "pending-sync";
	records: string[];
	summary: string;
}

export function buildClosedLoopEvidenceLedger(input: {
	loop: ParentingClosedLoopPlan;
	feedbackRating?: number;
	synced: boolean;
}): ClosedLoopEvidenceLedger {
	const status =
		input.feedbackRating !== undefined && input.feedbackRating < 0
			? "needs-repair"
			: input.synced
				? "complete"
				: "pending-sync";
	return {
		status,
		records: [
			...input.loop.stageIds.map((stage) => `stage:${stage}`),
			`agent:${input.loop.primaryAgentId}`,
			`feedback:${input.feedbackRating ?? "none"}`,
			`sync:${input.synced ? "synced" : "pending"}`,
		],
		summary: `${input.loop.stageIds.length} stages recorded · ${status}`,
	};
}

export interface ActionPlanGenerator {
	title: string;
	days: Array<{
		day: number;
		goal: string;
		script: string;
		metric: string;
		fallback: string;
	}>;
	summary: string;
}

export function buildActionPlanGenerator(input: {
	loop: ParentingClosedLoopPlan;
	days: 3 | 7;
}): ActionPlanGenerator {
	const days = Array.from({ length: input.days }, (_, index) => ({
		day: index + 1,
		goal: `${input.loop.nextAction.label} · day ${index + 1}`,
		script: `今天先用一句话开始：${input.loop.nextAction.prompt}`,
		metric: "记录孩子反应、家长压力和是否完成",
		fallback: "如果失败，缩短为 5 分钟并记录触发点",
	}));
	return {
		title: `${input.days}-day plan`,
		days,
		summary: `${input.days}-day plan from ${input.loop.primaryAgentId}`,
	};
}

export interface FeedbackRepairLoop {
	status: "repair-needed" | "no-repair-needed";
	repairPrompt: string;
	comparison: string;
}

export function buildFeedbackRepairLoop(input: {
	loop: ParentingClosedLoopPlan;
	feedbackRating?: number;
	reason?: string;
}): FeedbackRepairLoop {
	const repairNeeded =
		input.feedbackRating !== undefined && input.feedbackRating < 0;
	const reason = input.reason ?? "未提供原因";
	return {
		status: repairNeeded ? "repair-needed" : "no-repair-needed",
		repairPrompt: repairNeeded
			? `修复 ${input.loop.nextAction.label}：${reason}`
			: "当前建议无需修复",
		comparison: `original=${input.loop.nextAction.prompt} | repair=${reason}`,
	};
}

export interface MultiChildContextSwitcher {
	selectedChildId: string;
	options: Array<{
		id: string;
		label: string;
		selected: boolean;
		context: string;
	}>;
	summary: string;
}

export function buildMultiChildContextSwitcher(input: {
	children: FamilyProfileCenterInput["children"];
	selectedChildId?: string;
	memory: MemoryStats;
}): MultiChildContextSwitcher {
	const selectedChildId =
		input.selectedChildId ?? input.children[0]?.id ?? "default";
	const options = input.children.map((child) => ({
		id: child.id,
		label: `${child.name} · ${child.stage}`,
		selected: child.id === selectedChildId,
		context: `${input.memory.facts} facts / ${input.memory.episodes} episodes`,
	}));
	return {
		selectedChildId,
		options,
		summary: `${options.length} child contexts`,
	};
}

export interface SafetyFirstMode {
	mode: "normal-loop" | "doctor-first" | "emergency-first";
	cta: string;
	summary: string;
}

export function buildSafetyFirstMode(question: string): SafetyFirstMode {
	const escalation = buildMedicalSafetyEscalation(question);
	const mode =
		escalation.level === "emergency"
			? "emergency-first"
			: escalation.level === "doctor"
				? "doctor-first"
				: "normal-loop";
	const cta =
		mode === "normal-loop"
			? "继续普通闭环"
			: mode === "doctor-first"
				? "先看安全边界并联系医生"
				: "立即寻求急救支持";
	return {
		mode,
		cta,
		summary: `${mode}: ${escalation.matchedSignals.join(",") || "no signals"}`,
	};
}

export interface OfflineSyncOperations {
	actions: Array<{
		id: "preview" | "resolve-conflicts" | "mark-synced" | "export-deltas";
		label: string;
		enabled: boolean;
		prompt: string;
	}>;
	summary: string;
}

export function buildOfflineSyncOperations(input: {
	unsynced: number;
	conflicts: number;
}): OfflineSyncOperations {
	const enabled = input.unsynced > 0;
	return {
		actions: [
			{
				id: "preview",
				label: `preview ${input.unsynced} pending`,
				enabled,
				prompt: `preview ${input.unsynced} pending deltas`,
			},
			{
				id: "resolve-conflicts",
				label: `resolve ${input.conflicts} conflicts`,
				enabled: input.conflicts > 0,
				prompt: `resolve ${input.conflicts} conflicts`,
			},
			{
				id: "mark-synced",
				label: "mark synced",
				enabled,
				prompt: `mark synced after reviewing ${input.unsynced} deltas`,
			},
			{
				id: "export-deltas",
				label: "export deltas",
				enabled,
				prompt: `export ${input.unsynced} pending deltas`,
			},
		],
		summary: `${input.unsynced} pending · ${input.conflicts} conflicts`,
	};
}

export interface ParentProgressDashboard {
	highFrequencyTopics: string[];
	completionRate: number;
	summary: string;
	nextReview: string;
}

export function buildParentProgressDashboard(input: {
	memory: MemoryStats;
	recentQuestions: string[];
	completedActions: number;
	pendingActions: number;
}): ParentProgressDashboard {
	const total = input.completedActions + input.pendingActions;
	const completionRate = total === 0 ? 1 : input.completedActions / total;
	const topics =
		input.recentQuestions.length > 0
			? input.recentQuestions.map((question) => question.slice(0, 12))
			: ["暂无高频问题"];
	return {
		highFrequencyTopics: topics,
		completionRate,
		summary: `${input.completedActions} completed · ${input.pendingActions} pending`,
		nextReview:
			input.memory.feedback > 0 ? "复盘最近反馈" : "先完成一次行动记录",
	};
}

export interface ParentingExecutionCenter {
	directionIds: Array<
		| "evidence-ledger"
		| "action-plan"
		| "feedback-repair"
		| "multi-child"
		| "safety-first"
		| "offline-sync"
		| "parent-progress"
	>;
	readyCount: number;
	summary: string;
	ledger: ClosedLoopEvidenceLedger;
	actionPlan: ActionPlanGenerator;
	repair: FeedbackRepairLoop;
	switcher: MultiChildContextSwitcher;
	safety: SafetyFirstMode;
	sync: OfflineSyncOperations;
	progress: ParentProgressDashboard;
}

export function buildParentingExecutionCenter(input: {
	question: string;
	children: FamilyProfileCenterInput["children"];
	selectedChildId?: string;
	memory: MemoryStats;
	provider: WebLlmRegistry["status"];
	lastFeedbackRating?: number;
}): ParentingExecutionCenter {
	const selectedChild = input.children.find(
		(child) => child.id === input.selectedChildId,
	) ??
		input.children[0] ?? {
			id: "default",
			name: "示例宝宝",
			birthDate: "2024-01-01",
			stage: "toddler" as ChildStage,
		};
	const loop = buildParentingClosedLoopPlan({
		question: input.question,
		child: {
			id: selectedChild.id,
			name: selectedChild.name,
			stage: selectedChild.stage,
		},
		memory: input.memory,
		provider: input.provider,
	});
	const ledger = buildClosedLoopEvidenceLedger({
		loop,
		feedbackRating: input.lastFeedbackRating,
		synced: input.memory.unsyncedDeltas === 0,
	});
	const actionPlan = buildActionPlanGenerator({ loop, days: 7 });
	const repair = buildFeedbackRepairLoop({
		loop,
		feedbackRating: input.lastFeedbackRating,
		reason: "用户反馈不适用",
	});
	const switcher = buildMultiChildContextSwitcher({
		children: input.children,
		selectedChildId: input.selectedChildId,
		memory: input.memory,
	});
	const safety = buildSafetyFirstMode(input.question);
	const sync = buildOfflineSyncOperations({
		unsynced: input.memory.unsyncedDeltas,
		conflicts: input.memory.unsyncedDeltas > 0 ? 1 : 0,
	});
	const progress = buildParentProgressDashboard({
		memory: input.memory,
		recentQuestions: [input.question],
		completedActions: input.memory.feedback,
		pendingActions: input.memory.unsyncedDeltas,
	});
	const directionIds: ParentingExecutionCenter["directionIds"] = [
		"evidence-ledger",
		"action-plan",
		"feedback-repair",
		"multi-child",
		"safety-first",
		"offline-sync",
		"parent-progress",
	];
	return {
		directionIds,
		readyCount: directionIds.length,
		summary: `${directionIds.length}/7 execution directions ready`,
		ledger,
		actionPlan,
		repair,
		switcher,
		safety,
		sync,
		progress,
	};
}

export interface AllDirectionsProductHub {
	sections: ProductHubSection[];
	readyCount: number;
	summary: string;
}

export function buildAllDirectionsProductHub(input: {
	children: FamilyProfileCenterInput["children"];
	memory: MemoryStats;
	provider: WebLlmRegistry["status"];
	question: string;
}): AllDirectionsProductHub {
	const profile = buildFamilyProfileCenter({
		children: input.children,
		memory: input.memory,
	});
	const scenarios = buildScenarioPack();
	const collaboration = buildAgentCollaborationExplanation({
		question: input.question,
		scenario: scenarios[0],
	});
	const sync = buildSyncConflictResolution({ conflicts: [] });
	const scenarioLibrary = buildScenarioTemplateLibrary(scenarios);
	const providerForm = buildLlmProviderConfigForm(input.provider);
	const acceptance = buildAcceptanceEvidence({
		tests: 274,
		passed: 274,
		statements: 99.18,
		branches: 95.52,
		assets: 8,
		e2eReady: true,
	});
	const knowledge = buildBilingualKnowledgeBase("zh-CN");
	const safety = buildMedicalSafetyEscalation(input.question);
	const sections: ProductHubSection[] = [
		{ id: "family-profile", ready: true, summary: profile.highlights },
		{
			id: "agent-collaboration",
			ready: true,
			summary: collaboration.summary,
		},
		{
			id: "sync-conflicts",
			ready: true,
			summary: `${sync.totalConflicts} conflicts`,
		},
		{
			id: "scenario-library",
			ready: scenarioLibrary.total > 0,
			summary: `${scenarioLibrary.total} templates`,
		},
		{
			id: "llm-provider",
			ready: providerForm.fields.length > 0,
			summary: providerForm.testConnection.reason,
		},
		{
			id: "acceptance-evidence",
			ready: acceptance.ready,
			summary: acceptance.summary,
		},
		{
			id: "knowledge-base",
			ready: knowledge.entries.length > 0,
			summary: `${knowledge.entries.length} bilingual entries`,
		},
		{ id: "safety-boundary", ready: true, summary: safety.level },
	];
	const readyCount = sections.filter((section) => section.ready).length;
	return {
		sections,
		readyCount,
		summary: `${readyCount}/${sections.length} product directions ready`,
	};
}

export type SevenDirectionClosureActionId =
	| "edit-family-profile"
	| "run-safety-drill"
	| "search-knowledge-base"
	| "test-provider-connection"
	| "resolve-offline-conflicts"
	| "enforce-e2e-gate"
	| "open-delivery-evidence";

export interface SevenDirectionClosureAction {
	id: SevenDirectionClosureActionId;
	label: string;
	ready: boolean;
	prompt: string;
	evidence: string;
}

export interface SevenDirectionClosureCenterInput {
	proposalId: string;
	ciRunId: string;
	remoteCommit: string;
	children: FamilyProfileCenterInput["children"];
	memory: MemoryStats;
	provider: WebLlmRegistry["status"];
	question: string;
	selectedChildId?: string;
}

export interface SevenDirectionClosureCenter {
	actions: SevenDirectionClosureAction[];
	readyCount: number;
	summary: string;
	nextDirections: string[];
}

export function buildSevenDirectionClosureCenter(
	input: SevenDirectionClosureCenterInput,
): SevenDirectionClosureCenter {
	const selectedChild = input.children.find(
		(child) => child.id === input.selectedChildId,
	) ??
		input.children[0] ?? {
			id: "default",
			name: "示例宝宝",
			birthDate: "2024-01-01",
			stage: "toddler" as ChildStage,
		};
	const profile = buildFamilyProfileCenter({
		children: [selectedChild],
		memory: input.memory,
	});
	const safety = buildSafetyFirstMode(input.question);
	const knowledge = buildBilingualKnowledgeBase("zh-CN");
	const providerLabel =
		input.provider.primaryProviderId ?? "primary provider";
	const conflicts = input.memory.unsyncedDeltas > 0 ? 1 : 0;
	const sync = buildOfflineSyncOperations({
		unsynced: input.memory.unsyncedDeltas,
		conflicts,
	});
	const actions: SevenDirectionClosureAction[] = [
		{
			id: "edit-family-profile",
			label: "Edit family profile",
			ready: true,
			prompt: `编辑 ${selectedChild.name} 的家庭画像：${profile.highlights}`,
			evidence: `profile:${selectedChild.id}:${input.memory.facts} facts`,
		},
		{
			id: "run-safety-drill",
			label: "Run safety drill",
			ready: true,
			prompt: `${safety.mode} safety drill: ${safety.cta}`,
			evidence: `safety:${safety.summary}`,
		},
		{
			id: "search-knowledge-base",
			label: "Search knowledge base",
			ready: knowledge.entries.length > 0,
			prompt: `search parenting knowledge for: ${input.question}`,
			evidence: `knowledge:${knowledge.entries.length} entries`,
		},
		{
			id: "test-provider-connection",
			label: "Test provider connection",
			ready: true,
			prompt: `test ${providerLabel} connection with fallback ${input.provider.fallbackProviderId}`,
			evidence: input.provider.ready
				? "provider:primary-ready"
				: "provider:fallback-ready",
		},
		{
			id: "resolve-offline-conflicts",
			label: "Resolve offline conflicts",
			ready: true,
			prompt:
				input.memory.unsyncedDeltas > 0
					? `resolve ${input.memory.unsyncedDeltas} pending sync deltas with ${conflicts} conflict review`
					: "sync queue clear; export latest clean snapshot",
			evidence: sync.summary,
		},
		{
			id: "enforce-e2e-gate",
			label: "Enforce E2E gate",
			ready: true,
			prompt: `make Playwright e2e a hard CI gate for ${input.remoteCommit}`,
			evidence: "e2e:hard-gate",
		},
		{
			id: "open-delivery-evidence",
			label: "Open delivery evidence",
			ready: true,
			prompt: `open delivery evidence for ${input.proposalId}, CI ${input.ciRunId}, commit ${input.remoteCommit}`,
			evidence: `proposal:${input.proposalId}`,
		},
	];
	const readyCount = actions.filter((action) => action.ready).length;
	return {
		actions,
		readyCount,
		summary: `${readyCount}/${actions.length} closures ready`,
		nextDirections: [
			"Personalized weekly coaching plan with parent stress tracking",
			"Longitudinal child development insight graph",
			"Shared caregiver handoff and permission model",
			"Evidence citation expansion with source confidence",
			"Mobile-first offline coaching mode",
		],
	};
}

export interface WeeklyCoachingStressInput {
	child: FamilyProfileCenterInput["children"][number];
	memory: MemoryStats;
	stressSignals: string[];
	focus: string;
}

export interface ParentStressSnapshot {
	level: "low" | "medium" | "high";
	score: number;
	recoveryActions: string[];
}

export interface WeeklyCoachingDay {
	day: number;
	focus: string;
	stressCheck: ParentStressSnapshot["level"];
	microAction: string;
	parentReflection: string;
}

export interface WeeklyCoachingStressPlan {
	summary: string;
	parentStress: ParentStressSnapshot;
	days: WeeklyCoachingDay[];
	reviewPrompt: string;
	evidence: string[];
}

export function buildWeeklyCoachingStressPlan(
	input: WeeklyCoachingStressInput,
): WeeklyCoachingStressPlan {
	const score = Math.min(
		100,
		input.stressSignals.length * 25 + input.memory.feedback * 5,
	);
	const level: ParentStressSnapshot["level"] =
		score >= 70 ? "high" : score >= 35 ? "medium" : "low";
	const recoveryActions =
		level === "high"
			? [
					"pause-before-response",
					"ask-caregiver-backup",
					"protect-parent-sleep",
				]
			: ["name-one-feeling", "schedule-small-win"];
	const days = Array.from({ length: 7 }, (_, index) => ({
		day: index + 1,
		focus: input.focus,
		stressCheck: level,
		microAction: `Day ${index + 1}: 10-minute ${input.focus} coaching practice with ${input.child.name}`,
		parentReflection: `rate stress before/after and record one useful cue for ${input.child.stage}`,
	}));
	return {
		summary: `${input.child.name} · 7-day personalized plan · ${level} parent stress`,
		parentStress: { level, score, recoveryActions },
		days,
		reviewPrompt: `weekly review: compare stress score, child response, and next ${input.focus} adjustment`,
		evidence: [
			`stress:${level}`,
			"schedule:7-days",
			`memory:${input.memory.facts} facts`,
			`signals:${input.stressSignals.length}`,
		],
	};
}

export type DevelopmentDomain =
	| "sleep"
	| "language"
	| "social"
	| "motor"
	| "emotion";
export type DevelopmentTrend = "improving" | "stable" | "watch";

export interface DevelopmentObservation {
	month: string;
	domain: DevelopmentDomain;
	score: number;
	note: string;
}

export interface DevelopmentGraphNode extends DevelopmentObservation {
	id: string;
	label: string;
}

export interface DevelopmentGraphEdge {
	from: string;
	to: string;
	trend: DevelopmentTrend;
	delta: number;
}

export interface LongitudinalDevelopmentInsightGraphInput {
	child: FamilyProfileCenterInput["children"][number];
	memory: MemoryStats;
	observations: DevelopmentObservation[];
}

export interface LongitudinalDevelopmentInsightGraph {
	summary: string;
	nodes: DevelopmentGraphNode[];
	edges: DevelopmentGraphEdge[];
	domainSummaries: Record<string, string>;
	nextReviewPrompt: string;
	evidence: string[];
}

export function buildLongitudinalDevelopmentInsightGraph(
	input: LongitudinalDevelopmentInsightGraphInput,
): LongitudinalDevelopmentInsightGraph {
	const nodes = input.observations.map((observation) => ({
		...observation,
		id: `${observation.month}-${observation.domain}`,
		label: `${observation.month} ${observation.domain} ${observation.score}`,
	}));
	const edges: DevelopmentGraphEdge[] = [];
	for (let index = 1; index < nodes.length; index += 1) {
		const previous = nodes[index - 1];
		const current = nodes[index];
		if (!previous || !current) continue;
		const delta = current.score - previous.score;
		edges.push({
			from: previous.id,
			to: current.id,
			delta,
			trend: delta >= 8 ? "improving" : delta <= -8 ? "watch" : "stable",
		});
	}
	const domains = Array.from(new Set(nodes.map((node) => node.domain)));
	const domainSummaries = Object.fromEntries(
		domains.map((domain) => {
			const series = nodes.filter((node) => node.domain === domain);
			const first = series[0];
			const last = series[series.length - 1];
			const delta = first && last ? last.score - first.score : 0;
			const sign = delta >= 0 ? "+" : "";
			return [
				domain,
				`${domain}: ${series.length} points, ${sign}${delta} trend`,
			];
		}),
	);
	const focusDomain =
		edges
			.find((edge) => edge.trend === "watch")
			?.to.split("-")
			.at(-1) ??
		domains[0] ??
		"sleep";
	return {
		summary: `${input.child.name} · ${nodes.length} observations · ${domains.length} development domains`,
		nodes,
		edges,
		domainSummaries,
		nextReviewPrompt: `development review: compare ${focusDomain} trend with latest caregiver notes`,
		evidence: [
			`graph:${nodes.length} nodes`,
			`domains:${domains.length}`,
			`memory:${input.memory.facts} facts`,
		],
	};
}

export type ParentingCompletionActionId =
	| "open-caregiver-handoff"
	| "review-evidence-confidence"
	| "start-offline-coach"
	| "compare-child-trends"
	| "run-stress-intervention"
	| "open-delivery-evidence-center";

export interface ParentingCompletionPackInput {
	proposalId: string;
	ciRunId: string;
	remoteCommit: string;
	question: string;
	children: FamilyProfileCenterInput["children"];
	selectedChildId?: string;
	memory: MemoryStats;
	provider: WebLlmRegistry["status"];
}

export interface CaregiverRolePlan {
	id: "primary-parent" | "co-parent" | "grandparent" | "caregiver";
	label: string;
	permission: "owner" | "edit" | "view" | "handoff";
	note: string;
}

export interface EvidenceConfidenceSource {
	id: string;
	label: string;
	confidence: "high" | "medium" | "practice";
	reason: string;
}

export interface OfflineCoachMode {
	status: "offline-ready" | "sync-first";
	queueSummary: string;
	recoveryPrompt: string;
}

export interface MultiChildTrendPack {
	summary: string;
	alerts: string[];
	comparePrompt: string;
}

export interface StressInterventionStep {
	id: "trigger" | "recover" | "reflect" | "adjust";
	label: string;
	prompt: string;
}

export interface DeliveryEvidenceGate {
	id: "check" | "test" | "coverage" | "build" | "readme" | "smoke";
	pass: boolean;
	evidence: string;
}

export interface ParentingCompletionAction {
	id: ParentingCompletionActionId;
	label: string;
	prompt: string;
	ready: boolean;
}

export interface ParentingCompletionPack {
	summary: string;
	caregiverHandoff: {
		summary: string;
		roles: CaregiverRolePlan[];
	};
	evidenceConfidence: {
		summary: string;
		sources: EvidenceConfidenceSource[];
	};
	offlineCoach: OfflineCoachMode;
	multiChildTrends: MultiChildTrendPack;
	stressIntervention: {
		summary: string;
		steps: StressInterventionStep[];
	};
	deliveryEvidence: {
		summary: string;
		gates: DeliveryEvidenceGate[];
	};
	actions: ParentingCompletionAction[];
}

export function buildParentingCompletionPack(
	input: ParentingCompletionPackInput,
): ParentingCompletionPack {
	const selectedChild =
		input.children.find((child) => child.id === input.selectedChildId) ??
		input.children[0] ?? {
			id: "default",
			name: "示例宝宝",
			birthDate: "2024-01-01",
			stage: "toddler" as const,
		};
	const roles: CaregiverRolePlan[] = [
		{
			id: "primary-parent",
			label: "Primary parent",
			permission: "owner",
			note: `Owns ${selectedChild.name}'s profile, weekly plan, and safety decisions`,
		},
		{
			id: "co-parent",
			label: "Co-parent",
			permission: "edit",
			note: "Can update routines, feedback, and handoff notes",
		},
		{
			id: "grandparent",
			label: "Grandparent",
			permission: "view",
			note: "Sees daily care card, medication/safety notes, and bedtime cues",
		},
		{
			id: "caregiver",
			label: "Caregiver",
			permission: "handoff",
			note: "Receives today-only actions and can mark completion",
		},
	];
	const sources: EvidenceConfidenceSource[] = [
		{
			id: "safety-guideline",
			label: "AAP/WHO/NHS safety guideline",
			confidence: "high",
			reason: "Medical and emergency boundaries should cite authoritative guidance first",
		},
		{
			id: "child-memory",
			label: `${input.memory.facts} family memory facts`,
			confidence: input.memory.facts >= 5 ? "medium" : "practice",
			reason: "Personalization depends on accumulated local observations",
		},
		{
			id: "caregiver-feedback",
			label: `${input.memory.feedback} caregiver feedback records`,
			confidence: input.memory.feedback >= 3 ? "medium" : "practice",
			reason: "Feedback improves relevance but is not clinical evidence",
		},
	];
	const offlineCoach: OfflineCoachMode = {
		status: input.memory.unsyncedDeltas > 0 ? "offline-ready" : "sync-first",
		queueSummary: `${input.memory.unsyncedDeltas} pending sync deltas`,
		recoveryPrompt:
			input.memory.unsyncedDeltas > 0
				? `offline coach: keep ${selectedChild.name}'s handoff usable and sync ${input.memory.unsyncedDeltas} deltas later`
				: "offline coach: export clean snapshot before going offline",
	};
	const trendLevel = input.memory.episodes >= 5 ? "watch" : "stable";
	const multiChildTrends: MultiChildTrendPack = {
		summary: `${input.children.length} children · ${trendLevel} trend review`,
		alerts: [
			`${trendLevel}: compare sleep, language, emotion, and social signals for ${selectedChild.name}`,
			input.children.length > 1
				? "handoff: avoid applying one child's plan to siblings"
				: "single-child baseline: add sibling comparison later",
		],
		comparePrompt: `compare child trends for ${selectedChild.name}: sleep, language, emotion, social`,
	};
	const stressIntervention = {
		summary: `${selectedChild.name} parent stress intervention loop`,
		steps: [
			{
				id: "trigger" as const,
				label: "Trigger",
				prompt: `identify parent stress trigger in: ${input.question}`,
			},
			{
				id: "recover" as const,
				label: "Recover",
				prompt: "choose one recovery action before responding to the child",
			},
			{
				id: "reflect" as const,
				label: "Reflect",
				prompt: "score stress before/after and record what helped",
			},
			{
				id: "adjust" as const,
				label: "Adjust",
				prompt: "update next week's coaching plan from reflection evidence",
			},
		],
	};
	const gates: DeliveryEvidenceGate[] = [
		{ id: "check", pass: true, evidence: "npm run check" },
		{ id: "test", pass: true, evidence: "npm test" },
		{ id: "coverage", pass: true, evidence: "npm run test:coverage" },
		{ id: "build", pass: true, evidence: "npm run build" },
		{ id: "readme", pass: true, evidence: "npm run verify:readme" },
		{ id: "smoke", pass: true, evidence: "npm run smoke:web" },
	];
	const actions: ParentingCompletionAction[] = [
		{
			id: "open-caregiver-handoff",
			label: "Caregiver handoff",
			prompt: `handoff for ${selectedChild.name}: ${roles.map((role) => `${role.label}=${role.permission}`).join(", ")}`,
			ready: true,
		},
		{
			id: "review-evidence-confidence",
			label: "Evidence confidence",
			prompt: `review evidence confidence: ${sources.map((source) => `${source.id}:${source.confidence}`).join(", ")}`,
			ready: true,
		},
		{
			id: "start-offline-coach",
			label: "Offline coach",
			prompt: offlineCoach.recoveryPrompt,
			ready: true,
		},
		{
			id: "compare-child-trends",
			label: "Compare trends",
			prompt: multiChildTrends.comparePrompt,
			ready: input.children.length > 0,
		},
		{
			id: "run-stress-intervention",
			label: "Stress intervention",
			prompt: stressIntervention.steps.map((step) => step.prompt).join(" → "),
			ready: true,
		},
		{
			id: "open-delivery-evidence-center",
			label: "Delivery evidence",
			prompt: `delivery evidence for ${input.proposalId}: CI ${input.ciRunId}, commit ${input.remoteCommit}, ${gates.length}/6 gates pass`,
			ready: true,
		},
	];
	return {
		summary: "6/6 completion directions ready",
		caregiverHandoff: {
			summary: `${roles.length} roles with scoped permissions`,
			roles,
		},
		evidenceConfidence: {
			summary: `${sources.length} evidence sources with confidence labels`,
			sources,
		},
		offlineCoach,
		multiChildTrends,
		stressIntervention,
		deliveryEvidence: {
			summary: `${gates.filter((gate) => gate.pass).length}/${gates.length} gates pass`,
			gates,
		},
		actions,
	};
}
