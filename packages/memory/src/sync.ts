/**
 * Multi-device sync protocol — delta log push/pull with conflict resolution.
 *
 * Implements a simple Last-Write-Wins (LWW) sync model using delta timestamps
 * as the tiebreaker. No network layer — this module provides the deterministic
 * sync logic; a transport layer (WebSocket, HTTP, etc.) can be added on top.
 *
 * Design:
 * - Each device maintains a delta log (local). Delta IDs are monotonic per device.
 * - `push(remoteLastSyncedId)` returns the deltas the remote needs.
 * - `pull(remoteDeltas)` merges remote deltas into local (LWW) and returns the
 *   count applied + the count of conflicts resolved.
 * - `syncState` tracks per-device sync cursors.
 */
import type { DeltaEntry } from "./types.js";

/** Sync state for one remote device. */
export interface DeviceSyncState {
	deviceId: string;
	lastSyncedDeltaId: number;
	lastSyncedAt: string;
}

/** Result of a push operation. */
export interface PushResult {
	/** Deltas the remote needs (id > remoteLastSyncedDeltaId). */
	deltas: DeltaEntry[];
	/** Number of deltas returned. */
	count: number;
	/** Highest delta id we sent. */
	highWater: number;
}

/** Result of a pull/merge operation. */
export interface PullResult {
	/** Number of remote deltas applied to local. */
	applied: number;
	/** Number of conflicts resolved (remote won or local skipped). */
	conflicts: number;
	/** New high-water mark in local log after merge. */
	newHighWater: number;
}

/** Pure function: select deltas newer than a given id. */
export function selectDeltasSince(
	deltas: DeltaEntry[],
	sinceId: number,
): DeltaEntry[] {
	return deltas.filter((d) => d.id > sinceId);
}

/** Pure function: select unsynced deltas in insertion order. */
export function selectUnsyncedDeltas(deltas: DeltaEntry[]): DeltaEntry[] {
	return deltas.filter((d) => d.syncedAt === null);
}

/** Pure function: highest id in a delta list, or 0 if empty. */
export function highestId(deltas: DeltaEntry[]): number {
	let max = 0;
	for (const d of deltas) if (d.id > max) max = d.id;
	return max;
}

/** Compare two deltas for the same row (tableName + rowId).
 *  Returns the delta that wins under LWW. Tiebreaker: higher id wins.
 *  If the deltas differ only in createdAt, the later timestamp wins. */
export function lwwResolve(local: DeltaEntry, remote: DeltaEntry): DeltaEntry {
	if (local.createdAt === remote.createdAt)
		return remote.id > local.id ? remote : local;
	return remote.createdAt > local.createdAt ? remote : local;
}

/** Find a delta in the local log matching (tableName, rowId). */
export function findRowDelta(
	deltas: DeltaEntry[],
	tableName: string,
	rowId: string,
): DeltaEntry | null {
	for (let i = deltas.length - 1; i >= 0; i--) {
		const d = deltas[i];
		if (d.tableName === tableName && d.rowId === rowId) return d;
	}
	return null;
}

/** Pure function: merge remote deltas into local, returning PullResult.
 *  Returns a new array (does not mutate input). */
export function mergeDeltas(
	localDeltas: DeltaEntry[],
	remoteDeltas: DeltaEntry[],
): { merged: DeltaEntry[]; result: PullResult } {
	const merged = [...localDeltas];
	let applied = 0;
	let conflicts = 0;
	const localByRow = new Map<string, DeltaEntry>();
	for (const d of localDeltas) localByRow.set(`${d.tableName}:${d.rowId}`, d);

	for (const remote of remoteDeltas) {
		const key = `${remote.tableName}:${remote.rowId}`;
		const local = localByRow.get(key);
		if (!local) {
			// New row — append.
			merged.push(remote);
			localByRow.set(key, remote);
			applied++;
			continue;
		}
		// Same row — LWW: replace local in merged array if remote wins.
		const winner = lwwResolve(local, remote);
		if (winner !== local) {
			const idx = merged.indexOf(local);
			if (idx >= 0) merged[idx] = remote;
			localByRow.set(key, remote);
			conflicts++;
		}
	}

	// Sort by id for stable ordering.
	merged.sort((a, b) => a.id - b.id);

	return {
		merged,
		result: {
			applied,
			conflicts,
			newHighWater: highestId(merged),
		},
	};
}

/** Pure function: build a PushResult from a local log and remote cursor. */
export function buildPushResult(
	localDeltas: DeltaEntry[],
	remoteLastSyncedId: number,
): PushResult {
	const deltas = selectDeltasSince(localDeltas, remoteLastSyncedId);
	return {
		deltas,
		count: deltas.length,
		highWater: highestId(deltas),
	};
}

/** SyncEngine: high-level sync coordinator.
 *  Pure functions underneath — the engine itself just holds state. */
export class SyncEngine {
	private states = new Map<string, DeviceSyncState>();

	/** Get or create sync state for a remote device. */
	getDeviceState(deviceId: string): DeviceSyncState {
		const existing = this.states.get(deviceId);
		if (existing) return existing;
		const fresh: DeviceSyncState = {
			deviceId,
			lastSyncedDeltaId: 0,
			lastSyncedAt: new Date(0).toISOString(),
		};
		this.states.set(deviceId, fresh);
		return fresh;
	}

	/** Compute what to push to a remote device. */
	push(localDeltas: DeltaEntry[], deviceId: string): PushResult {
		const state = this.getDeviceState(deviceId);
		const result = buildPushResult(localDeltas, state.lastSyncedDeltaId);
		if (result.deltas.length > 0) {
			state.lastSyncedDeltaId = highestId(result.deltas);
			state.lastSyncedAt = new Date().toISOString();
		}
		return result;
	}

	/** Merge remote deltas into local. Returns the merged log + PullResult. */
	pull(
		localDeltas: DeltaEntry[],
		remoteDeltas: DeltaEntry[],
		deviceId: string,
	): PullResult {
		const state = this.getDeviceState(deviceId);
		const { result } = mergeDeltas(localDeltas, remoteDeltas);
		// After merge, the remote is caught up to our new high-water.
		state.lastSyncedDeltaId = result.newHighWater;
		state.lastSyncedAt = new Date().toISOString();
		return result;
	}

	/** List known devices. */
	listDevices(): DeviceSyncState[] {
		return Array.from(this.states.values());
	}

	/** Reset all sync state (used in tests). */
	reset(): void {
		this.states.clear();
	}
}

/** Convenience: full sync cycle (push + pull) in one call. */
export interface FullSyncResult {
	push: PushResult;
	pull: PullResult;
}

export function fullSync(
	engine: SyncEngine,
	localDeltas: DeltaEntry[],
	remoteDeltas: DeltaEntry[],
	deviceId: string,
): FullSyncResult {
	const pushResult = engine.push(localDeltas, deviceId);
	const pullResult = engine.pull(localDeltas, remoteDeltas, deviceId);
	return { push: pushResult, pull: pullResult };
}
