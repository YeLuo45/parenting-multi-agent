/**
 * RTL (React Testing Library) tests for the real React components.
 *
 * These tests actually render the components into jsdom and assert on
 * the resulting DOM tree. They complement the IR-based tests in
 * view.test.ts which assert on the same component shape without rendering.
 */

import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let testContainer: HTMLDivElement;

beforeEach(() => {
	cleanup();
	testContainer = document.createElement("div");
	document.body.appendChild(testContainer);
});

afterEach(() => {
	cleanup();
	if (testContainer?.parentNode) {
		testContainer.parentNode.removeChild(testContainer);
	}
});

import {
	AppBody,
	ChatPanel,
	ChildrenPanel,
	Composer,
	Header,
	MemoryPanel,
	MessageBubble,
	Messages,
} from "../src/components.js";
import {
	type AppState,
	type ChatMessage,
	createParentingApp,
	initialState,
	reducer,
} from "../src/view.js";

function makeState(overrides: Partial<AppState> = {}): AppState {
	return { ...initialState, agents: ["a1", "a2", "a3"], ...overrides };
}

beforeEach(() => {
	// jsdom is shared across tests, so clean up between runs.
});

afterEach(() => {
	cleanup();
});

describe("createParentingApp", () => {
	it("renders the full app shell and initializes a default child", async () => {
		const { App, stack } = createParentingApp();
		try {
			render(<App />);
			expect(await screen.findByTestId("app-root")).toBeInTheDocument();
			expect(
				await screen.findByTestId("child-default"),
			).toBeInTheDocument();
		} finally {
			stack.close();
		}
	});
});

describe("Header", () => {
	it("renders the app title with agent count", () => {
		render(<Header state={makeState()} />);
		const title = screen.getByTestId("app-title");
		expect(title).toBeInTheDocument();
		expect(title.textContent).toContain("3 agents");
		expect(title.tagName).toBe("H1");
	});

	it("updates the count from state", () => {
		const state = makeState({ agents: ["a1", "a2", "a3", "a4", "a5"] });
		render(<Header state={state} />);
		expect(screen.getByTestId("app-title").textContent).toContain(
			"5 agents",
		);
	});

	it("has banner role for accessibility", () => {
		render(<Header state={makeState()} />);
		expect(screen.getByRole("banner")).toBeInTheDocument();
	});
});

