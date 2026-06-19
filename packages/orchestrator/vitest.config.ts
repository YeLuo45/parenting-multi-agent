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
		},
	},
});
