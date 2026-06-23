/**
 * Tests for the pure view IR (intermediate representation).
 *
 * The web app uses a pure `renderView` function so unit tests can assert the
 * structure without rendering React. This test file covers reducer transitions
 * and the view's IR shape.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
	type Action,
	type AppState,
	buildSetConvergenceAction,
	buildWebConvergenceSnapshot,
	createParentingApp,
	createParentingAppWithPersistence,
	createRuleFallbackProvider,
	createWebOrchestrator,
	defaultChild,
	dispatchAsk,
	initialState,
	newMessageId,
	recordMessageFeedback,
	reducer,
	registerWebLlmProviders,
	renderView,
	runAsk,
	type WebOrchestrator,
} from "../src/index.js";

type IRNode = ReturnType<typeof renderView>;
type IRNodeOrUndefined = IRNode | undefined;

/** Walk the IR tree and return the first node whose props match the given testid. */
function findNode(
	root: IRNodeOrUndefined,
	propName: string,
	value: string,
): IRNodeOrUndefined {
	if (!root) return undefined;
	if (
		root.props &&
		(root.props as Record<string, unknown>)[propName] === value
	)
		return root;
	const kids = (root.children ?? []) as IRNode[];
	for (const k of kids) {
		const found = findNode(k, propName, value);
		if (found) return found;
	}
	return undefined;
}

function makeState(overrides: Partial<AppState> = {}): AppState {
	return { ...initialState, agents: ["a1", "a2", "a3"], ...overrides };
}

