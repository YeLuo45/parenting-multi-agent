/**
 * @parenting/agent-peer-benchmark — privacy-preserving peer comparison.
 */

export {
	createPeerBenchmarkAgent,
	PEER_BENCHMARK_DISCLAIMER,
	PEER_BENCHMARK_VERSION,
	PeerBenchmarkAgent,
} from "./agent.js";

export {
	type AnonymizedProfile,
	anonymizeProfile,
	buildPeerCohort,
	compareToCohort,
	computePercentile,
	filterByAgeWindow,
	filterBySex,
	formatAnonymizedProfile,
	generateSyntheticCohort,
	K_ANONYMITY_MINIMUM,
	type Metric,
	type PeerCohortStats,
	type PeerMeasurement,
	type Sex,
} from "./knowledge.js";
