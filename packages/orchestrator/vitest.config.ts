import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: false,
		environment: "node",
		include: ["test/**/*.test.ts"],
	},
	resolve: {
		alias: {
			"@parenting/memory": new URL("../memory/src/index.ts", import.meta.url).pathname,
			"@parenting/orchestrator": new URL("./src/index.ts", import.meta.url).pathname,
			"@parenting/agent-pediatrician": new URL("../agents/pediatrician/src/index.ts", import.meta.url).pathname,
			"@parenting/agent-psychologist": new URL("../agents/psychologist/src/index.ts", import.meta.url).pathname,
			"@parenting/agent-educator": new URL("../agents/educator/src/index.ts", import.meta.url).pathname,
		},
	},
});
