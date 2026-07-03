import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { WorkbenchPanel, createParentingApp } from "../src/index.js";
import { initialState } from "../src/view.js";

let container: HTMLDivElement;

beforeEach(() => {
	cleanup();
	container = document.createElement("div");
	document.body.appendChild(container);
});

afterEach(() => cleanup());

describe("workbench panel", () => {
	it("renders directions, guided intake steps, and agent DAG buttons", () => {
		const { App } = createParentingApp();
		render(<App />);
		expect(
			document.querySelectorAll('[data-testid^="workbench-direction-"]')
				.length,
		).toBeGreaterThan(0);
		expect(
			document.querySelectorAll('[data-testid^="workbench-guided-"]')
				.length,
		).toBeGreaterThanOrEqual(4);
		expect(
			document.querySelectorAll('[data-testid^="workbench-dag-btn-"]')
				.length,
		).toBeGreaterThan(0);
	});

	it("shows a no-reply fallback when the agent has no messages", () => {
		render(
			<WorkbenchPanel state={initialState} dispatch={() => undefined} />,
		);
		expect(
			document.querySelector('[data-testid="workbench-dag-shortcut"]')
				?.textContent,
		).toBe("no agent reply yet");
	});
});
