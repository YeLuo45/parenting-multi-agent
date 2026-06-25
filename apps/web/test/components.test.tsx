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

	it("renders unattended suite evidence in the visible dashboard", () => {
		render(<MemoryPanel state={makeState()} />);
		expect(
			screen.getByTestId("iteration-suite-summary").textContent,
		).toContain("7/7");
		expect(
			screen.getByTestId("provider-config-status").textContent,
		).toContain("rule-fallback");
		expect(
			screen.getByTestId("scenario-pack-summary").textContent,
		).toContain("7 scenario");
		expect(screen.getByTestId("release-gate-command").textContent).toBe(
			"npm run release:gate",
		);
	});

	it("lets parents load a scenario prompt into the composer", () => {
		const dispatch = vi.fn();
		render(<MemoryPanel state={makeState()} dispatch={dispatch} />);
		fireEvent.click(screen.getByTestId("scenario-bedtime-delay"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "setQuestion",
			question: "孩子睡前反复要水、讲故事，不肯上床怎么办？",
		});
	});

	it("renders all unattended dashboard controls as discoverable cards", () => {
		render(<MemoryPanel state={makeState()} dispatch={vi.fn()} />);
		expect(
			screen.getByTestId("acceptance-evidence-panel"),
		).toHaveTextContent("Acceptance Evidence");
		expect(screen.getByTestId("memory-timeline-panel")).toHaveTextContent(
			"Memory Timeline",
		);
		expect(screen.getByTestId("sync-queue-panel")).toHaveTextContent(
			"Sync Queue",
		);
		expect(screen.getByTestId("e2e-drill-panel")).toHaveTextContent(
			"Main Path Drill",
		);
		expect(screen.getByTestId("provider-mode-toggle")).toHaveTextContent(
			"fallback",
		);
	});

	it("exposes real dashboard actions through dispatchable buttons", () => {
		const dispatch = vi.fn();
		render(
			<MemoryPanel
				state={makeState({
					selectedChildId: "default",
					children: [
						{
							id: "default",
							name: "示例宝宝",
							birthDate: "2024-01-01",
							stage: "toddler",
						},
					],
					memoryStats: {
						children: 1,
						facts: 0,
						episodes: 0,
						sessions: 0,
						feedback: 0,
						unsyncedDeltas: 2,
					},
				})}
				dispatch={dispatch}
			/>,
		);
		fireEvent.click(screen.getByTestId("run-main-path-drill"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("睡前"),
			}),
		);
		fireEvent.click(screen.getByTestId("sync-retry-action"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("Retry 2 pending"),
			}),
		);
		fireEvent.click(screen.getByTestId("export-delivery-report"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("P-20260624-015"),
			}),
		);
	});

	it("renders provider mode choices with accessible selected state", () => {
		render(<MemoryPanel state={makeState()} dispatch={vi.fn()} />);
		expect(screen.getByTestId("provider-option-fallback")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByTestId("provider-option-primary")).toBeDisabled();
		expect(
			screen.getByTestId("provider-option-api-health"),
		).toHaveTextContent("needs key");
	});

	it("uses default child, clear sync summary, and primary provider branches", () => {
		const dispatch = vi.fn();
		render(
			<MemoryPanel
				state={makeState({
					selectedChildId: null,
					children: [],
					llmStatus: {
						primaryProviderId: "remote-llm",
						fallbackProviderId: "rule-fallback",
						ready: true,
					},
					memoryStats: {
						children: 0,
						facts: 0,
						episodes: 0,
						sessions: 0,
						feedback: 0,
						unsyncedDeltas: 0,
					},
				})}
				dispatch={dispatch}
			/>,
		);
		expect(screen.getByTestId("provider-option-primary")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByTestId("provider-option-primary")).toBeEnabled();
		fireEvent.click(screen.getByTestId("run-main-path-drill"));
		fireEvent.click(screen.getByTestId("execution-offline-sync"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("睡前"),
			}),
		);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("0 pending"),
			}),
		);
	});

	it("renders all eight product direction panels on the main memory dashboard", () => {
		render(<MemoryPanel state={makeState()} dispatch={vi.fn()} />);
		expect(screen.getByTestId("product-hub-panel")).toHaveTextContent(
			"8/8",
		);
		expect(
			screen.getByTestId("product-section-family-profile"),
		).toBeEnabled();
		expect(
			screen.getByTestId("product-section-agent-collaboration"),
		).toBeEnabled();
		expect(
			screen.getByTestId("product-section-sync-conflicts"),
		).toBeEnabled();
		expect(
			screen.getByTestId("product-section-scenario-library"),
		).toBeEnabled();
		expect(
			screen.getByTestId("product-section-llm-provider"),
		).toBeEnabled();
		expect(
			screen.getByTestId("product-section-acceptance-evidence"),
		).toBeEnabled();
		expect(
			screen.getByTestId("product-section-knowledge-base"),
		).toBeEnabled();
		expect(
			screen.getByTestId("product-section-safety-boundary"),
		).toBeEnabled();
		expect(screen.getByTestId("scenario-library-panel")).toHaveTextContent(
			"7 templates",
		);
		expect(
			screen.getByTestId("conflict-resolution-panel"),
		).toHaveTextContent("0 conflicts");
		expect(screen.getByTestId("llm-provider-form-panel")).toHaveTextContent(
			"4 fields",
		);
		expect(screen.getByTestId("knowledge-base-panel")).toHaveTextContent(
			"6 zh-CN entries",
		);
		expect(screen.getByTestId("safety-boundary-panel")).toHaveTextContent(
			"watch",
		);
	});

	it("dispatches product direction summaries from the hub buttons", () => {
		const dispatch = vi.fn();
		render(<MemoryPanel state={makeState()} dispatch={dispatch} />);
		fireEvent.click(screen.getByTestId("product-section-family-profile"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("children"),
			}),
		);
	});

	it("renders a visible parenting closed-loop card and action", () => {
		const dispatch = vi.fn();
		render(
			<MemoryPanel
				state={makeState({
					selectedChildId: "default",
					children: [
						{
							id: "default",
							name: "示例宝宝",
							birthDate: "2024-01-01",
							stage: "toddler",
						},
					],
					memoryStats: {
						children: 1,
						facts: 3,
						episodes: 2,
						sessions: 4,
						feedback: 1,
						unsyncedDeltas: 2,
					},
				})}
				dispatch={dispatch}
			/>,
		);
		expect(screen.getByTestId("closed-loop-panel")).toHaveTextContent(
			"6-step closed loop",
		);
		expect(screen.getByTestId("closed-loop-panel")).toHaveTextContent(
			"sleep-coach",
		);
		fireEvent.click(screen.getByTestId("closed-loop-next-action"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("开始睡前演练"),
			}),
		);
	});

	it("renders the seven-direction execution center with dispatchable actions", () => {
		const dispatch = vi.fn();
		render(
			<MemoryPanel
				state={makeState({
					selectedChildId: "default",
					children: [
						{
							id: "default",
							name: "示例宝宝",
							birthDate: "2024-01-01",
							stage: "toddler",
						},
						{
							id: "teen",
							name: "阿宁",
							birthDate: "2012-01-01",
							stage: "teen",
						},
					],
					question: "孩子高烧39度还持续皮疹怎么办？",
					memoryStats: {
						children: 2,
						facts: 5,
						episodes: 4,
						sessions: 3,
						feedback: 2,
						unsyncedDeltas: 3,
					},
				})}
				dispatch={dispatch}
			/>,
		);
		expect(screen.getByTestId("execution-center-panel")).toHaveTextContent(
			"7/7",
		);
		expect(screen.getByTestId("execution-action-plan")).toHaveTextContent(
			"7-day plan",
		);
		expect(screen.getByTestId("execution-safety-first")).toHaveTextContent(
			"doctor-first",
		);
		fireEvent.click(screen.getByTestId("execution-action-plan"));
		fireEvent.click(screen.getByTestId("execution-feedback-repair"));
		fireEvent.click(screen.getByTestId("execution-multi-child"));
		fireEvent.click(screen.getByTestId("execution-offline-sync"));
		fireEvent.click(screen.getByTestId("execution-safety-first"));
		fireEvent.click(screen.getByTestId("execution-parent-progress"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("7-day"),
			}),
		);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("修复"),
			}),
		);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("export 3 pending"),
			}),
		);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: "先看安全边界并联系医生",
			}),
		);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("2 completed"),
			}),
		);
	});

	it("renders execution center buttons safely without a dispatch handler", () => {
		render(
			<MemoryPanel
				state={makeState({
					selectedChildId: "default",
					children: [
						{
							id: "default",
							name: "示例宝宝",
							birthDate: "2024-01-01",
							stage: "toddler",
						},
					],
					question: "睡前拖延怎么办？",
					memoryStats: {
						children: 1,
						facts: 0,
						episodes: 0,
						sessions: 0,
						feedback: 0,
						unsyncedDeltas: 0,
					},
				})}
			/>,
		);
		fireEvent.click(screen.getByTestId("execution-safety-first"));
		fireEvent.click(screen.getByTestId("execution-offline-sync"));
		expect(screen.getByTestId("execution-safety-first")).toHaveTextContent(
			"normal-loop",
		);
		expect(screen.getByTestId("execution-offline-sync")).toHaveTextContent(
			"0 pending · 0 conflicts",
		);
	});

	it("renders the seven all-direction closure actions in the main dashboard", () => {
		const dispatch = vi.fn();
		render(
			<MemoryPanel
				state={makeState({
					selectedChildId: "default",
					children: [
						{
							id: "default",
							name: "示例宝宝",
							birthDate: "2024-01-01",
							stage: "toddler",
						},
					],
					question: "孩子高烧39度持续皮疹怎么办？",
					memoryStats: {
						children: 1,
						facts: 4,
						episodes: 3,
						sessions: 2,
						feedback: 1,
						unsyncedDeltas: 2,
					},
				})}
				dispatch={dispatch}
			/>,
		);
		expect(
			screen.getByTestId("seven-direction-closure-panel"),
		).toHaveTextContent("7/7 closures ready");
		for (const id of [
			"edit-family-profile",
			"run-safety-drill",
			"search-knowledge-base",
			"test-provider-connection",
			"resolve-offline-conflicts",
			"enforce-e2e-gate",
			"open-delivery-evidence",
		]) {
			expect(screen.getByTestId(`closure-action-${id}`)).toBeEnabled();
		}
		fireEvent.click(screen.getByTestId("closure-action-run-safety-drill"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("doctor-first"),
			}),
		);
	});

	it("renders the longitudinal development insight graph in the main dashboard", () => {
		const dispatch = vi.fn();
		render(
			<MemoryPanel
				state={makeState({
					selectedChildId: "default",
					children: [
						{
							id: "default",
							name: "示例宝宝",
							birthDate: "2024-01-01",
							stage: "toddler",
						},
					],
					memoryStats: {
						children: 1,
						facts: 8,
						episodes: 7,
						sessions: 5,
						feedback: 4,
						unsyncedDeltas: 1,
					},
				})}
				dispatch={dispatch}
			/>,
		);
		expect(
			screen.getByTestId("development-insight-graph-panel"),
		).toHaveTextContent("Development Insight Graph");
		expect(
			screen.getByTestId("development-insight-graph-panel"),
		).toHaveTextContent("4 observations");
		expect(
			screen.getByTestId("development-graph-node-2026-01-sleep"),
		).toHaveTextContent("sleep");
		fireEvent.click(screen.getByTestId("development-graph-review"));
		fireEvent.click(screen.getByTestId("development-graph-compare"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("development review"),
			}),
		);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("compare sleep"),
			}),
		);
	});

	it("renders the weekly coaching and parent stress plan in the main dashboard", () => {
		const dispatch = vi.fn();
		render(
			<MemoryPanel
				state={makeState({
					selectedChildId: "default",
					children: [
						{
							id: "default",
							name: "示例宝宝",
							birthDate: "2024-01-01",
							stage: "toddler",
						},
					],
					question: "睡前拖延，家长也很崩溃",
					memoryStats: {
						children: 1,
						facts: 6,
						episodes: 5,
						sessions: 4,
						feedback: 3,
						unsyncedDeltas: 1,
					},
				})}
				dispatch={dispatch}
			/>,
		);
		expect(
			screen.getByTestId("weekly-coaching-stress-panel"),
		).toHaveTextContent("7-day personalized plan");
		expect(
			screen.getByTestId("weekly-coaching-stress-panel"),
		).toHaveTextContent("high parent stress");
		expect(screen.getByTestId("weekly-plan-day-1")).toHaveTextContent(
			"10-minute",
		);
		fireEvent.click(screen.getByTestId("weekly-coaching-start"));
		fireEvent.click(screen.getByTestId("parent-stress-recovery"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("weekly coaching"),
			}),
		);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("pause-before-response"),
			}),
		);
	});

	it("renders the unattended 1-6 completion pack hub in the main dashboard", () => {
		const dispatch = vi.fn();
		render(
			<MemoryPanel
				state={makeState({
					selectedChildId: "teen",
					children: [
						{
							id: "default",
							name: "示例宝宝",
							birthDate: "2024-01-01",
							stage: "toddler",
						},
						{
							id: "teen",
							name: "阿宁",
							birthDate: "2012-01-01",
							stage: "teen",
						},
					],
					question: "阿宁最近晚睡，家里老人和保姆交接也不一致",
					memoryStats: {
						children: 2,
						facts: 8,
						episodes: 6,
						sessions: 4,
						feedback: 3,
						unsyncedDeltas: 2,
					},
				})}
				dispatch={dispatch}
			/>,
		);
		expect(
			screen.getByTestId("parenting-completion-pack-panel"),
		).toHaveTextContent("6/6 completion directions ready");
		for (const id of [
			"open-caregiver-handoff",
			"review-evidence-confidence",
			"start-offline-coach",
			"compare-child-trends",
			"run-stress-intervention",
			"open-delivery-evidence-center",
		]) {
			expect(screen.getByTestId(`completion-action-${id}`)).toBeEnabled();
		}
		fireEvent.click(screen.getByTestId("completion-action-open-caregiver-handoff"));
		fireEvent.click(screen.getByTestId("completion-action-open-delivery-evidence-center"));
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("handoff"),
			}),
		);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "setQuestion",
				question: expect.stringContaining("P-20260625-017"),
			}),
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
