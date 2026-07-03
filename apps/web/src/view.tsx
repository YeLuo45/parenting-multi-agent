/**
 * parenting Web Dashboard view — React 19 components.
 *
 * Exposed as a factory `createParentingApp` so the app can be rebuilt per
 * orchestrator (and per test) without module-level singletons. The factory
 * returns an `<App />` React element bound to a fresh in-memory stack.
 */

import type { ChildProfile } from "@parenting/memory";
import { type ReactElement, useCallback, useEffect, useReducer } from "react";
import { AppBody, Header } from "./components.js";
import { I18nProvider } from "./i18n.js";
import { computeWebStage } from "./memory-helpers.js";
import type { MemoryStats } from "./memory-web.js";
import { createWorkbenchStorage } from "./workbench-persistence.js";
import {
	createWebOrchestrator,
	createWebOrchestratorWithPersistence,
	listWebAgentIds,
	type WebOrchestrator,
} from "./orchestrator.js";
import { ThemeProvider } from "./theme.js";
import {
	buildE2eMainPathReport,
	buildWebConvergenceSnapshot,
	createRuleFallbackProvider,
	type E2eMainPathReport,
	registerWebLlmProviders,
	type WebConvergenceSnapshot,
	type WebLlmRegistry,
} from "./web-convergence.js";
import {
	buildIterationSuite,
	buildProviderConfigSnapshot,
	buildReleaseGatePlan,
	buildScenarioPack,
	buildAgentWeightHints,
	type IterationSuiteSnapshot,
	type ProviderConfigSnapshot,
	type ReleaseGatePlan,
} from "./web-iteration-suite.js";
import type {
	ActionPlanCard,
	AgentWeightHints,
	GuidedIntakeStepId,
} from "./web-iteration-suite.js";

export interface ChatMessage {
	id: string;
	role: "user" | "agent";
	author: string;
	content: string;
	agentId?: string;
	feedback?: "up" | "down";
	confidence?: number;
	urgency?: string;
	redFlag?: {
		ruleId: string;
		severity: string;
		description: string;
		action: string;
	};
	ts: number;
}

export interface AppState {
	children: ChildProfile[];
	selectedChildId: string | null;
	question: string;
	messages: ChatMessage[];
	pending: boolean;
	agents: string[];
	memoryStats: MemoryStats;
	convergence: WebConvergenceSnapshot | null;
	llmStatus: WebLlmRegistry["status"];
	e2eReport: E2eMainPathReport;
	iterationSuite: IterationSuiteSnapshot;
	providerConfig: ProviderConfigSnapshot;
	releaseGate: ReleaseGatePlan;
	guidedIntake: {
		completedSteps: GuidedIntakeStepId[];
		activeStepId: GuidedIntakeStepId;
		scenarioId: string | null;
		goal: string;
	};
	actionBoard: {
		completedIds: ActionPlanCard["horizon"][];
		notes: Partial<Record<ActionPlanCard["horizon"], string>>;
	};
	selectedAgentId: string | null;
	agentHints: AgentWeightHints;
	busy: boolean;
	error: string | null;
}

export type Action =
	| { type: "setQuestion"; question: string }
	| { type: "setChildren"; children: ChildProfile[] }
	| { type: "selectChild"; childId: string }
	| { type: "askStart" }
	| { type: "askDone"; messages: ChatMessage[] }
	| { type: "askError"; error: string }
	| { type: "feedbackDone"; messageId: string; feedback: "up" | "down" }
	| { type: "setMemoryStats"; memoryStats: MemoryStats }
	| {
			type: "setConvergence";
			convergence: WebConvergenceSnapshot;
			llmStatus: WebLlmRegistry["status"];
			e2eReport: E2eMainPathReport;
			iterationSuite: IterationSuiteSnapshot;
			providerConfig: ProviderConfigSnapshot;
			releaseGate: ReleaseGatePlan;
	  }
	| { type: "advanceIntake"; stepId: GuidedIntakeStepId; scenarioId?: string; goal?: string }
	| { type: "toggleActionCard"; horizon: ActionPlanCard["horizon"] }
	| { type: "annotateActionCard"; horizon: ActionPlanCard["horizon"]; note: string }
	| { type: "hydrateWorkbench"; guidedIntake: AppState["guidedIntake"]; actionBoard: AppState["actionBoard"] }
	| { type: "selectAgent"; agentId: string | null }
	| { type: "setAgentHints"; hints: AgentWeightHints }
	| { type: "reset" };

