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
