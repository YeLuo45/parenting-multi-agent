import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootNodeModules = new URL("../../node_modules/", import.meta.url)
	.pathname;

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			react: `${rootNodeModules}react`,
			"react-dom": `${rootNodeModules}react-dom`,
			"react/jsx-runtime": `${rootNodeModules}react/jsx-runtime.js`,
			"react-dom/client": `${rootNodeModules}react-dom/client.js`,
		},
	},
	test: {
		globals: false,
		environment: "jsdom",
		setupFiles: ["./test/setup.ts"],
		include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
		env: {
			NODE_ENV: "development",
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "text-summary"],
			include: ["src/**/*.ts", "src/**/*.tsx"],
			thresholds: {
				lines: 90,
				branches: 90,
				functions: 90,
				statements: 90,
			},
		},
	},
});
