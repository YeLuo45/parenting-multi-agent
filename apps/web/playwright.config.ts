import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e config for @parenting/web.
 *
 * - webServer: `vite preview` against an `e2e`-built dist (base=./) so tests
 *   don't depend on the deployed base path.
 * - Currently LIMITED to DOM-mount smoke tests because the production bundle
 *   triggers a React 19 + react-dom-client "r is not a function" runtime error
 *   that needs a separate fix in apps/web. The CI gate (npm run test:coverage)
 *   already covers component behaviour via jsdom + RTL.
 *
 * TODO: expand e2e specs after the React 19 production-mount issue is fixed.
 */
export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.spec.ts",
	timeout: 30_000,
	expect: { timeout: 5_000 },
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI
		? [["list"], ["github"]]
		: [
				["list"],
				["html", { open: "never", outputFolder: "playwright-report" }],
			],
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run preview:e2e -- --port 4173 --host 127.0.0.1",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
		stdout: "ignore",
		stderr: "pipe",
	},
});