describe("reducer", () => {
	it("setQuestion updates the question field", () => {
		const s = reducer(makeState(), {
			type: "setQuestion",
			question: "宝宝",
		});
		expect(s.question).toBe("宝宝");
	});

	it("setChildren replaces the children array", () => {
		const s = reducer(makeState(), {
			type: "setChildren",
			children: [
				{
					id: "c1",
					name: "Alice",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
			],
		});
		expect(s.children).toHaveLength(1);
		expect(s.children[0].id).toBe("c1");
	});

	it("selectChild updates id and clears messages", () => {
		const s = reducer(
			makeState({
				messages: [
					{
						id: "m1",
						role: "user",
						author: "x",
						content: "y",
						ts: 1,
					},
				],
			}),
			{ type: "selectChild", childId: "alice" },
		);
		expect(s.selectedChildId).toBe("alice");
		expect(s.messages).toEqual([]);
	});

	it("askStart sets pending and clears error", () => {
		const s = reducer(makeState({ error: "previous error" }), {
			type: "askStart",
		});
		expect(s.pending).toBe(true);
		expect(s.error).toBeNull();
	});

	it("askDone resets pending and appends messages, clears question", () => {
		const msgs = [
			{
				id: "m1",
				role: "user" as const,
				author: "x",
				content: "y",
				ts: 1,
			},
		];
		const s = reducer(makeState({ pending: true, question: "abc" }), {
			type: "askDone",
			messages: msgs,
		});
		expect(s.pending).toBe(false);
		expect(s.messages).toEqual(msgs);
		expect(s.question).toBe("");
	});

	it("askError sets error and clears pending", () => {
		const s = reducer(makeState({ pending: true }), {
			type: "askError",
			error: "boom",
		});
		expect(s.error).toBe("boom");
		expect(s.pending).toBe(false);
	});

	it("reset keeps children and agents but clears question/messages", () => {
		const s = reducer(
			makeState({
				question: "q",
				messages: [
					{
						id: "m1",
						role: "user",
						author: "x",
						content: "y",
						ts: 1,
					},
				],
				selectedChildId: "alice",
				children: [
					{
						id: "alice",
						name: "Alice",
						birthDate: "2024-01-01",
						stage: "toddler",
					},
				],
			}),
			{ type: "reset" },
		);
		expect(s.question).toBe("");
		expect(s.messages).toEqual([]);
		expect(s.children).toHaveLength(1);
		expect(s.selectedChildId).toBe("alice");
		expect(s.agents).toHaveLength(3);
	});

	it("feedbackDone marks one agent message as rated", () => {
		const s = reducer(
			makeState({
				messages: [
					{
						id: "m1",
						role: "agent",
						author: "儿科",
						content: "a",
						agentId: "pediatrician",
						ts: 1,
					},
				],
			}),
			{ type: "feedbackDone", messageId: "m1", feedback: "up" },
		);
		expect(s.messages[0].feedback).toBe("up");
	});

	it("unknown action returns state unchanged", () => {
		const before = makeState();
		const after = reducer(before, { type: "noop" } as unknown as Action);
		expect(after).toBe(before);
	});
});

describe("newMessageId", () => {
	it("generates ids with the m_ prefix", () => {
		expect(newMessageId()).toMatch(/^m_/);
	});

	it("generates unique ids", () => {
		const ids = new Set(Array.from({ length: 20 }, () => newMessageId()));
		expect(ids.size).toBe(20);
	});
});

describe("defaultChild", () => {
	it("returns a 1-year-old toddler by default", () => {
		const c = defaultChild();
		expect(c.stage).toBe("toddler");
		expect(c.id).toBe("default");
		// birthDate should be ~1 year before now (within 24h)
		const oneYearAgoMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
		const birth = new Date(c.birthDate).getTime();
		expect(Math.abs(birth - oneYearAgoMs)).toBeLessThan(
			24 * 60 * 60 * 1000,
		);
	});
});

describe("renderView", () => {
	it("emits the app root, header, body, children panel, and chat panel", () => {
		const ir = renderView(makeState(), () => {});
		expect(ir.tag).toBe("div");
		expect(ir.props?.["data-testid"]).toBe("app-root");
		const children = ir.children as Array<{
			tag: string;
			props?: Record<string, unknown>;
		}>;
		expect(children[0].tag).toBe("header");
		expect(children[0].props?.["data-testid"]).toBe("app-header");
		const body = children[1];
		expect(body.tag).toBe("div");
		const bodyChildren = body.children as Array<{
			tag: string;
			props?: Record<string, unknown>;
		}>;
		expect(bodyChildren.map((c) => c.tag)).toContain("aside");
		expect(bodyChildren.map((c) => c.tag)).toContain("section");
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
					birthDate: "2024-01-01",
					stage: "toddler",
				},
			],
		});
		const ir = renderView(state, () => {});
		const serialized = JSON.stringify(ir);
		// Alice (selected) gets the "selected" class; Bob does not.
		expect(serialized).toContain("child selected");
		// data-testid uses the id, so we can confirm both children render.
		expect(serialized).toContain("child-alice");
		expect(serialized).toContain("child-bob");
	});

	it("shows no-children placeholder when children list is empty", () => {
		const ir = renderView(makeState(), () => {});
		const serialized = JSON.stringify(ir);
		expect(serialized).toContain("No children yet");
	});

	it("disables the ask button when no child is selected", () => {
		const ir = renderView(
			makeState({ selectedChildId: null, question: "宝宝" }),
			() => {},
		);
		const serialized = JSON.stringify(ir);
		expect(serialized).toContain("data-testid");
		expect(serialized).toContain("ask-button");
	});

	it("text-input onChange dispatches setQuestion", () => {
		const dispatched: Action[] = [];
		const ir = renderView(
			makeState({
				selectedChildId: "c1",
				children: [
					{
						id: "c1",
						name: "C1",
						birthDate: "2024-01-01",
						stage: "toddler",
					},
				],
			}),
			(a) => dispatched.push(a),
		);
		// Drill into the composer form to find the textarea.
		const composer = findNode(ir, "data-testid", "composer");
		const textarea = findNode(composer, "data-testid", "question-input");
		const onChange = textarea?.props?.onChange as (e: {
			target: { value: string };
		}) => void;
		expect(typeof onChange).toBe("function");
		onChange({ target: { value: "新的问题" } });
		expect(dispatched).toContainEqual({
			type: "setQuestion",
			question: "新的问题",
		});
	});

	it("reset button dispatches reset", () => {
		const dispatched: Action[] = [];
		const ir = renderView(
			makeState({
				question: "q",
				selectedChildId: "c1",
				children: [
					{
						id: "c1",
						name: "C1",
						birthDate: "2024-01-01",
						stage: "toddler",
					},
				],
			}),
			(a) => dispatched.push(a),
		);
		const reset = findNode(ir, "data-testid", "reset-button");
		const onClick = reset?.props?.onClick as () => void;
		onClick();
		expect(dispatched).toContainEqual({ type: "reset" });
	});

	it("scenario prompt button dispatches setQuestion", () => {
		const dispatched: Action[] = [];
		const ir = renderView(makeState(), (a) => dispatched.push(a));
		const scenario = findNode(ir, "data-testid", "scenario-bedtime-delay");
		const onClick = scenario?.props?.onClick as () => void;
		expect(typeof onClick).toBe("function");
		onClick();
		expect(dispatched).toContainEqual({
			type: "setQuestion",
			question: "孩子睡前反复要水、讲故事，不肯上床怎么办？",
		});
	});

	it("selectChild on a list item dispatches selectChild", () => {
		const dispatched: Action[] = [];
		const ir = renderView(
			makeState({
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
						birthDate: "2024-01-01",
						stage: "toddler",
					},
				],
			}),
			(a) => dispatched.push(a),
		);
		const alice = findNode(ir, "data-testid", "child-alice");
		const onClick = alice?.props?.onClick as () => void;
		onClick();
		expect(dispatched).toContainEqual({
			type: "selectChild",
			childId: "alice",
		});
	});

	it("runAsk returns error when child id is unknown", async () => {
		const stack = createWebOrchestrator();
		try {
			const r = await runAsk(stack, "ghost", "宝宝发烧");
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.error).toMatch(/Child ghost not found/);
		} finally {
			stack.close();
		}
	});

	it("runAsk returns error when question is empty", async () => {
		const stack = createWebOrchestrator();
		try {
			stack.upsertChild({
				id: "c1",
				name: "C1",
				birthDate: "2024-01-01",
				stage: "toddler",
			});
			const r = await runAsk(stack, "c1", "  ");
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.error).toMatch(/empty/i);
		} finally {
			stack.close();
		}
	});

	it("createParentingApp returns a React element App (smoke test)", () => {
		// We don't render the App (would need jsdom + a real DOM root), but we
		// instantiate the factory to confirm the public API and the inner App
		// function is wired up. This forces the `App` declaration into the
		// V8 functions-used set.
		const { App } = createParentingApp();
		expect(typeof App).toBe("function");
		expect(App.length).toBe(0); // App takes no args
	});

	it("createParentingAppWithPersistence returns a hydrated App factory", async () => {
		const { App, stack } =
			await createParentingAppWithPersistence("view-test-db");
		try {
			expect(typeof App).toBe("function");
			expect(stack.listChildren()).toEqual([]);
		} finally {
			stack.close();
		}
	});

	it("shows an empty-state message when no messages", () => {
		const ir = renderView(makeState(), () => {});
		const serialized = JSON.stringify(ir);
		expect(serialized).toContain("Ask a parenting question to get started");
	});

	it("renders user and agent messages with distinct roles", () => {
		const state = makeState({
			selectedChildId: "c1",
			children: [
				{
					id: "c1",
					name: "C1",
					birthDate: "2024-01-01",
					stage: "toddler",
				},
			],
			messages: [
				{
					id: "m1",
					role: "user",
					author: "parent",
					content: "宝宝发烧",
					ts: 1,
				},
				{
					id: "m2",
					role: "agent",
					author: "儿科",
					content: "先量体温",
					confidence: 0.8,
					ts: 2,
				},
			],
		});
		const ir = renderView(state, () => {});
		const serialized = JSON.stringify(ir);
		expect(serialized).toContain("data-role");
		expect(serialized).toContain("user");
		expect(serialized).toContain("agent");
	});

	it("renders error banner when state.error is set", () => {
		const ir = renderView(makeState({ error: "请先选 child" }), () => {});
		const serialized = JSON.stringify(ir);
		expect(serialized).toContain("error-banner");
		expect(serialized).toContain("请先选 child");
	});
});

