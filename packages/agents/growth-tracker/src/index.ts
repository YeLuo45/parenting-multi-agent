/**
 * @parenting/agent-growth-tracker — height/weight/head circumference percentiles + milestones.
 *
 * Phase 2 batch 2: rule-based + table lookup. No LLM call.
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

export const GROWTH_TRACKER_VERSION = "0.2.0";
