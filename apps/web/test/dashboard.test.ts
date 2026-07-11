import type { GrowthChartPoint } from "@parenting/agent-growth-tracker";
import type { VaccineScheduleEntry } from "@parenting/agent-pediatrician";
import type { AnonymizedProfile } from "@parenting/agent-peer-benchmark";
import type { ScreenResult } from "@parenting/agent-screen";
import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import {
	buildDashboard,
	buildGrowthTile,
	buildPeerTile,
	buildScreenTile,
	buildStreakTile,
	buildVaccineTile,
	computeOverallStatus,
	formatDashboard,
	pickUrgentAction,
} from "../src/dashboard.js";

const CHILD: ChildProfile = {
	id: "c1",
	name: "小明",
	birthDate: "2024-01-01",
	stage: "toddler",
};

function makeVaccine(
	overrides: Partial<VaccineScheduleEntry> = {},
): VaccineScheduleEntry {
	return {
		vaccine: {
			id: "hep_b_birth",
			name: "乙肝",
			nameEn: "HepB",
			category: "national",
			doseLabel: "出生",
			doseLabelEn: "Birth",
			recommendedAgeMonths: 0,
			description: "",
		},
		recommendedDate: Date.now(),
		dueStatus: "completed",
		daysUntilDue: 0,
		...overrides,
	} as VaccineScheduleEntry;
}

function makeScreen(overrides: Partial<ScreenResult> = {}): ScreenResult {
	return {
		scaleId: "cbcl",
		totalScore: 0,
		maxScore: 20,
		percentile: 80,
		riskLevel: "low",
		domainScores: {},
		redFlags: [],
		recommendation: "继续监测",
		...overrides,
	} as ScreenResult;
}

function makePeer(
	overrides: Partial<AnonymizedProfile> = {},
): AnonymizedProfile {
	return {
		metric: "height",
		ageMonths: 24,
		sex: "male",
		value: 85,
		percentile: 50,
		cohort: {
			metric: "height",
			ageMonths: 24,
			sex: "male",
			count: 100,
			mean: 85,
			median: 85,
			p5: 80,
			p25: 82,
			p50: 85,
			p75: 88,
			p95: 92,
			min: 78,
			max: 95,
		},
		comparison: "at",
		...overrides,
	} as AnonymizedProfile;
}

function makeGrowthPoints(values: { pct: number }[]): GrowthChartPoint[] {
	return values.map((v, i) => ({
		ageMonths: (i + 1) * 6,
		value: 50 + i,
		percentile: v.pct,
	}));
}

describe("computeOverallStatus", () => {
	it("returns 'good' when all tiles are good", () => {
		expect(
			computeOverallStatus([
				{
					id: "a",
					title: "A",
					emoji: "X",
					status: "good",
					value: "OK",
				},
			]),
		).toBe("good");
	});

	it("returns 'warn' when any tile is warn", () => {
		expect(
			computeOverallStatus([
				{
					id: "a",
					title: "A",
					emoji: "X",
					status: "good",
					value: "OK",
				},
				{
					id: "b",
					title: "B",
					emoji: "X",
					status: "warn",
					value: "WARN",
				},
			]),
		).toBe("warn");
	});

	it("returns 'alert' when any tile is alert (overrides warn)", () => {
		expect(
			computeOverallStatus([
				{
					id: "a",
					title: "A",
					emoji: "X",
					status: "warn",
					value: "WARN",
				},
				{
					id: "b",
					title: "B",
					emoji: "X",
					status: "alert",
					value: "ALERT",
				},
			]),
		).toBe("alert");
	});

	it("returns 'good' for empty tile list", () => {
		expect(computeOverallStatus([])).toBe("good");
	});
});