describe("ChildrenPanel", () => {
	const dispatch = vi.fn();

	it("renders no-children placeholder when list is empty", () => {
		render(
			<ChildrenPanel
				state={makeState({ children: [] })}
				dispatch={dispatch}
			/>,
			{ container: testContainer },
		);
		expect(
			within(testContainer).getByTestId("no-children"),
		).toBeInTheDocument();
		expect(
			within(testContainer).getByText("暂无孩子，请添加"),
		).toBeInTheDocument();
	});

	it("renders a list when children exist", () => {
		const state = makeState({
			children: [
				{
					id: "alice",
					name: "Alice",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
				{
					id: "bob",
					name: "Bob",
					birthDate: "2020-01-01",
					stage: "school_age",
				},
			],
		});
		render(<ChildrenPanel state={state} dispatch={dispatch} />);
		const list = screen.getByTestId("children-list");
		expect(list).toBeInTheDocument();
		expect(within(list).getByTestId("child-alice")).toBeInTheDocument();
		expect(within(list).getByTestId("child-bob")).toBeInTheDocument();
	});

	it("marks the selected child with a 'selected' class", () => {
		const state = makeState({
			selectedChildId: "alice",
			children: [
				{
					id: "alice",
					name: "Alice",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
				{
					id: "bob",
					name: "Bob",
					birthDate: "2020-01-01",
					stage: "school_age",
				},
			],
		});
		render(<ChildrenPanel state={state} dispatch={dispatch} />);
		expect(screen.getByTestId("child-alice")).toHaveClass("selected");
		expect(screen.getByTestId("child-bob")).not.toHaveClass("selected");
	});

	it("sets aria-pressed on the selected child button", () => {
		const state = makeState({
			selectedChildId: "alice",
			children: [
				{
					id: "alice",
					name: "Alice",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
			],
		});
		render(<ChildrenPanel state={state} dispatch={dispatch} />);
		expect(screen.getByTestId("child-alice")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("dispatches selectChild on click", () => {
		const dispatchSpy = vi.fn();
		const state = makeState({
			children: [
				{
					id: "alice",
					name: "Alice",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
			],
		});
		render(<ChildrenPanel state={state} dispatch={dispatchSpy} />);
		fireEvent.click(screen.getByTestId("child-alice"));
		expect(dispatchSpy).toHaveBeenCalledWith({
			type: "selectChild",
			childId: "alice",
		});
	});

	it("renders the panel with the correct ARIA label", () => {
		render(<ChildrenPanel state={makeState()} dispatch={dispatch} />);
		expect(screen.getByLabelText("Children list")).toBeInTheDocument();
	});
});

describe("MessageBubble", () => {
	const baseMessage: ChatMessage = {
		id: "m1",
		role: "user",
		author: "parent",
		content: "宝宝发烧",
		ts: 1,
	};

	it("renders user message with user-msg class", () => {
		render(<MessageBubble message={baseMessage} />);
		const el = screen.getByTestId("message-m1");
		expect(el).toHaveClass("user-msg");
		expect(el).toHaveAttribute("data-role", "user");
	});

	it("renders agent message with agent-msg class", () => {
		const agent: ChatMessage = {
			...baseMessage,
			id: "m2",
			role: "agent",
			author: "儿科",
		};
		render(<MessageBubble message={agent} />);
		const el = screen.getByTestId("message-m2");
		expect(el).toHaveClass("agent-msg");
		expect(el).toHaveAttribute("data-role", "agent");
	});

	it("renders thumbs feedback buttons for agent messages", () => {
		const onFeedback = vi.fn();
		const agent: ChatMessage = {
			...baseMessage,
			id: "m2",
			role: "agent",
			author: "儿科",
			agentId: "pediatrician",
		};
		render(<MessageBubble message={agent} onFeedback={onFeedback} />);
		fireEvent.click(screen.getByTestId("feedback-up-m2"));
		fireEvent.click(screen.getByTestId("feedback-down-m2"));
		expect(onFeedback).toHaveBeenCalledWith("m2", "up");
		expect(onFeedback).toHaveBeenCalledWith("m2", "down");
	});

	it("renders the author and content", () => {
		render(<MessageBubble message={baseMessage} />);
		expect(screen.getByText("parent:")).toBeInTheDocument();
		expect(screen.getByText("宝宝发烧")).toBeInTheDocument();
	});
});

describe("Messages", () => {
	it("renders the empty-state placeholder when no messages", () => {
		render(<Messages state={makeState()} />);
		expect(screen.getByText("问一个育儿问题开始吧")).toBeInTheDocument();
	});

	it("renders a list of messages", () => {
		const state = makeState({
			messages: [
				{ id: "a", role: "user", author: "p", content: "Q1", ts: 1 },
				{
					id: "b",
					role: "agent",
					author: "儿科",
					content: "A1",
					ts: 2,
				},
			],
		});
		render(<Messages state={state} />);
		expect(screen.getByTestId("message-a")).toBeInTheDocument();
		expect(screen.getByTestId("message-b")).toBeInTheDocument();
	});

	it("has aria-live for accessibility", () => {
		render(<Messages state={makeState()} />);
		const messages = screen.getByTestId("messages");
		expect(messages).toHaveAttribute("aria-live", "polite");
	});
});

describe("Composer", () => {
	let dispatch: ReturnType<typeof vi.fn>;
	let onAsk: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		dispatch = vi.fn();
		onAsk = vi.fn();
	});

	it("renders the textarea with current question", () => {
		render(
			<Composer
				state={makeState({ question: "宝宝发烧" })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		const textarea = screen.getByTestId(
			"question-input",
		) as HTMLTextAreaElement;
		expect(textarea.value).toBe("宝宝发烧");
	});

	it("dispatches setQuestion on textarea change", () => {
		render(
			<Composer state={makeState()} dispatch={dispatch} onAsk={onAsk} />,
		);
		const textarea = screen.getByTestId("question-input");
		fireEvent.change(textarea, { target: { value: "新问题" } });
		expect(dispatch).toHaveBeenCalledWith({
			type: "setQuestion",
			question: "新问题",
		});
	});

	it("disables the textarea when no child is selected", () => {
		render(
			<Composer
				state={makeState({ selectedChildId: null })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		expect(screen.getByTestId("question-input")).toBeDisabled();
	});

	it("shows 'Select a child first' placeholder when no child selected", () => {
		render(
			<Composer
				state={makeState({ selectedChildId: null })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		const textarea = screen.getByTestId("question-input");
		expect(textarea).toHaveAttribute("placeholder", "请先选择孩子");
	});

	it("disables the ask button when no child is selected", () => {
		render(
			<Composer
				state={makeState({ selectedChildId: null, question: "宝宝" })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		expect(screen.getByTestId("ask-button")).toBeDisabled();
	});

	it("disables the ask button when question is empty", () => {
		render(
			<Composer
				state={makeState({ selectedChildId: "c1", question: "" })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		expect(screen.getByTestId("ask-button")).toBeDisabled();
	});

	it("disables the ask button when question is only whitespace", () => {
		render(
			<Composer
				state={makeState({ selectedChildId: "c1", question: "   " })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		expect(screen.getByTestId("ask-button")).toBeDisabled();
	});

	it("enables the ask button when child and question are set", () => {
		render(
			<Composer
				state={makeState({
					selectedChildId: "c1",
					question: "宝宝发烧",
				})}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		expect(screen.getByTestId("ask-button")).toBeEnabled();
	});

	it("calls onAsk on form submit when valid", () => {
		render(
			<Composer
				state={makeState({
					selectedChildId: "c1",
					question: "宝宝发烧",
				})}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		const form = screen.getByTestId("composer");
		fireEvent.submit(form);
		expect(onAsk).toHaveBeenCalledTimes(1);
	});

	it("does not call onAsk when form submitted with empty question", () => {
		render(
			<Composer
				state={makeState({ selectedChildId: "c1", question: "" })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		const form = screen.getByTestId("composer");
		fireEvent.submit(form);
		expect(onAsk).not.toHaveBeenCalled();
	});

	it("shows 'Asking...' text when pending", () => {
		render(
			<Composer
				state={makeState({
					selectedChildId: "c1",
					question: "宝宝",
					pending: true,
				})}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		const button = screen.getByTestId("ask-button");
		expect(button.textContent).toBe("提交中…");
	});

	it("dispatches reset on reset button click", () => {
		render(
			<Composer
				state={makeState({ question: "Q" })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		fireEvent.click(screen.getByTestId("reset-button"));
		expect(dispatch).toHaveBeenCalledWith({ type: "reset" });
	});

	it("renders the error banner when state.error is set", () => {
		render(
			<Composer
				state={makeState({ error: "请先选 child" })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		const banner = screen.getByTestId("error-banner");
		expect(banner).toBeInTheDocument();
		expect(banner.textContent).toBe("请先选 child");
	});

	it("omits the error banner when state.error is null", () => {
		render(
			<Composer
				state={makeState({ error: null })}
				dispatch={dispatch}
				onAsk={onAsk}
			/>,
		);
		expect(screen.queryByTestId("error-banner")).not.toBeInTheDocument();
	});
});

describe("ChatPanel", () => {
	const dispatch = vi.fn();
	const onAsk = vi.fn();

	it("renders the chat panel with title", () => {
		render(
			<ChatPanel state={makeState()} dispatch={dispatch} onAsk={onAsk} />,
		);
		const panel = screen.getByTestId("chat-panel");
		expect(panel).toBeInTheDocument();
		expect(within(panel).getByText("对话")).toBeInTheDocument();
	});

	it("renders the messages and composer", () => {
		render(
			<ChatPanel state={makeState()} dispatch={dispatch} onAsk={onAsk} />,
		);
		expect(screen.getByTestId("messages")).toBeInTheDocument();
		expect(screen.getByTestId("composer")).toBeInTheDocument();
	});

	it("has correct ARIA label", () => {
		render(
			<ChatPanel state={makeState()} dispatch={dispatch} onAsk={onAsk} />,
		);
		expect(screen.getByLabelText("Chat")).toBeInTheDocument();
	});
});

describe("MemoryPanel", () => {
	it("renders child, fact, episode, session, feedback, and unsynced delta counts", () => {
		render(
			<MemoryPanel
				state={makeState({
					memoryStats: {
						children: 2,
						facts: 3,
						episodes: 4,
						sessions: 5,
						feedback: 6,
						unsyncedDeltas: 7,
					},
				})}
			/>,
		);
		expect(screen.getByTestId("memory-panel")).toBeInTheDocument();
		expect(screen.getByTestId("memory-stat-children")).toHaveTextContent(
			"2",
		);
		expect(screen.getByTestId("memory-stat-facts")).toHaveTextContent("3");
		expect(screen.getByTestId("memory-stat-episodes")).toHaveTextContent(
			"4",
		);
		expect(screen.getByTestId("memory-stat-sessions")).toHaveTextContent(
			"5",
		);
		expect(screen.getByTestId("memory-stat-feedback")).toHaveTextContent(
			"6",
		);
		expect(screen.getByTestId("memory-stat-unsynced")).toHaveTextContent(
			"7",
		);
	});

	it("renders zero counts by default", () => {
		render(<MemoryPanel state={makeState()} />);
		expect(screen.getByTestId("memory-stat-children")).toHaveTextContent(
			"0",
		);
		expect(screen.getByTestId("memory-stat-unsynced")).toHaveTextContent(
			"0",
		);
	});
});

describe("AppBody", () => {
	const dispatch = vi.fn();
	const onAsk = vi.fn();

	it("renders the children panel and chat panel side by side", () => {
		render(
			<AppBody state={makeState()} dispatch={dispatch} onAsk={onAsk} />,
		);
		const body = screen.getByTestId("app-body");
		expect(within(body).getByTestId("children-panel")).toBeInTheDocument();
		expect(within(body).getByTestId("chat-panel")).toBeInTheDocument();
	});

	it("has the main role", () => {
		render(
			<AppBody state={makeState()} dispatch={dispatch} onAsk={onAsk} />,
		);
		expect(screen.getByRole("main")).toBeInTheDocument();
	});
});

describe("reducer (sanity check for component tests)", () => {
	it("askStart sets pending", () => {
		const next = reducer(makeState(), { type: "askStart" });
		expect(next.pending).toBe(true);
	});

	it("selectChild clears messages and sets id", () => {
		const state = makeState({
			messages: [
				{ id: "m1", role: "user", author: "p", content: "q", ts: 1 },
			],
		});
		const next = reducer(state, { type: "selectChild", childId: "alice" });
		expect(next.selectedChildId).toBe("alice");
		expect(next.messages).toEqual([]);
	});
});
