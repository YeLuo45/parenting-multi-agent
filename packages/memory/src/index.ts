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
	type AuditEntry,
	AuditLog,
	COMPLIANCE_DISCLAIMER,
	computeExpiry,
	type DataCategory,
	type DataRecord,
	type DataSubject,
	DEFAULT_RETENTION,
	exportSubjectData,
	isExpired,
	processRightToBeForgotten,
	type RetentionPolicy,
	redactValue,
	requiresConsent,
	shouldAutoDelete,
	shouldAutoRedact,
} from "./compliance.js";
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

export type {
	SymptomLog,
	SymptomType,
} from "./types.js";
export {
	buildChildSharePayload,
	type Caregiver,
	type CaregiverRole,
	type ChildProfile,
	type ChildSharePayload,
	type ChildStage,
	canCaregiver,
	caregiverPermissions,
	computeStage,
	type DeltaEntry,
	type DeltaOp,
	decodeSharePayload,
	type Episode,
	type EpisodeType,
	encodeSharePayload,
	type Fact,
	type FactCategory,
	type FeverActionFlag,
	type FeverDirection,
	type FeverTrend,
	genId,
	type Session,
	sanitizeChildForShare,
	validateChildSharePayload,
} from "./types.js";

export const MEMORY_VERSION = "0.3.0";
export {
	classifyFeverAction,
	classifyFeverDirection,
	computeFeverTrend as computeFeverTrendFromReadings,
	FEVER_DURATION_SEE_DOCTOR_HOURS,
	FEVER_HIGH_THRESHOLD_C,
	FEVER_STABLE_THRESHOLD_C,
	formatFeverTrendLine,
} from "./symptom.js";
