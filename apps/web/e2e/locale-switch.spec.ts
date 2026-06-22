import { expect, test } from "@playwright/test";

test.describe("locale switching", () => {
	test("switching locale changes chat title text", async ({ page }) => {
		await page.goto("/", { waitUntil: "load" });
		await page.waitForSelector('[data-testid="locale-select"]', {
			timeout: 10_000,
		});

		const select = page.getByTestId("locale-select");

		// Default locale is zh-CN: chat title contains "对话"
		await expect(page.getByTestId("chat-panel")).toContainText("对话");

		await select.selectOption("en");

		// After switch: chat title should now contain "Chat"
		await expect(page.getByTestId("chat-panel")).toContainText("Chat");
	});
});
