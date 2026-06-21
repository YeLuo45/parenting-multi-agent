import { expect, test } from "@playwright/test";

test.describe("default render", () => {
	test("app shell renders header, children panel and chat panel with default child", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (e) => errors.push(e.message));

		await page.goto("/", { waitUntil: "load" });
		// Wait for the React app to mount; if the production bundle has a
		// React 19 mount issue, the test will fail loudly here so we don't
		// silently pass on broken UI.
		await page.waitForSelector('[data-testid="app-root"]', { timeout: 10_000 });

		await expect(page.getByTestId("app-root")).toBeVisible();
		await expect(page.getByTestId("app-header")).toBeVisible();
		await expect(page.getByTestId("children-panel")).toBeVisible();
		await expect(page.getByTestId("chat-panel")).toBeVisible();
		await expect(page.getByTestId("composer")).toBeVisible();

		// 18 specialist agents are pre-registered
		const title = await page.getByTestId("app-title").textContent();
		expect(title ?? "").toContain("18 agents");

		// Default child is auto-created
		await expect(page.getByTestId("children-list")).toBeVisible();
		await expect(page.getByTestId("no-children")).toHaveCount(0);

		// No uncaught page errors during mount
		expect(errors).toEqual([]);
	});
});