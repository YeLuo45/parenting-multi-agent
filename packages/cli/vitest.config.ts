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
			thresholds: {
				lines: 95,
				branches: 95,
				functions: 95,
				statements: 95,
			},
		},
	},
	resolve: {
		alias: {
			"@parenting/orchestrator": new URL(
				"../orchestrator/src/index.ts",
				import.meta.url,
			).pathname,
			"@parenting/memory": new URL(
				"../memory/src/index.ts",
				import.meta.url,
			).pathname,
			"@parenting/agent-pediatrician": new URL(
				"../agents/pediatrician/src/index.ts",
				import.meta.url,
			).pathname,
			"@parenting/agent-psychologist": new URL(
				"../agents/psychologist/src/index.ts",
				import.meta.url,
			).pathname,
			"@parenting/agent-educator": new URL(
				"../agents/educator/src/index.ts",
				import.meta.url,
			).pathname,
			"@parenting/agent-nutritionist": new URL(
				"../agents/nutritionist/src/index.ts",
				import.meta.url,
			).pathname,
			"@parenting/agent-sleep-coach": new URL(
				"../agents/sleep-coach/src/index.ts",
				import.meta.url,
			).pathname,
			"@parenting/agent-family-mediator": new URL(
				"../agents/family-mediator/src/index.ts",
				import.meta.url,
			).pathname,
			"@parenting/agent-finance": new URL(
				"../agents/finance/src/index.ts",
				import.meta.url,
			).pathname,
			"@parenting/agent-parent-support": new URL(
				"../agents/parent-support/src/index.ts",
				import.meta.url,
			).pathname,
		},
	},
});
