import { describe, expect, it } from "vitest";
import {
	CLEAR_SCREEN,
	colorize,
	completeTuiCommand,
	isWorkbenchDirection,
	paginateHistory,
	renderChildTabs,
	renderClearScreen,
	renderGoodbye,
	renderHistoryPage,
	renderWorkbenchPanel,
	WORKBENCH_DIRECTIONS,
} from "../src/ui.js";

describe("colorize", () => {
	it("wraps the text in ANSI codes when enabled", () => {
		const out = colorize("hello", "cyan", true);
		expect(out).toBe("\x1b[36mhello\x1b[0m");
	});

	it("returns the plain text when disabled", () => {
		expect(colorize("hello", "cyan", false)).toBe("hello");
	});
});

describe("renderChildTabs", () => {
	it("renders a placeholder when there are no children", () => {
		const out = renderChildTabs([], "default", true);
		expect(out).toContain("无孩子档案");
	});

	it("highlights the active child with cyan arrows", () => {
		const out = renderChildTabs(
			[
				{ id: "alice", name: "爱丽丝", stage: "toddler" },
				{ id: "bob", name: "鲍勃", stage: "preschool" },
			],
			"alice",
			true,
		);
		expect(out).toContain("\x1b[36m");
		expect(out).toContain("▸");
		expect(out).toContain("爱丽丝");
		expect(out).toContain("鲍勃");
	});

	it("does not emit ANSI codes when color is disabled", () => {
		const out = renderChildTabs(
			[{ id: "alice", name: "爱丽丝", stage: "toddler" }],
			"alice",
			false,
		);
		expect(out).not.toContain("\x1b[");
	});
});

describe("paginateHistory", () => {
	const items = [1, 2, 3, 4, 5, 6, 7];

	it("returns the first page", () => {
		expect(paginateHistory(items, 1, 3)).toEqual([1, 2, 3]);
	});

	it("returns the requested page", () => {
		expect(paginateHistory(items, 2, 3)).toEqual([4, 5, 6]);
	});

	it("returns the last page when overflowing", () => {
		expect(paginateHistory(items, 99, 3)).toEqual([7]);
	});

	it("returns the first page when underflowing", () => {
		expect(paginateHistory(items, 0, 3)).toEqual([1, 2, 3]);
	});

	it("returns the first page for negative pages", () => {
		expect(paginateHistory(items, -1, 3)).toEqual([1, 2, 3]);
	});

	it("returns an empty array for empty inputs", () => {
		expect(paginateHistory([], 1, 3)).toEqual([]);
	});

	it("returns an empty array for non-positive pageSize", () => {
		expect(paginateHistory(items, 1, 0)).toEqual([]);
	});
});

describe("renderHistoryPage", () => {
	const entries = [
		{ question: "Q1", answer: "A1" },
		{ question: "Q2", answer: "A2" },
		{ question: "Q3", answer: "A3" },
	];

	it("renders the requested page with a footer", () => {
		const out = renderHistoryPage(entries, { page: 1, pageSize: 2 });
		expect(out).toContain("Q1");
		expect(out).toContain("Q2");
		expect(out).not.toContain("Q3");
		expect(out).toContain("page 1/2");
	});

	it("clamps the page to the last when overflowing", () => {
		const out = renderHistoryPage(entries, { page: 99, pageSize: 2 });
		expect(out).toContain("Q3");
		expect(out).toContain("page 2/2");
	});

	it("renders an empty placeholder when no entries", () => {
		expect(renderHistoryPage([], { page: 1, pageSize: 5 })).toContain("暂无历史");
	});

	it("rejects non-positive pageSize", () => {
		expect(renderHistoryPage(entries, { page: 1, pageSize: 0 })).toContain("pageSize");
	});

	it("disables color when enabled=false", () => {
		const out = renderHistoryPage(entries, { page: 1, pageSize: 2, enabled: false });
		expect(out).not.toContain("\x1b[");
	});
});

describe("completeTuiCommand", () => {
	it("filters commands by the partial input", () => {
		expect(completeTuiCommand("/h")).toEqual(["/history", "/help"]);
	});

	it("returns all commands for /", () => {
		expect(completeTuiCommand("/")).toEqual([
			"/list",
			"/use ",
			"/history",
			"/help",
			"/quit",
			"/clear",
		]);
	});

	it("returns an empty array for non-slash input", () => {
		expect(completeTuiCommand("hello")).toEqual([]);
	});

	it("returns an empty array for unmatched prefix", () => {
		expect(completeTuiCommand("/z")).toEqual([]);
	});

	it("is case-insensitive", () => {
		expect(completeTuiCommand("/Q")).toEqual(["/quit"]);
	});
});

describe("renderGoodbye", () => {
	it("contains the goodbye message", () => {
		expect(renderGoodbye(true)).toContain("👋 再见");
		expect(renderGoodbye(true)).toContain("记忆已保存");
	});

	it("disables color when requested", () => {
		expect(renderGoodbye(false)).not.toContain("\x1b[");
	});
});

describe("renderClearScreen", () => {
	it("returns the clear-screen sequence when enabled", () => {
		expect(renderClearScreen(true)).toBe(CLEAR_SCREEN);
	});

	it("returns an empty string when disabled", () => {
		expect(renderClearScreen(false)).toBe("");
	});
});

describe("renderWorkbenchPanel", () => {
	const state = {
		selectedChildId: "alice",
		completedSteps: 2,
		totalSteps: 4,
		completedHorizons: 1,
		totalHorizons: 3,
		hintCount: 2,
	};

	it("renders the workbench header", () => {
		expect(renderWorkbenchPanel(state)).toContain("Workbench 7 方向");
	});

	it("lists all 7 directions", () => {
		const out = renderWorkbenchPanel(state);
		for (const id of [
			"scenario-intake",
			"agent-collaboration",
			"action-plan",
			"growth-timeline",
			"high-risk-safety",
			"family-collaboration",
			"retrospective",
		]) {
			expect(out).toContain(id);
		}
	});

	it("shows the selected child id", () => {
		expect(renderWorkbenchPanel(state)).toContain("alice");
	});

	it("shows the progress counters", () => {
		const out = renderWorkbenchPanel(state);
		expect(out).toContain("2/4"); // intake
		expect(out).toContain("1/3"); // action board
		expect(out).toContain("2"); // hint count
	});

	it("flags no child when selectedChildId is null", () => {
		const out = renderWorkbenchPanel({ ...state, selectedChildId: null });
		expect(out).toContain("(未选)");
	});

	it("omits ANSI when disabled", () => {
		expect(renderWorkbenchPanel(state, false)).not.toContain("\x1b[");
	});
});

describe("isWorkbenchDirection", () => {
	it("accepts each canonical direction", () => {
		for (const id of [
			"scenario-intake",
			"agent-collaboration",
			"action-plan",
			"growth-timeline",
			"high-risk-safety",
			"family-collaboration",
			"retrospective",
		]) {
			expect(isWorkbenchDirection(id)).toBe(true);
		}
	});

	it("rejects non-direction strings", () => {
		expect(isWorkbenchDirection("nope")).toBe(false);
		expect(isWorkbenchDirection("")).toBe(false);
		expect(isWorkbenchDirection("scenario")).toBe(false);
	});
});

describe("WORKBENCH_DIRECTIONS export", () => {
	it("contains exactly 7 directions", () => {
		expect(WORKBENCH_DIRECTIONS).toHaveLength(7);
	});

	it("is a readonly tuple", () => {
		// as const — should be readonly
		expect(Array.isArray(WORKBENCH_DIRECTIONS)).toBe(true);
	});
});
