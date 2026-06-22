import { expect, test } from "@playwright/test";

test("default render after upgrade", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("/", { waitUntil: "load" });
	await page.waitForTimeout(3000);
	console.log("ERRORS:", errors);
	const count = await page.locator('[data-testid="app-root"]').count();
	console.log("app-root count:", count);
	expect(count).toBeGreaterThan(0);
});
