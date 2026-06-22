import { expect, test } from "@playwright/test";

test.describe("ask flow", () => {
	test("asking an emergency question produces an agent reply", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "load" });
		await page.waitForSelector('[data-testid="question-input"]', {
			timeout: 10_000,
		});
		await expect(page.getByTestId("question-input")).toBeEnabled();

		const emergencyText = "我家宝宝3个月发烧38.5度怎么办";
		await page.getByTestId("question-input").fill(emergencyText);
		await page.getByTestId("ask-button").click();

		// Wait for at least one agent bubble to appear
		await expect(async () => {
			const count = await page
				.locator('[data-testid^="message-"]')
				.count();
			expect(count).toBeGreaterThan(0);
		}).toPass({ timeout: 5_000 });

		// Verify the question text appears somewhere in the messages panel
		const allText = await page.getByTestId("messages").textContent();
		expect(allText ?? "").toContain(emergencyText);
	});

	test("empty question keeps ask button disabled and messages empty", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "load" });
		await page.waitForSelector('[data-testid="ask-button"]', {
			timeout: 10_000,
		});

		const askButton = page.getByTestId("ask-button");
		await expect(askButton).toBeDisabled();
		await expect(page.locator('[data-testid^="message-"]')).toHaveCount(0);
	});
});