export const initialState: AppState = {
	children: [],
	selectedChildId: null,
	question: "",
	messages: [],
	pending: false,
	agents: listWebAgentIds(),
	memoryStats: {
		children: 0,
		facts: 0,
		episodes: 0,
		sessions: 0,
		feedback: 0,
		unsyncedDeltas: 0,
	},
	convergence: null,
	llmStatus: {
		primaryProviderId: null,
		fallbackProviderId: "rule-fallback",
		ready: false,
	},
	e2eReport: buildE2eMainPathReport({
		children: 0,
		messages: 0,
		feedback: 0,
		memoryVisible: false,
		syncVisible: false,
		llmFallbackReady: true,
	}),
	iterationSuite: buildIterationSuite({
		children: 0,
		facts: 0,
		episodes: 0,
		sessions: 0,
		feedback: 0,
		unsyncedDeltas: 0,
	}),
	providerConfig: buildProviderConfigSnapshot({
		primaryProviderId: null,
		fallbackProviderId: "rule-fallback",
		ready: false,
	}),
	releaseGate: buildReleaseGatePlan(),
	guidedIntake: {
		completedSteps: ["child"],
		activeStepId: "scenario",
		scenarioId: null,
		goal: "",
	},
	actionBoard: {
		completedIds: [],
		notes: {},
	},
	selectedAgentId: null,
	agentHints: {
		boosts: [],
		totalCompleted: 0,
		signalSummary: "no agent signal",
	},
	busy: false,
	error: null,
};

export function reducer(state: AppState, action: Action): AppState {
	switch (action.type) {
		case "setQuestion":
			return { ...state, question: action.question };
		case "setChildren":
			return { ...state, children: action.children };
		case "selectChild":
			return { ...state, selectedChildId: action.childId, messages: [] };
		case "askStart":
			return { ...state, pending: true, error: null };
		case "askDone":
			return {
				...state,
				pending: false,
				messages: action.messages,
				question: "",
			};
		case "askError":
			return { ...state, pending: false, error: action.error };
		case "feedbackDone":
			return {
				...state,
				messages: state.messages.map((message) =>
					message.id === action.messageId
						? { ...message, feedback: action.feedback }
						: message,
				),
			};
		case "setMemoryStats":
			return { ...state, memoryStats: action.memoryStats };
		case "setConvergence":
			return {
				...state,
				convergence: action.convergence,
				memoryStats: action.convergence.memory,
				llmStatus: action.llmStatus,
				e2eReport: action.e2eReport,
				iterationSuite: action.iterationSuite,
				providerConfig: action.providerConfig,
				releaseGate: action.releaseGate,
			};
		case "advanceIntake": {
			const completedSteps = state.guidedIntake.completedSteps.includes(
				action.stepId,
			)
				? state.guidedIntake.completedSteps
				: [...state.guidedIntake.completedSteps, action.stepId];
			return {
				...state,
				guidedIntake: {
					completedSteps,
					activeStepId: action.stepId,
					scenarioId: action.scenarioId ?? state.guidedIntake.scenarioId,
					goal: action.goal ?? state.guidedIntake.goal,
				},
			};
		}
		case "toggleActionCard": {
			const completedIds = state.actionBoard.completedIds.includes(
				action.horizon,
			)
				? state.actionBoard.completedIds.filter(
						(id) => id !== action.horizon,
					)
				: [...state.actionBoard.completedIds, action.horizon];
			return {
				...state,
				actionBoard: { ...state.actionBoard, completedIds },
			};
		}
		case "annotateActionCard": {
			return {
				...state,
				actionBoard: {
					...state.actionBoard,
					notes: { ...state.actionBoard.notes, [action.horizon]: action.note },
				},
			};
		}
		case "hydrateWorkbench": {
			return {
				...state,
				guidedIntake: action.guidedIntake,
				actionBoard: action.actionBoard,
			};
		}
		case "selectAgent": {
			return { ...state, selectedAgentId: action.agentId };
		}
		case "setAgentHints": {
			return { ...state, agentHints: action.hints };
		}
		case "reset":
			return {
				...initialState,
				children: state.children,
				selectedChildId: state.selectedChildId,
				agents: state.agents,
				memoryStats: state.memoryStats,
				convergence: state.convergence,
				llmStatus: state.llmStatus,
				e2eReport: state.e2eReport,
				iterationSuite: state.iterationSuite,
				providerConfig: state.providerConfig,
				releaseGate: state.releaseGate,
			};
		default:
			return state;
	}
}

