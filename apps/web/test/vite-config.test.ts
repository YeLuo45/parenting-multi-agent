import { describe, expect, it } from "vitest";
import { parentingManualChunks } from "../src/vite-chunks.js";

describe("vite bundle splitting", () => {
	it("defines manual chunks for react and parenting workspaces", () => {
		expect(parentingManualChunks("/node_modules/react/index.js")).toBe(
			"vendor-react",
		);
		expect(parentingManualChunks("/node_modules/react-dom/client.js")).toBe(
			"vendor-react",
		);
		expect(
			parentingManualChunks("/packages/agents/pediatrician/src/index.ts"),
		).toBe("parenting-runtime");
		expect(parentingManualChunks("/packages/memory/src/index.ts")).toBe(
			"parenting-runtime",
		);
		expect(parentingManualChunks("/apps/web/src/orchestrator.ts")).toBe(
			"parenting-runtime",
		);
		expect(
			parentingManualChunks("/apps/web/src/components.tsx"),
		).toBeUndefined();
	});
});
