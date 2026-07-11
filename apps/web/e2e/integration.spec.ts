import { expect, test } from "@playwright/test";

/**
 * Direction X: persona + streak + chart integration e2e tests.
 *
 * Worker-side imports from the web source modules. These verify the
 * core logic that powers V/W features.
 */

test.describe("streak + achievement e2e (worker-side)", () => {
	test("recordCheckIn + earnedAchievements integration", async () => {
		const { emptyStreakState, recordCheckIn } = await import(
			"../../../packages/agents/habit-builder/src/streak.js"
		);
		const { earnedAchievements } = await import(
			"../../../packages/agents/habit-builder/src/achievements.js"
		);
		let state = emptyStreakState("h1", "c1");
		// Simulate 7 consecutive days at 24h intervals
		const now = Date.now();
		for (let i = 0; i < 7; i++) {
			state = recordCheckIn(state, now - (6 - i) * 24 * 60 * 60 * 1000);
		}
		const earned = earnedAchievements(state);
		const ids = earned.map((a) => a.id);
		expect(ids).toContain("streak_7");
		expect(state.currentStreak).toBeGreaterThanOrEqual(7);
	});

	test("buildVaccineSchedule detects overdue", async () => {
		const { buildVaccineSchedule, formatVaccineReminder } = await import(
			"../../../packages/agents/pediatrician/src/vaccine.js"
		);
		const schedule = buildVaccineSchedule("2024-01-01", []);
		const overdue = schedule.find((s) => s.dueStatus === "overdue");
		expect(overdue).toBeDefined();
		const reminder = formatVaccineReminder(overdue!);
		expect(reminder).toContain("已过期");
	});

	test("anonymizeProfile with synthetic cohort returns valid profile", async () => {
		const { generateSyntheticCohort, anonymizeProfile } = await import(
			"../../../packages/agents/peer-benchmark/src/knowledge.js"
		);
		const cohort = generateSyntheticCohort(24, "male", 30, "height");
		const profile = anonymizeProfile(cohort, "height", 85, 24, "male");
		expect(profile.percentile).toBeGreaterThanOrEqual(1);
		expect(profile.percentile).toBeLessThanOrEqual(99);
		expect(profile.cohort.count).toBeGreaterThanOrEqual(5);
	});

	test("recommendPersona picks scientific for dataDriven parent", async () => {
		const { recommendPersona } = await import(
			"../../../packages/agents/knowledge-rag/src/persona.js"
		);
		const persona = recommendPersona({ dataDriven: true });
		expect(persona).toBe("scientific");
	});

	test("renderGrowthChart ASCII includes axis", async () => {
		const { renderGrowthChart } = await import(
			"../../../packages/agents/growth-tracker/src/chart.js"
		);
		const chart = renderGrowthChart(
			[
				{ ageMonths: 6, value: 65 },
				{ ageMonths: 12, value: 75 },
				{ ageMonths: 24, value: 85 },
			],
			{ width: 30, height: 10, metric: "height", sex: "male" },
		);
		expect(chart.ascii).toContain("100");
		expect(chart.ascii).toContain("0");
		expect(chart.points).toHaveLength(3);
	});
});

test.describe("provider chain smoke (no live HTTP)", () => {
	test("rule-fallback provider returns content for empty input", async () => {
		const { defaultKnowledgeProviderChain } = await import(
			"../../../packages/agents/knowledge-rag/src/provider-chain.js"
		);
		const chain = defaultKnowledgeProviderChain();
		const reply = await chain.complete("test", "");
		expect(reply.content.length).toBeGreaterThan(0);
		expect(reply.providerId).toBe("rule-fallback");
	});
});
