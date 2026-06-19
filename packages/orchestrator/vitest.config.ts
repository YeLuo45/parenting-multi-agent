import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: false,
		environment: "node",
		include: ["test/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "text-summary"],
			include: ["src/**/*.ts"],
			exclude: ["src/index.ts"],
			thresholds: {
				lines: 100,
				branches: 100,
				functions: 100,
				statements: 100,
			},
		},
	},
	resolve: {
		alias: {
			"@parenting/memory": new URL("../memory/src/index.ts", import.meta.url).pathname,
		},
	},
});
