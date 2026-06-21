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
			exclude: ["src/reader.ts", "src/bin.ts"],
			thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
		},
	},
	resolve: {
		alias: {
			"@parenting/cli": new URL("../cli/src/index.ts", import.meta.url).pathname,
			"@parenting/memory": new URL("../memory/src/index.ts", import.meta.url).pathname,
			"@parenting/orchestrator": new URL("../orchestrator/src/index.ts", import.meta.url).pathname,
		},
	},
});