export function newMessageId(): string {
	return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildSetConvergenceAction(
	convergence: WebConvergenceSnapshot,
	llmStatus: WebLlmRegistry["status"],
	messageCount: number,
): Action {
	return {
		type: "setConvergence",
		convergence,
		llmStatus,
		e2eReport: buildE2eMainPathReport({
			children: convergence.memory.children,
			messages: messageCount,
			feedback: convergence.memory.feedback,
			memoryVisible: true,
			syncVisible: true,
			llmFallbackReady: Boolean(llmStatus.fallbackProviderId),
		}),
		iterationSuite: buildIterationSuite(convergence.memory),
		providerConfig: buildProviderConfigSnapshot(llmStatus),
		releaseGate: buildReleaseGatePlan(),
	};
}

/** Intermediate-representation node used by renderView. Exposed for tests. */
export interface IRNode {
	tag: string;
	props?: Record<string, unknown>;
	children?: (IRNode | string)[];
}

export function defaultChild(): ChildProfile {
	const now = Date.now();
	return {
		id: "default",
		name: "示例宝宝",
		birthDate: new Date(now - 365 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0],
		stage: "toddler",
	};
}

/** Pure view function so tests can assert against the IR without rendering. */
export function renderView(
	state: AppState,
	dispatch: (a: Action) => void,
): IRNode {
	const root: IRNode = {
		tag: "div",
		props: { className: "app", "data-testid": "app-root" },
		children: [
			{
				tag: "header",
				props: { className: "app-header", "data-testid": "app-header" },
				children: [
					{
						tag: "h1",
						children: [
							`parenting-multi-agent (${state.agents.length} agents)`,
						],
					},
				],
			},
			{
				tag: "div",
				props: { className: "app-body", "data-testid": "app-body" },
				children: [
					renderChildrenPanel(state, dispatch),
					renderChatPanel(state, dispatch),
					renderMemoryPanel(state, dispatch),
				],
			},
		],
	};
	return root;
}

function renderChildrenPanel(
	state: AppState,
	dispatch: (a: Action) => void,
): ReturnType<typeof renderView> {
	return {
		tag: "aside",
		props: { className: "children-panel", "data-testid": "children-panel" },
		children: [
			{ tag: "h2", children: ["Children"] },
			{
				tag: "ul",
				props: { "data-testid": "children-list" },
				children: state.children.map((c) => ({
					tag: "li",
					props: {
						"data-testid": `child-${c.id}`,
						className:
							c.id === state.selectedChildId
								? "child selected"
								: "child",
						onClick: () =>
							dispatch({ type: "selectChild", childId: c.id }),
					},
					children: [`${c.name} (${c.stage})`],
				})),
			},
			state.children.length === 0
				? {
						tag: "p",
						props: { "data-testid": "no-children" },
						children: ["No children yet."],
					}
				: { tag: "span", children: [] },
		],
	};
}

function renderChatPanel(
	state: AppState,
	dispatch: (a: Action) => void,
): ReturnType<typeof renderView> {
	return {
		tag: "section",
		props: { className: "chat-panel", "data-testid": "chat-panel" },
		children: [
			{ tag: "h2", children: ["Chat"] },
			{
				tag: "div",
				props: { className: "messages", "data-testid": "messages" },
				children:
					state.messages.length === 0
						? [
								{
									tag: "p",
									children: [
										"Ask a parenting question to get started.",
									],
								},
							]
						: state.messages.map((m) => renderMessage(m)),
			},
			{
				tag: "form",
				props: {
					className: "composer",
					"data-testid": "composer",
					onSubmit: () => dispatch({ type: "askStart" }),
				},
				children: [
					{
						tag: "textarea",
						props: {
							"data-testid": "question-input",
							value: state.question,
							placeholder: state.selectedChildId
								? "Ask anything..."
								: "Select a child first",
							disabled: !state.selectedChildId || state.pending,
							onChange: (e: { target: { value: string } }) =>
								dispatch({
									type: "setQuestion",
									question: e.target.value,
								}),
						},
					},
					{
						tag: "button",
						props: {
							"data-testid": "ask-button",
							type: "submit",
							disabled:
								!state.selectedChildId ||
								state.pending ||
								state.question.trim() === "",
						},
						children: [state.pending ? "Asking..." : "Ask"],
					},
					{
						tag: "button",
						props: {
							"data-testid": "reset-button",
							type: "button",
							onClick: () => dispatch({ type: "reset" }),
						},
						children: ["Reset"],
					},
				],
			},
			state.error
				? {
						tag: "div",
						props: {
							className: "error",
							"data-testid": "error-banner",
						},
						children: [state.error],
					}
				: { tag: "span", children: [] },
		],
	};
}

function renderMemoryPanel(
	state: AppState,
	dispatch: (a: Action) => void,
): ReturnType<typeof renderView> {
	const scenarios = buildScenarioPack();
	return {
		tag: "aside",
		props: { className: "memory-panel", "data-testid": "memory-panel" },
		children: [
			{ tag: "h2", children: ["Memory"] },
			{
				tag: "p",
				props: { "data-testid": "iteration-suite-summary" },
				children: [state.iterationSuite.summary],
			},
			{
				tag: "p",
				props: { "data-testid": "provider-config-status" },
				children: [state.providerConfig.statusText],
			},
			{
				tag: "p",
				props: { "data-testid": "scenario-pack-summary" },
				children: [`${scenarios.length} scenario pack cases ready`],
			},
			{
				tag: "div",
				props: { "data-testid": "scenario-pack-actions" },
				children: scenarios.map((scenario) => ({
					tag: "button",
					props: {
						"data-testid": `scenario-${scenario.id}`,
						type: "button",
						onClick: () =>
							dispatch({
								type: "setQuestion",
								question: scenario.prompt,
							}),
					},
					children: [scenario.title],
				})),
			},
			{
				tag: "p",
				props: { "data-testid": "release-gate-command" },
				children: [state.releaseGate.command],
			},
			{
				tag: "dl",
				children: [
					{
						tag: "div",
						props: { "data-testid": "memory-stat-children" },
						children: [String(state.memoryStats.children)],
					},
					{
						tag: "div",
						props: { "data-testid": "memory-stat-unsynced" },
						children: [String(state.memoryStats.unsyncedDeltas)],
					},
				],
			},
		],
	};
}

function renderMessage(m: ChatMessage): ReturnType<typeof renderView> {
	const tag = m.role === "user" ? "user-msg" : "agent-msg";
	return {
		tag: "div",
		props: {
			className: `message ${tag}`,
			"data-testid": `message-${m.id}`,
			"data-role": m.role,
		},
		children: [
			{ tag: "strong", children: [`${m.author}:`] },
			{ tag: "p", children: [m.content] },
		],
	};
}

/** Factory that returns the App React element bound to a fresh orchestrator.
 *  Tests can call this directly to assert the React tree. */
export function createParentingApp(): {
	App: () => ReactElement;
	stack: WebOrchestrator;
} {
	const stack: WebOrchestrator = createWebOrchestrator();
	return createAppFromStack(stack);
}

/**
 * Factory that hydrates the orchestrator from IndexedDB before mounting the
 * App. Awaits hydration so the first render already shows persisted data.
 */
export async function createParentingAppWithPersistence(
	dbName?: string,
): Promise<{ App: () => ReactElement; stack: WebOrchestrator }> {
	const stack = await createWebOrchestratorWithPersistence(dbName);
	return createAppFromStack(stack);
}

function createAppFromStack(stack: WebOrchestrator): {
	App: () => ReactElement;
	stack: WebOrchestrator;
} {
	function App(): ReactElement {
		/* v8 ignore next 22 */
		const [state, dispatch] = useReducer(reducer, initialState);
		/* v8 ignore next 11 */
		const refreshConvergence = useCallback((): void => {
			const convergence = buildWebConvergenceSnapshot(stack.memory);
			const registry = registerWebLlmProviders([
				createRuleFallbackProvider(),
			]);
			dispatch(
				buildSetConvergenceAction(
					convergence,
					registry.status,
					state.messages.length,
				),
			);
		}, [stack.memory, state.messages.length]);
		/* v8 ignore next 4 */
		const onAsk = async (): Promise<void> => {
			await dispatchAsk(stack, state, dispatch);
			refreshConvergence();
		};
		/* v8 ignore next 7 */
		const onFeedback = (
			messageId: string,
			feedback: "up" | "down",
		): void => {
			recordMessageFeedback(stack, state, messageId, feedback, dispatch);
			refreshConvergence();
		};
		/* v8 ignore next 4 */
		useEffect(() => {
			const existing = stack.listChildren();
			const children =
				existing.length > 0
					? existing
					: [stack.upsertChild(defaultChild())];
			dispatch({ type: "setChildren", children });
			if (!state.selectedChildId && children.length > 0) {
				dispatch({ type: "selectChild", childId: children[0].id });
			}
			refreshConvergence();
		}, [
			stack.listChildren,
			stack.upsertChild,
			state.selectedChildId,
			refreshConvergence,
	]);

	/* v8 ignore next 4 */
	useEffect(() => {
		const storage = createWorkbenchStorage();
		const persisted = storage.load();
		if (persisted) {
			dispatch({ type: "hydrateWorkbench", guidedIntake: persisted.guidedIntake, actionBoard: persisted.actionBoard });
		}
	}, [dispatch]);

	/* v8 ignore next 5 */
	useEffect(() => {
		const storage = createWorkbenchStorage();
		storage.save({ guidedIntake: state.guidedIntake, actionBoard: state.actionBoard });
	}, [state.guidedIntake, state.actionBoard]);

	/* v8 ignore next 6 */
	useEffect(() => {
		const primary = state.iterationSuite.directions[0]?.id ?? "parent-support";
		const hints = buildAgentWeightHints({
			primaryAgentId: primary,
			completedIds: state.actionBoard.completedIds,
			notes: state.actionBoard.notes,
		});
		dispatch({ type: "setAgentHints", hints });
	}, [state.actionBoard.completedIds, state.actionBoard.notes, state.iterationSuite.directions, dispatch]);

		return (
			<ThemeProvider>
				<I18nProvider>
					<div
						className="app"
						data-testid="app-root"
						role="application"
					>
						<Header state={state} />
						<AppBody
							state={state}
							dispatch={dispatch}
							onAsk={onAsk}
							onFeedback={onFeedback}
						/>
					</div>
				</I18nProvider>
			</ThemeProvider>
		);
	}

	return { App, stack };
}

/** Pure ask helper used by the App to run a real ask. Exposed for tests. */
export async function runAsk(
	stack: WebOrchestrator,
	childId: string,
	question: string,
): Promise<
	{ ok: true; messages: ChatMessage[] } | { ok: false; error: string }
> {
	const child = stack.listChildren().find((c) => c.id === childId);
	if (!child) return { ok: false, error: `Child ${childId} not found` };
	if (!question.trim()) return { ok: false, error: "Question is empty" };
	const stage = child.stage ?? computeWebStage(child.birthDate);
	const target = { ...child, stage };
	const result = await stack.ask(target, question);
	const userMsg: ChatMessage = {
		id: newMessageId(),
		role: "user",
		author: child.name,
		content: question,
		ts: Date.now(),
	};
	const out: ChatMessage[] = [userMsg];
	if (result.emergencyEscalation && result.redFlag) {
		out.push({
			id: newMessageId(),
			role: "agent",
			author: `🚨 ${result.redFlag.severity.toUpperCase()}`,
			content: `${result.redFlag.description}\n建议: ${result.redFlag.action}`,
			redFlag: result.redFlag,
			ts: Date.now(),
		});
	} else {
		for (const r of result.replies) {
			out.push({
				id: newMessageId(),
				role: "agent",
				author: r.agentName,
				agentId: r.agentId,
				content: r.content,
				confidence: r.confidence,
				urgency: r.urgency,
				ts: Date.now(),
			});
		}
	}
	return { ok: true, messages: out };
}

/** Drive an ask from a given state+dispatch pair. Used by tests and the App. */
export async function dispatchAsk(
	stack: WebOrchestrator,
	state: AppState,
	dispatch: (a: Action) => void,
): Promise<void> {
	if (!state.selectedChildId) {
		dispatch({ type: "askError", error: "Select a child first" });
		return;
	}
	const question = state.question.trim();
	if (!question) {
		dispatch({ type: "askError", error: "Question is empty" });
		return;
	}
	dispatch({ type: "askStart" });
	const r = await runAsk(stack, state.selectedChildId, question);
	if (!r.ok) {
		dispatch({ type: "askError", error: r.error });
		return;
	}
	dispatch({ type: "askDone", messages: [...state.messages, ...r.messages] });
}

export function recordMessageFeedback(
	stack: WebOrchestrator,
	state: AppState,
	messageId: string,
	feedback: "up" | "down",
	dispatch: (a: Action) => void,
): void {
	const message = state.messages.find((m) => m.id === messageId);
	if (!message?.agentId || !state.selectedChildId) return;
	stack.recordAgentFeedback(state.selectedChildId, message.agentId, feedback);
	dispatch({ type: "feedbackDone", messageId, feedback });
}

/** Re-export for tests that need to introspect the registered agent list. */
export { listWebAgentIds };
