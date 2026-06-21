import { expect, test } from "@playwright/test";

test.describe("theme switching", () => {
	test("switching theme updates CSS variables on documentElement", async ({ page }) => {
		await page.goto("/", { waitUntil: "load" });
		await page.waitForSelector('[data-testid="theme-select"]', { timeout: 10_000 });

		const select = page.getByTestId("theme-select");

		await select.selectOption("light");
		const lightBg = await page.evaluate(
			() => document.documentElement.style.getPropertyValue("--bg"),
		);
		expect(lightBg).not.toBe("");

		await select.selectOption("dark");
		const darkBg = await page.evaluate(
			() => document.documentElement.style.getPropertyValue("--bg"),
		);
		expect(darkBg).not.toBe("");
		expect(darkBg).not.toBe(lightBg);

		await select.selectOption("nord");
		const nordBg = await page.evaluate(
			() => document.documentElement.style.getPropertyValue("--bg"),
		);
		expect(nordBg).not.toBe("");
		expect(nordBg).not.toBe(darkBg);

		await select.selectOption("sepia");
		const sepiaBg = await page.evaluate(
			() => document.documentElement.style.getPropertyValue("--bg"),
		);
		expect(sepiaBg).not.toBe("");
		expect(sepiaBg).not.toBe(nordBg);
	});

	test("theme persists across reload via localStorage", async ({ page }) => {
		await page.goto("/", { waitUntil: "load" });
		await page.waitForSelector('[data-testid="theme-select"]', { timeout: 10_000 });

		const select = page.getByTestId("theme-select");
		await select.selectOption("dark");

		const stored = await page.evaluate(() => localStorage.getItem("parenting:theme"));
		expect(stored).toBe("dark");

		await page.reload({ waitUntil: "load" });
		await page.waitForSelector('[data-testid="theme-select"]', { timeout: 10_000 });

		const darkBg = await page.evaluate(
			() => document.documentElement.style.getPropertyValue("--bg"),
		);
		expect(darkBg).not.toBe("");
	});
});