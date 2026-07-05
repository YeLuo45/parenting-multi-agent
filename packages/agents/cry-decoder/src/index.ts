export {
	_formatAdvice,
	_formatDistribution,
	_formatFiveS,
	_urgencyFromMax,
	CRY_DISCLAIMER,
	CryDecoderAgent,
	classifyCry,
	createCryDecoderAgent,
	maxUrgencyOf,
	scoreReason,
	topReasons,
} from "./agent.js";

export {
	buildEmptyDistribution,
	CRY_REASON_BY_ID,
	CRY_REASON_PROFILES,
	type CryDistribution,
	type CryReason,
	type CryReasonProfile,
	type CrySoothingStep,
	FIVE_S,
} from "./knowledge.js";

export const CRY_DECODER_VERSION = "0.1.0";