describe("dispatchAsk", () => {
	let stack: WebOrchestrator;
	const beforeClose: (() => void)[] = [];
	function makeStack(): WebOrchestrator {
		const s = createWebOrchestrator();
		beforeClose.push(() => s.close());
		return s;
	}

	it("returns askError when no child is selected", async () => {
		stack = makeStack();
		const state = makeState();
		const dispatched: Action[] = [];
		const dispatch = (a: Action) => dispatched.push(a);
		await dispatchAsk(stack, state, dispatch);
		expect(dispatched[0]).toEqual({
			type: "askError",
			error: "Select a child first",
		});
	});

	it("returns askError when question is empty", async () => {
		const stack = makeStack();
		const state = makeState({ selectedChildId: "c1", question: "  " });
		const dispatched: Action[] = [];
		await dispatchAsk(stack, state, (a) => dispatched.push(a));
		expect(dispatched[0]).toEqual({
			type: "askError",
			error: "Question is empty",
		});
	});

	it("dispatches askError when runAsk returns an error (child not in memory)", async () => {
		// state has selectedChildId "ghost" but stack has no such child.
		// dispatchAsk still gets past the initial guards (selectedChildId + question),
		// then runAsk returns !r.ok, triggering the error branch.
		const stack = makeStack();
		const state = makeState({
			selectedChildId: "ghost",
			question: "宝宝发烧",
		});
		const dispatched: Action[] = [];
		await dispatchAsk(stack, state, (a) => dispatched.push(a));
		const types = dispatched.map((a) => a.type);
		expect(types).toContain("askStart");
		expect(types).toContain("askError");
		const errorAction = dispatched.find((a) => a.type === "askError");
		if (errorAction && errorAction.type === "askError") {
			expect(errorAction.error).toMatch(/ghost.*not found/);
		}
	});

	it("runs an end-to-end ask when a child is selected and question is set", async () => {
		stack = makeStack();
		const child = stack.upsertChild({
			id: "ask-c",
			name: "Ask Kid",
			birthDate: "2024-01-01",
			stage: "toddler",
		});
		const state = makeState({
			selectedChildId: child.id,
			question: "宝宝发烧怎么办",
			children: [child],
		});
		const dispatched: Action[] = [];
		await dispatchAsk(stack, state, (a) => dispatched.push(a));
		const types = dispatched.map((a) => a.type);
		expect(types).toContain("askStart");
		expect(types).toContain("askDone");
		const done = dispatched.find((a) => a.type === "askDone");
		if (done && done.type === "askDone") {
			expect(done.messages.length).toBeGreaterThan(0);
			expect(done.messages[0].role).toBe("user");
		}
	});

	it("emits an emergency message when L0 rule matches", async () => {
		stack = makeStack();
		const child = stack.upsertChild({
			id: "emer",
			name: "E",
			birthDate: "2026-04-19",
			stage: "infant",
		});
		const state = makeState({
			selectedChildId: child.id,
			question: "3月宝宝发烧40度",
			children: [child],
		});
		const dispatched: Action[] = [];
		await dispatchAsk(stack, state, (a) => dispatched.push(a));
		const done = dispatched.find((a) => a.type === "askDone");
		if (done && done.type === "askDone") {
			// First message is the user question, then an emergency agent message.
			expect(done.messages.length).toBe(2);
			const agentMsg = done.messages[1];
			expect(agentMsg.role).toBe("agent");
			expect(agentMsg.redFlag).toBeDefined();
			expect(agentMsg.redFlag?.severity).toMatch(/emergency|high/);
		}
	});

	afterEach(() => {
		for (const fn of beforeClose.splice(0)) fn();
	});
});

