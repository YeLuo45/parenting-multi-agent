import { describe, expect, it } from "vitest";
import {
	buildIterationSuite,
	buildScenarioPack,
	buildProviderConfigSnapshot,
	buildReleaseGatePlan,
} from "../src/index.js";

describe("web unattended iteration suite", () => {
	it("summarizes all seven requested iteration directions in ROI order", () => {
		const suite = buildIterationSuite({
			children: 2,
			facts: 4,
			episodes: 3,
			sessions: 1,
			feedback: 2,
			unsyncedDeltas: 1,
		});
		expect(suite.directions.map((direction) => direction.id)).toEqual([
			"web-convergence",
			"memory-timeline",
			"llm-provider-config",
			"acceptance-evidence",
			"offline-sync-queue",
			"scenario-pack",
			"release-gate",
		]);
		expect(suite.readyCount).toBe(7);
		expect(suite.summary).toContain("7/7");
	});

	it("builds a visible scenario pack for common parenting cases", () => {
		const pack = buildScenarioPack();
		expect(pack).toHaveLength(7);
		expect(pack.map((scenario) => scenario.id)).toContain("bedtime-delay");
		expect(pack[0]).toMatchObject({ childStage: "toddler", agentIds: expect.arrayContaining(["sleep-coach"]) });
	});

	it("reports provider readiness and rule fallback without requiring an API key", () => {
		const snapshot = buildProviderConfigSnapshot({
			primaryProviderId: "remote-llm",
			fallbackProviderId: "rule-fallback",
			ready: false,
		});
		expect(snapshot.mode).toBe("fallback");
		expect(snapshot.statusText).toContain("rule-fallback");
		expect(snapshot.needsApiKey).toBe(true);
	});

	it("reports primary provider mode when the configured LLM is ready", () => {
		const snapshot = buildProviderConfigSnapshot({
			primaryProviderId: "remote-llm",
			fallbackProviderId: "rule-fallback",
			ready: true,
		});
		expect(snapshot.mode).toBe("primary");
		expect(snapshot.statusText).toContain("remote-llm");
		expect(snapshot.needsApiKey).toBe(false);
	});

	it("hardens release verification into a single command plan", () => {
		const gate = buildReleaseGatePlan();
		expect(gate.command).toBe("npm run release:gate");
		expect(gate.steps.map((step) => step.id)).toEqual([
			"test",
			"coverage",
			"readme",
			"build",
			"smoke",
		]);
		expect(gate.steps.every((step) => step.required)).toBe(true);
	});
});
