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

export { MemoryLayer, type MemoryLayerOptions } from "./memory.js";
export {
	L0_RULES,
	matchL0Rule,
	type L0Rule,
	type L0RuleSeverity,
} from "./l0-rules.js";
export {
	computeStage,
	genId,
	type ChildProfile,
	type ChildStage,
	type Episode,
	type EpisodeType,
	type Fact,
	type FactCategory,
	type Session,
	type DeltaEntry,
	type DeltaOp,
} from "./types.js";

export {
	SyncEngine,
	buildPushResult,
	fullSync,
	findRowDelta,
	highestId,
	lwwResolve,
	mergeDeltas,
	selectDeltasSince,
	selectUnsyncedDeltas,
	type DeviceSyncState,
	type FullSyncResult,
	type PullResult,
	type PushResult,
} from "./sync.js";

export const MEMORY_VERSION = "0.1.0";
