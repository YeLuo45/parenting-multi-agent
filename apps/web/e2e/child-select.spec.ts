import { expect, test } from "@playwright/test";

test.describe("reset flow", () => {
	test("reset button clears messages and question", async ({ page }) => {
		await page.goto("/", { waitUntil: "load" });
		await page.waitForSelector('[data-testid="question-input"]', {
			timeout: 10_000,
		});

		await page.getByTestId("question-input").fill("宝宝咳嗽");
		await page.getByTestId("ask-button").click();

		await expect(async () => {
			const count = await page
				.locator('[data-testid^="message-"]')
				.count();
			expect(count).toBeGreaterThan(0);
		}).toPass({ timeout: 5_000 });

		await page.getByTestId("reset-button").click();

		await expect(async () => {
			const count = await page
				.locator('[data-testid^="message-"]')
				.count();
			expect(count).toBe(0);
		}).toPass({ timeout: 2_000 });
	});
});
