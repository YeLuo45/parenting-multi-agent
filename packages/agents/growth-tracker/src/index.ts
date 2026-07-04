/**
 * @parenting/agent-growth-tracker — height/weight/head circumference percentiles + milestones.
 *
 * Phase 2 batch 2: rule-based + table lookup. No LLM call.
 */

export {
	createGrowthTrackerAgent,
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
	estimatePercentile,
	GROWTH_STANDARDS,
	type GrowthMetric,
	type GrowthSex,
	type GrowthStandardRow,
	getMilestonesForAge,
	getPercentiles,
	type Milestone,
	type ZScoreBand,
	weightGainVelocity,
} from "./knowledge.js";

export const GROWTH_TRACKER_VERSION = "0.1.0";
