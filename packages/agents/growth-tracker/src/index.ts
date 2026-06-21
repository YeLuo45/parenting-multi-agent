/**
 * @parenting/agent-growth-tracker — height/weight/head circumference percentiles + milestones.
 *
 * Phase 2 batch 2: rule-based + table lookup. No LLM call.
 */

export {
	GrowthTrackerAgent,
	createGrowthTrackerAgent,
	GROWTH_DISCLAIMER,
} from "./agent.js";

export {
	GROWTH_STANDARDS,
	estimatePercentile,
	classifyPercentile,
	classifyBMI,
	calculateBMI,
	detectGrowthConcern,
	getMilestonesForAge,
	weightGainVelocity,
	getPercentiles,
	type GrowthMetric,
	type GrowthSex,
	type GrowthStandardRow,
	type Milestone,
} from "./knowledge.js";

export const GROWTH_TRACKER_VERSION = "0.1.0";