describe("buildStreakTile", () => {
	it("returns neutral when no streaks", () => {
		const t = buildStreakTile([]);
		expect(t.status).toBe("neutral");
		expect(t.value).toBe("暂无数据");
	});

	it("returns good when max streak >= 7", () => {
		const t = buildStreakTile([
			{ habitId: "h1", currentStreak: 10, bestStreak: 15 },
		]);
		expect(t.status).toBe("good");
		expect(t.value).toContain("10");
	});

	it("returns warn when max streak 3-6", () => {
		const t = buildStreakTile([
			{ habitId: "h1", currentStreak: 4, bestStreak: 4 },
		]);
		expect(t.status).toBe("warn");
	});

	it("returns neutral when max streak < 3", () => {
		const t = buildStreakTile([
			{ habitId: "h1", currentStreak: 1, bestStreak: 1 },
		]);
		expect(t.status).toBe("neutral");
		expect(t.hint).toContain("开始");
	});

	it("streak = 2 falls in 'max < 3' hint branch", () => {
		const t = buildStreakTile([
			{ habitId: "h1", currentStreak: 2, bestStreak: 2 },
		]);
		expect(t.hint).toBe("开始建立连续打卡");
	});

	it("hint celebrates 30+ day streak", () => {
		const t = buildStreakTile([
			{ habitId: "h1", currentStreak: 45, bestStreak: 60 },
		]);
		expect(t.hint).toContain("月度稳定期");
	});

	it("uses max of multiple streaks", () => {
		const t = buildStreakTile([
			{ habitId: "h1", currentStreak: 3, bestStreak: 3 },
			{ habitId: "h2", currentStreak: 12, bestStreak: 12 },
		]);
		expect(t.value).toContain("12");
	});
});

describe("buildVaccineTile", () => {
	it("returns neutral when schedule empty", () => {
		const t = buildVaccineTile([]);
		expect(t.status).toBe("neutral");
	});

	it("returns alert when overdue > 0", () => {
		const t = buildVaccineTile([
			makeVaccine({ dueStatus: "overdue" }),
			makeVaccine({ dueStatus: "overdue" }),
			makeVaccine({ dueStatus: "completed" }),
		]);
		expect(t.status).toBe("alert");
		expect(t.hint).toContain("已过期");
	});

	it("returns warn when due > 0", () => {
		const t = buildVaccineTile([
			makeVaccine({ dueStatus: "due" }),
			makeVaccine({ dueStatus: "completed" }),
		]);
		expect(t.status).toBe("warn");
		expect(t.hint).toContain("现在可接种");
	});

	it("returns good when only upcoming", () => {
		const t = buildVaccineTile([
			makeVaccine({ dueStatus: "upcoming" }),
			makeVaccine({ dueStatus: "completed" }),
		]);
		expect(t.status).toBe("good");
		expect(t.hint).toContain("即将到期");
	});

	it("returns good when all completed", () => {
		const t = buildVaccineTile([
			makeVaccine({ dueStatus: "completed" }),
			makeVaccine({ dueStatus: "completed" }),
		]);
		expect(t.status).toBe("good");
		expect(t.hint).toContain("全部按时完成");
	});
});

describe("buildScreenTile", () => {
	it("returns neutral when undefined", () => {
		const t = buildScreenTile(undefined);
		expect(t.status).toBe("neutral");
	});

	it("returns alert for high risk", () => {
		const t = buildScreenTile(makeScreen({ riskLevel: "high" }));
		expect(t.status).toBe("alert");
		expect(t.hint).toContain("尽快就医");
	});

	it("returns warn for borderline", () => {
		const t = buildScreenTile(makeScreen({ riskLevel: "borderline" }));
		expect(t.status).toBe("warn");
	});

	it("returns good for low risk", () => {
		const t = buildScreenTile(makeScreen({ riskLevel: "low" }));
		expect(t.status).toBe("good");
	});

	it("includes scale id in value", () => {
		const t = buildScreenTile(makeScreen({ scaleId: "mchat" }));
		expect(t.value).toContain("MCHAT");
	});
});

describe("buildGrowthTile", () => {
	it("returns neutral when undefined or empty", () => {
		expect(buildGrowthTile(undefined).status).toBe("neutral");
		expect(buildGrowthTile({ points: [] }).status).toBe("neutral");
	});

	it("returns warn for low percentile", () => {
		const t = buildGrowthTile({
			points: makeGrowthPoints([{ pct: 5 }]),
		});
		expect(t.status).toBe("warn");
		expect(t.hint).toContain("偏低");
	});

	it("returns warn for high percentile", () => {
		const t = buildGrowthTile({
			points: makeGrowthPoints([{ pct: 98 }]),
		});
		expect(t.status).toBe("warn");
		expect(t.hint).toContain("偏高");
	});

	it("returns good for normal percentile", () => {
		const t = buildGrowthTile({
			points: makeGrowthPoints([{ pct: 50 }]),
		});
		expect(t.status).toBe("good");
	});

	it("uses latest point", () => {
		const t = buildGrowthTile({
			points: makeGrowthPoints([{ pct: 50 }, { pct: 30 }, { pct: 70 }]),
		});
		expect(t.value).toContain("P70");
	});
});

