/**
 * parenting Web Dashboard view — React 19 components.
 *
 * Exposed as a factory `createParentingApp` so the app can be rebuilt per
 * orchestrator (and per test) without module-level singletons. The factory
 * returns an `<App />` React element bound to a fresh in-memory stack.
 */
import { useEffect, useReducer, type ReactElement } from "react";
import type { ChildProfile } from "@parenting/memory";
import { computeWebStage } from "./memory-helpers.js";
import { createWebOrchestrator, listWebAgentIds, type WebOrchestrator } from "./orchestrator.js";
import { AppBody, ChatPanel, ChildrenPanel, Composer, Header, MessageBubble, Messages } from "./components.js";
import { ThemeProvider } from "./theme.js";
import { I18nProvider } from "./i18n.js";

export interface ChatMessage {
	id: string;
	role: "user" | "agent";
	author: string;
	content: string;
	confidence?: number;
	urgency?: string;
	redFlag?: { ruleId: string; severity: string; description: string; action: string };
	ts: number;
}

export interface AppState {
	children: ChildProfile[];
	selectedChildId: string | null;
	question: string;
	messages: ChatMessage[];
	pending: boolean;
	agents: string[];
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
	| { type: "reset" };

export const initialState: AppState = {
	children: [],
	selectedChildId: null,
	question: "",
	messages: [],
	pending: false,
	agents: listWebAgentIds(),
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
			return { ...state, pending: false, messages: action.messages, question: "" };
		case "askError":
			return { ...state, pending: false, error: action.error };
		case "reset":
			return { ...initialState, children: state.children, selectedChildId: state.selectedChildId, agents: state.agents };
		default:
			return state;
	}
}

export function newMessageId(): string {
	return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
		birthDate: new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
		stage: "toddler",
	};
}

/** Pure view function so tests can assert against the IR without rendering. */
export function renderView(state: AppState, dispatch: (a: Action) => void): IRNode {
	const root: IRNode = {
		tag: "div",
		props: { className: "app", "data-testid": "app-root" },
		children: [
			{
				tag: "header",
				props: { className: "app-header", "data-testid": "app-header" },
				children: [
					{ tag: "h1", children: [`parenting-multi-agent (${state.agents.length} agents)`] },
				],
			},
			{
				tag: "div",
				props: { className: "app-body", "data-testid": "app-body" },
				children: [
					renderChildrenPanel(state, dispatch),
					renderChatPanel(state, dispatch),
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
						className: c.id === state.selectedChildId ? "child selected" : "child",
						onClick: () => dispatch({ type: "selectChild", childId: c.id }),
					},
					children: [`${c.name} (${c.stage})`],
				})),
			},
			state.children.length === 0
				? { tag: "p", props: { "data-testid": "no-children" }, children: ["No children yet."] }
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
						? [{ tag: "p", children: ["Ask a parenting question to get started."] }]
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
								dispatch({ type: "setQuestion", question: e.target.value }),
						},
					},
					{
						tag: "button",
						props: {
							"data-testid": "ask-button",
							type: "submit",
							disabled: !state.selectedChildId || state.pending || state.question.trim() === "",
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
						props: { className: "error", "data-testid": "error-banner" },
						children: [state.error],
				  }
				: { tag: "span", children: [] },
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
export function createParentingApp(): { App: () => ReactElement; stack: WebOrchestrator } {
	const stack: WebOrchestrator = createWebOrchestrator();
	function App(): ReactElement {
		/* v8 ignore next 22 */
		const [state, dispatch] = useReducer(reducer, initialState);
		/* v8 ignore next 6 */
		const onAsk = async (): Promise<void> => {
			await dispatchAsk(stack, state, dispatch);
		};
		/* v8 ignore next 4 */
		useEffect(() => {
			const existing = stack.listChildren();
			const children = existing.length > 0 ? existing : [stack.upsertChild(defaultChild())];
			dispatch({ type: "setChildren", children });
			if (!state.selectedChildId && children.length > 0) {
				dispatch({ type: "selectChild", childId: children[0].id });
			}
		}, []);

		return (
			<ThemeProvider>
				<I18nProvider>
					<div className="app" data-testid="app-root" role="application">
						<Header state={state} />
						<AppBody state={state} dispatch={dispatch} onAsk={onAsk} />
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
): Promise<{ ok: true; messages: ChatMessage[] } | { ok: false; error: string }> {
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

/** Re-export for tests that need to introspect the registered agent list. */
export { listWebAgentIds };
