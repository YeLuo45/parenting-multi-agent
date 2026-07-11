/**
 * Family Health Dashboard — aggregation layer for cross-agent data.
 *
 * Direction V: Family Health Dashboard.
 *
 * Pulls from growth-chart, habit-streak, screen, vaccine, peer-benchmark,
 * and knowledge-rag into a unified health summary.
 */

import type { GrowthChartPoint } from "@parenting/agent-growth-tracker";
import type { VaccineScheduleEntry } from "@parenting/agent-pediatrician";
import type { AnonymizedProfile } from "@parenting/agent-peer-benchmark";
import type { ScreenResult } from "@parenting/agent-screen";
import type { ChildProfile } from "@parenting/memory";

export interface DashboardTile {
	id: string;
	title: string;
	emoji: string;
	status: "good" | "warn" | "alert" | "neutral";
	value: string;
	hint?: string;
}

export interface DashboardSummary {
	childId: string;
	childName: string;
	childAgeMonths: number;
	tiles: DashboardTile[];
	overallStatus: "good" | "warn" | "alert";
	generatedAt: number;
}

export type DashboardSourceData = {
	child: ChildProfile;
	streakSummary: {
		habitId: string;
		currentStreak: number;
		bestStreak: number;
	}[];
	vaccineSchedule: VaccineScheduleEntry[];
	latestScreenResult?: ScreenResult;
	latestGrowthChart?: { points: GrowthChartPoint[] };
	latestPeerComparison?: AnonymizedProfile;
};

/** Compute overall status from individual tile statuses. */
export function computeOverallStatus(
	tiles: readonly DashboardTile[],
): "good" | "warn" | "alert" {
	if (tiles.some((t) => t.status === "alert")) return "alert";
	if (tiles.some((t) => t.status === "warn")) return "warn";
	return "good";
}

/** Build a streak-summary tile from the latest streak state. */
export function buildStreakTile(
	streaks: { habitId: string; currentStreak: number; bestStreak: number }[],
): DashboardTile {
	if (streaks.length === 0) {
		return {
			id: "streak",
			title: "习惯连续打卡",
			emoji: "🔥",
			status: "neutral",
			value: "暂无数据",
			hint: "开始一个习惯，建立连续打卡",
		};
	}
	const max = Math.max(...streaks.map((s) => s.currentStreak));
	const best = Math.max(...streaks.map((s) => s.bestStreak));
	const status = max >= 7 ? "good" : max >= 3 ? "warn" : "neutral";
	return {
		id: "streak",
		title: "习惯连续打卡",
		emoji: "🔥",
		status,
		value: `当前最长 ${max} 天 / 历史最佳 ${best} 天`,
		hint:
			max === 0
				? "开始一个习惯，建立连续打卡"
				: max < 3
					? "开始建立连续打卡"
					: max >= 30
						? "已达月度稳定期，继续保持"
						: "继续保持！",
	};
}

/** Build a vaccine-status tile from the schedule. */
export function buildVaccineTile(
	schedule: VaccineScheduleEntry[],
): DashboardTile {
	if (schedule.length === 0) {
		return {
			id: "vaccine",
			title: "疫苗接种",
			emoji: "💉",
			status: "neutral",
			value: "暂无数据",
		};
	}
	const overdue = schedule.filter((s) => s.dueStatus === "overdue").length;
	const due = schedule.filter((s) => s.dueStatus === "due").length;
	const upcoming = schedule.filter((s) => s.dueStatus === "upcoming").length;
	const completed = schedule.filter(
		(s) => s.dueStatus === "completed",
	).length;
	const status = overdue > 0 ? "alert" : due > 0 ? "warn" : "good";
	return {
		id: "vaccine",
		title: "疫苗接种",
		emoji: "💉",
		status,
		value: `已完成 ${completed} / 待接种 ${due + overdue + upcoming}`,
		hint:
			overdue > 0
				? `⚠️ ${overdue} 项已过期，请尽快补种`
				: due > 0
					? `${due} 项现在可接种`
					: upcoming > 0
						? `${upcoming} 项即将到期`
						: "全部按时完成 ✓",
	};
}

