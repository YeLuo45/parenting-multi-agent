/**
 * @parenting/memory — L0-L4 hierarchical child memory with SQLite persistence.
 *
 * Layers:
 *   L0 Rules      → hardcoded safety guardrails (see l0-rules.ts)
 *   L1 Index      → child profiles
 *   L2 Global     → long-term facts (vaccines, milestones, family)
 *   L3 Episodic   → per-incident episodes (Q&A, visits, events)
 *   L4 Working    → active sessions
 *
 * Plus a delta log for future PowerSync cloud sync.
 */

export {
	L0_RULES,
	type L0Rule,
	type L0RuleSeverity,
	matchL0Rule,
} from "./l0-rules.js";
export { MemoryLayer, type MemoryLayerOptions } from "./memory.js";
export {
	buildPushResult,
	type DeviceSyncState,
	type FullSyncResult,
	findRowDelta,
	fullSync,
	highestId,
	lwwResolve,
	mergeDeltas,
	type PullResult,
	type PushResult,
	SyncEngine,
	selectDeltasSince,
	selectUnsyncedDeltas,
} from "./sync.js";
export {
	type Caregiver,
	type CaregiverRole,
	caregiverPermissions,
	canCaregiver,
	type ChildProfile,
	type ChildSharePayload,
	type ChildStage,
	computeStage,
	type DeltaEntry,
	type DeltaOp,
	type Episode,
	type EpisodeType,
	type Fact,
	type FactCategory,
	type FeverActionFlag,
	type FeverDirection,
	type FeverTrend,
	genId,
	type Session,
	sanitizeChildForShare,
	buildChildSharePayload,
	validateChildSharePayload,
	encodeSharePayload,
	decodeSharePayload,
} from "./types.js";

export const MEMORY_VERSION = "0.1.0";
export {
	type SymptomLog,
	type SymptomType,
} from "./types.js";
export {
	classifyFeverAction,
	classifyFeverDirection,
	computeFeverTrend as computeFeverTrendFromReadings,
	FEVER_DURATION_SEE_DOCTOR_HOURS,
	FEVER_HIGH_THRESHOLD_C,
	FEVER_STABLE_THRESHOLD_C,
	formatFeverTrendLine,
} from "./symptom.js";
