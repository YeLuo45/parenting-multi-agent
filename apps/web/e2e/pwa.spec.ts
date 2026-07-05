import { expect, test } from "@playwright/test";

/**
 * Smoke checks for the Progressive Web App shell:
 *  - manifest.webmanifest is reachable and well-formed JSON
 *  - sw.js is served at the public /sw.js URL
 *  - the index.html references the manifest + the service worker
 *    registration script (executed client-side, so we only assert
 *    the HTML link/manifest tags here).
 *
 * Runtime registration is covered indirectly by the other e2e
 * specs (they would 503 / hang if the SW layer broke the bundle).
 */
test.describe("pwa manifest + service worker", () => {
	test("manifest.webmanifest is served with a name and theme color", async ({
		request,
	}) => {
		const res = await request.get("/manifest.webmanifest");
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.name).toBe("parenting-multi-agent");
		expect(body.theme_color).toBeTruthy();
		expect(Array.isArray(body.icons)).toBe(true);
		expect(body.icons.length).toBeGreaterThan(0);
	});

	test("sw.js is served at /sw.js with a no-cache (or 200) response", async ({
		request,
	}) => {
		const res = await request.get("/sw.js");
		expect(res.status()).toBe(200);
		const text = await res.text();
		expect(text).toContain("CACHE_VERSION");
	});

	test("index.html links the manifest", async ({ page }) => {
		await page.goto("/", { waitUntil: "load" });
		const html = await page.content();
		expect(html).toContain('rel="manifest"');
	});
});