/** Build a screen-result tile from the latest screening. */
export function buildScreenTile(
	result: ScreenResult | undefined,
): DashboardTile {
	if (!result) {
		return {
			id: "screen",
			title: "发育筛查",
			emoji: "📋",
			status: "neutral",
			value: "暂无数据",
		};
	}
	const status =
		result.riskLevel === "high"
			? "alert"
			: result.riskLevel === "borderline"
				? "warn"
				: "good";
	const emoji = result.riskLevel === "high" ? "⚠️" : "✅";
	return {
		id: "screen",
		title: "发育筛查",
		emoji: "📋",
		status,
		value: `${result.scaleId.toUpperCase()} → P${result.percentile}（${result.riskLevel}）`,
		hint:
			result.riskLevel === "high"
				? "建议尽快就医评估"
				: result.riskLevel === "borderline"
					? "建议 3-6 个月后复测"
					: "当前未发现显著风险",
		_emoji: emoji, // visible via dashboard
	} as DashboardTile & { _emoji?: string };
}

/** Build a growth-chart tile from the latest trajectory. */
export function buildGrowthTile(
	chart: { points: GrowthChartPoint[] } | undefined,
): DashboardTile {
	if (!chart || chart.points.length === 0) {
		return {
			id: "growth",
			title: "生长曲线",
			emoji: "📈",
			status: "neutral",
			value: "暂无数据",
		};
	}
	const latest = chart.points[chart.points.length - 1]!;
	const pct = latest.percentile;
	const status = pct < 10 || pct > 95 ? "warn" : "good";
	return {
		id: "growth",
		title: "生长曲线",
		emoji: "📈",
		status,
		value: `最新 P${pct}`,
		hint:
			pct < 10
				? "百分位偏低，请咨询医生"
				: pct > 95
					? "百分位偏高，注意监测"
					: "百分位正常",
	};
}

/** Build a peer-comparison tile. */
export function buildPeerTile(
	profile: AnonymizedProfile | undefined,
): DashboardTile {
	if (!profile) {
		return {
			id: "peer",
			title: "同侪对比",
			emoji: "📊",
			status: "neutral",
			value: "暂无数据",
		};
	}
	const cmpZh = {
		above: "高于中位",
		at: "接近中位",
		below: "低于中位",
	}[profile.comparison];
	const status =
		profile.comparison === "below"
			? "warn"
			: profile.comparison === "above"
				? "good"
				: "good";
	return {
		id: "peer",
		title: "同侪对比",
		emoji: "📊",
		status,
		value: `${profile.metric} P${profile.percentile}（${cmpZh}）`,
		hint: `样本量 ${profile.cohort.count}（k-anonymity ≥ 5）`,
	};
}

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return Math.max(
		0,
		(asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
	);
}

/** Build the complete dashboard from a single source-of-truth input. */
export function buildDashboard(data: DashboardSourceData): DashboardSummary {
	const tiles: DashboardTile[] = [
		buildStreakTile(data.streakSummary),
		buildVaccineTile(data.vaccineSchedule),
		buildScreenTile(data.latestScreenResult),
		buildGrowthTile(data.latestGrowthChart),
		buildPeerTile(data.latestPeerComparison),
	];
	const overallStatus = computeOverallStatus(tiles);
	return {
		childId: data.child.id,
		childName: data.child.name,
		childAgeMonths: Math.round(ageInMonths(data.child.birthDate)),
		tiles,
		overallStatus,
		generatedAt: Date.now(),
	};
}

/** Format the dashboard as a Chinese markdown block. */
export function formatDashboard(summary: DashboardSummary): string {
	const lines: string[] = [
		`🏠 家庭健康仪表盘 — ${summary.childName}（${summary.childAgeMonths} 月）`,
		`整体状态：${summary.overallStatus === "alert" ? "⚠️ 需关注" : summary.overallStatus === "warn" ? "⚠️ 部分待跟进" : "✅ 一切正常"}`,
		"",
	];
	for (const t of summary.tiles) {
		const statusEmoji =
			t.status === "alert"
				? "⚠️"
				: t.status === "warn"
					? "🔔"
					: t.status === "good"
						? "✅"
						: "ℹ️";
		lines.push(`${statusEmoji} ${t.emoji} ${t.title}：${t.value}`);
		if (t.hint) lines.push(`   ${t.hint}`);
	}
	lines.push("", `生成于 ${new Date(summary.generatedAt).toISOString()}`);
	return lines.join("\n");
}

/** Pick the most urgent action across all tiles. */
export function pickUrgentAction(
	summary: DashboardSummary,
): DashboardTile | null {
	return summary.tiles.find((t) => t.status === "alert") ?? null;
}
