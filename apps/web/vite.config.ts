import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	base: "/parenting-multi-agent/",
	plugins: [react()],
	resolve: {
		alias: {
			"@parenting/memory": new URL("./src/memory-helpers.ts", import.meta.url).pathname,
		},
	},
	build: {
		outDir: "dist",
		sourcemap: true,
	},
});
