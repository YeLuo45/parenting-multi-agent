import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const rootNodeModules = new URL("../../node_modules/", import.meta.url).pathname;

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
			thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
		},
	},
});
