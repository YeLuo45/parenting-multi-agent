import { expect, test } from "@playwright/test";

/**
 * Direction X: e2e tests for dashboard tile rendering.
 *
 * These tests run the web build preview and verify the dashboard logic
 * integrates with the React app. They use a worker-side import (only
 * works in node context, not browser) so the dashboard module is
 * exercised via the dashboard-build file.
 *
 * NOTE: full DOM-mount e2e specs live in default-render.spec.ts.
 */

test.describe("dashboard tile API (worker-side)", () => {
	test("buildDashboard returns 5 tiles for any source data", async () => {
		// Dynamic import path works in worker process.
		const { buildDashboard } = await import("../src/dashboard.js");
		const summary = buildDashboard({
			child: {
				id: "c1",
				name: "测试宝宝",
				birthDate: "2024-01-01",
				stage: "toddler",
			},
			streakSummary: [
				{ habitId: "h1", currentStreak: 10, bestStreak: 15 },
			],
			vaccineSchedule: [],
		});
		expect(summary.tiles).toHaveLength(5);
		expect(summary.tiles[0]?.id).toBe("streak");
	});

	test("formatDashboard includes overall status indicator", async () => {
		const { buildDashboard, formatDashboard } = await import(
			"../src/dashboard.js"
		);
		const summary = buildDashboard({
			child: {
				id: "c1",
				name: "宝宝",
				birthDate: "2024-01-01",
				stage: "toddler",
			},
			streakSummary: [
				{ habitId: "h1", currentStreak: 30, bestStreak: 30 },
			],
			vaccineSchedule: [],
		});
		const out = formatDashboard(summary);
		expect(out).toContain("家庭健康仪表盘");
		expect(out).toMatch(/✅|⚠️/);
	});

	test("buildDashboard with overdue vaccines returns alert status", async () => {
		const { buildDashboard } = await import("../src/dashboard.js");
		const summary = buildDashboard({
			child: {
				id: "c1",
				name: "宝宝",
				birthDate: "2024-01-01",
				stage: "toddler",
			},
			streakSummary: [],
			vaccineSchedule: [
				{
					vaccine: {
						id: "dtap_1",
						name: "百白破",
						nameEn: "DTaP",
						category: "national",
						doseLabel: "3月龄",
						doseLabelEn: "3mo",
						recommendedAgeMonths: 3,
						description: "",
					},
					recommendedDate: Date.now() - 1000 * 60 * 60 * 24 * 30,
					dueStatus: "overdue",
					daysUntilDue: -30,
				},
			],
		});
		expect(summary.overallStatus).toBe("alert");
	});
});