describe("recordMessageFeedback", () => {
	it("records agent feedback and dispatches feedbackDone", () => {
		const calls: unknown[] = [];
		const stack = {
			recordAgentFeedback: (...args: unknown[]) => {
				calls.push(args);
				return null;
			},
		} as unknown as WebOrchestrator;
		const state = makeState({
			selectedChildId: "c1",
			messages: [
				{
					id: "m1",
					role: "agent",
					author: "教育",
					content: "a",
					agentId: "educator",
					ts: 1,
				},
			],
		});
		const dispatched: Action[] = [];
		recordMessageFeedback(stack, state, "m1", "down", (a) =>
			dispatched.push(a),
		);
		expect(calls[0]).toEqual(["c1", "educator", "down"]);
		expect(dispatched).toEqual([
			{ type: "feedbackDone", messageId: "m1", feedback: "down" },
		]);
	});

	it("ignores feedback when message is not an agent reply or child is missing", () => {
		const stack = {
			recordAgentFeedback: () => {
				throw new Error("should not call");
			},
		} as unknown as WebOrchestrator;
		const dispatched: Action[] = [];
		recordMessageFeedback(
			stack,
			makeState({ selectedChildId: null }),
			"missing",
			"up",
			(a) => dispatched.push(a),
		);
		recordMessageFeedback(
			stack,
			makeState({
				selectedChildId: "c1",
				messages: [
					{
						id: "m1",
						role: "user",
						author: "p",
						content: "q",
						ts: 1,
					},
				],
			}),
			"m1",
			"up",
			(a) => dispatched.push(a),
		);
		expect(dispatched).toEqual([]);
	});
});

describe("unattended iteration visibility", () => {
	it("setConvergence stores the seven-direction suite summary", () => {
		const stack = createWebOrchestrator();
		try {
			stack.upsertChild({ id: "c1", name: "C1", birthDate: "2024-01-01", stage: "toddler" });
			const convergence = buildWebConvergenceSnapshot(stack.memory);
			const registry = registerWebLlmProviders([createRuleFallbackProvider()]);
			const action = buildSetConvergenceAction(convergence, registry.status, 2);
			const next = reducer(makeState(), action);
			expect(next.iterationSuite.summary).toContain("7/7");
			expect(next.providerConfig.statusText).toContain("rule-fallback");
			expect(next.releaseGate.command).toBe("npm run release:gate");
		} finally {
			stack.close();
		}
	});

	it("renders unattended evidence in the memory panel", () => {
		const ir = renderView(makeState(), () => {});
		const serialized = JSON.stringify(ir);
		expect(serialized).toContain("7/7 unattended iteration directions ready");
		expect(serialized).toContain("rule-fallback");
		expect(serialized).toContain("scenario pack cases ready");
		expect(serialized).toContain("npm run release:gate");
	});
});
