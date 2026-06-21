import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	base: "/parenting-multi-agent/",
	plugins: [react()],
	build: {
		outDir: "dist",
		sourcemap: true,
	},
});
