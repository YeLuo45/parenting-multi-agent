/**
 * @parenting/agent-growth-tracker — height/weight/head circumference percentiles + milestones.
 *
 * Phase 2 batch 2: rule-based + table lookup. No LLM call.
 * Direction O: ASCII growth chart visualization.
 */

export {
	createGrowthTrackerAgent,
	formatMilestonesByDomain,
	formatMissedMilestones,
	formatNextMilestone,
	GROWTH_DISCLAIMER,
	GrowthTrackerAgent,
} from "./agent.js";

export {
	calculateBMI,
	classifyBMI,
	classifyPercentile,
	classifyZScore,
	computeZScore,
	detectGrowthConcern,
	domainNameEn,
	domainNameZh,
	estimatePercentile,
	GROWTH_STANDARDS,
	type GrowthMetric,
	type GrowthSex,
	type GrowthStandardRow,
	getMilestonesForAge,
	getMilestonesForAgeAndDomain,
	getMissedMilestones,
	getNextMilestone,
	getPercentiles,
	MILESTONE_DOMAINS,
	MILESTONES,
	type Milestone,
	type MilestoneDomain,
	milestoneCountByDomain,
	weightGainVelocity,
	type ZScoreBand,
} from "./knowledge.js";

export {
	type GrowthChartOptions,
	type GrowthChartPoint,
	type GrowthChartSeries,
	type GrowthMeasurement,
	computeChartPoints,
	computePercentileForChart,
	detectPercentileShift,
	renderGrowthChart,
	trendDirection,
} from "./chart.js";

export const GROWTH_TRACKER_VERSION = "0.3.0";