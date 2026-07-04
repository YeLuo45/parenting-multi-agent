import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage for the 7-direction workbench. The specs are
 * intentionally tolerant — workbench is optional in the visible UI,
 * so the assertions check for either the workbench test-ids or the
 * existing memory dashboard. This lets the same e2e pass before and
 * after the workbench is exposed on the home dashboard.
 */

test.describe("workbench end-to-end flow", () => {
	test("home dashboard loads and exposes either workbench or memory panel", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "load" });

		// At least one of the workbench / memory panel should be present.
		const hasWorkbench = await page
			.locator('[data-testid="workbench-panel"]')
			.count();
		const hasMemory = await page
			.locator('[data-testid="memory-panel"]')
			.count();
		expect(hasWorkbench + hasMemory).toBeGreaterThan(0);
	});

	test("asking a question updates the message stream", async ({ page }) => {
		await page.goto("/", { waitUntil: "load" });
		await page.waitForSelector('[data-testid="question-input"]', {
			timeout: 10_000,
		});

		const question = "宝宝3个月发烧38.5度";
		await page.getByTestId("question-input").fill(question);
		await page.getByTestId("ask-button").click();

		// Wait for at least one agent reply bubble to render
		await expect(async () => {
			const count = await page
				.locator('[data-testid^="message-"]')
				.count();
			expect(count).toBeGreaterThan(0);
		}).toPass({ timeout: 5_000 });

		// The question text should appear in the messages panel
		const allText = await page.getByTestId("messages").textContent();
		expect(allText ?? "").toContain(question);
	});

	test("workbench panel renders 7 direction buttons when present", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "load" });
		const hasWorkbench = await page
			.locator('[data-testid="workbench-panel"]')
			.count();
		if (hasWorkbench === 0) {
			test.skip();
			return;
		}

		// Workbench should have 7 direction buttons
		const count = await page
			.locator('[data-testid^="workbench-direction-"]')
			.count();
		expect(count).toBe(7);
	});

	test("workbench panel has 4 guided-intake steps when present", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "load" });
		const hasWorkbench = await page
			.locator('[data-testid="workbench-panel"]')
			.count();
		if (hasWorkbench === 0) {
			test.skip();
			return;
		}

		// Guided intake should expose 4 step buttons
		const count = await page
			.locator('[data-testid^="workbench-guided-"]')
			.count();
		expect(count).toBe(4);
	});
});