describe("buildPeerTile", () => {
	it("returns neutral when undefined", () => {
		const t = buildPeerTile(undefined);
		expect(t.status).toBe("neutral");
	});

	it("returns warn for below median", () => {
		const t = buildPeerTile(makePeer({ comparison: "below" }));
		expect(t.status).toBe("warn");
	});

	it("returns good for above or at median", () => {
		expect(buildPeerTile(makePeer({ comparison: "above" })).status).toBe(
			"good",
		);
		expect(buildPeerTile(makePeer({ comparison: "at" })).status).toBe(
			"good",
		);
	});

	it("includes metric name", () => {
		const t = buildPeerTile(makePeer({ metric: "weight" }));
		expect(t.value).toContain("weight");
	});
});

describe("buildDashboard", () => {
	it("returns summary with 5 tiles", () => {
		const s = buildDashboard({
			child: CHILD,
			streakSummary: [],
			vaccineSchedule: [],
		});
		expect(s.tiles).toHaveLength(5);
	});

	it("overall status = alert when any tile is alert", () => {
		const s = buildDashboard({
			child: CHILD,
			streakSummary: [],
			vaccineSchedule: [makeVaccine({ dueStatus: "overdue" })],
		});
		expect(s.overallStatus).toBe("alert");
	});

	it("computes age in months", () => {
		const s = buildDashboard({
			child: { ...CHILD, birthDate: "2026-01-01" },
			streakSummary: [],
			vaccineSchedule: [],
		});
		expect(s.childAgeMonths).toBeGreaterThan(0);
		expect(s.childAgeMonths).toBeLessThan(12);
	});
});

describe("formatDashboard", () => {
	it("renders Chinese markdown", () => {
		const s = buildDashboard({
			child: CHILD,
			streakSummary: [{ habitId: "h", currentStreak: 5, bestStreak: 5 }],
			vaccineSchedule: [makeVaccine()],
		});
		const out = formatDashboard(s);
		expect(out).toContain("家庭健康仪表盘");
		expect(out).toContain("小明");
	});

	it("shows urgent indicator for alert status", () => {
		const s = buildDashboard({
			child: CHILD,
			streakSummary: [],
			vaccineSchedule: [makeVaccine({ dueStatus: "overdue" })],
		});
		const out = formatDashboard(s);
		expect(out).toContain("⚠️");
	});

	it("shows good status indicator when all good", () => {
		const s = buildDashboard({
			child: CHILD,
			streakSummary: [
				{ habitId: "h", currentStreak: 30, bestStreak: 30 },
			],
			vaccineSchedule: [makeVaccine({ dueStatus: "completed" })],
		});
		const out = formatDashboard(s);
		expect(out).toContain("✅");
	});

	it("includes generation timestamp", () => {
		const s = buildDashboard({
			child: CHILD,
			streakSummary: [],
			vaccineSchedule: [],
		});
		const out = formatDashboard(s);
		expect(out).toContain("生成于");
	});

	it("renders all 5 tiles with status emoji", () => {
		const s = buildDashboard({
			child: CHILD,
			streakSummary: [],
			vaccineSchedule: [],
			latestScreenResult: makeScreen(),
			latestGrowthChart: { points: makeGrowthPoints([{ pct: 50 }]) },
			latestPeerComparison: makePeer(),
		});
		const out = formatDashboard(s);
		expect(out).toContain("习惯连续打卡");
		expect(out).toContain("疫苗接种");
		expect(out).toContain("发育筛查");
		expect(out).toContain("生长曲线");
		expect(out).toContain("同侪对比");
	});
});

describe("pickUrgentAction", () => {
	it("returns first alert tile", () => {
		const s = buildDashboard({
			child: CHILD,
			streakSummary: [],
			vaccineSchedule: [makeVaccine({ dueStatus: "overdue" })],
		});
		const t = pickUrgentAction(s);
		expect(t?.id).toBe("vaccine");
	});

	it("returns null when no alert", () => {
		const s = buildDashboard({
			child: CHILD,
			streakSummary: [
				{ habitId: "h", currentStreak: 10, bestStreak: 10 },
			],
			vaccineSchedule: [makeVaccine({ dueStatus: "completed" })],
		});
		expect(pickUrgentAction(s)).toBeNull();
	});
});
