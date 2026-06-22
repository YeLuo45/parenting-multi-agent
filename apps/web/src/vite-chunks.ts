export function parentingManualChunks(id: string): string | undefined {
	if (
		id.includes("node_modules/react") ||
		id.includes("node_modules/react-dom")
	) {
		return "vendor-react";
	}
	if (
		id.includes("/packages/agents/") ||
		id.includes("/packages/memory/") ||
		id.includes("/packages/orchestrator/") ||
		id.includes("/apps/web/src/memory-") ||
		id.includes("/apps/web/src/orchestrator")
	) {
		return "parenting-runtime";
	}
	return undefined;
}
