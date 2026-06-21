/**
 * WebMemoryLayer — pure in-memory implementation of the MemoryLayer interface.
 *
 * Used by the web dashboard to avoid better-sqlite3 native module dependency
 * in the browser. Implements the same public API surface as the real
 * MemoryLayer so orchestrator + agents work identically in tests and demo.
 *
 * Uses Map() + Array() for storage. All IDs are generated with genId().
 */
import type {
	ChildProfile,
	ChildStage,
	Episode,
	EpisodeType,
	Fact,
	FactCategory,
	Session,
	DeltaEntry,
	DeltaOp,
} from "@parenting/memory";
import { computeWebStage, genWebId } from "./memory-helpers.js";

/**
 * Interface extracted from MemoryLayer's public methods that the
 * orchestrator + agents actually call. WebMemoryLayer implements this.
 */
export interface MemoryLayerLike {
	// L1: Children
	upsertChild(profile: ChildProfile): ChildProfile;
	getChild(id: string): ChildProfile | null;
	listChildren(): ChildProfile[];
	deleteChild(id: string): boolean;

	// L2: Facts
	addFact(childId: string, category: FactCategory, key: string, value: string | Record<string, unknown>): Fact;
	getFacts(childId: string, category?: FactCategory): Fact[];
	deleteFact(id: string): boolean;

	// L3: Episodes
	addEpisode(childId: string, type: EpisodeType, content: Record<string, unknown>): Episode;
	getEpisodes(childId: string, type?: EpisodeType, limit?: number): Episode[];

	// L4: Sessions
	startSession(childId: string, context?: Record<string, unknown>): Session;
	getSession(sessionId: string): Session | null;
	updateSession(sessionId: string, context: Record<string, unknown>): Session | null;

	// Delta log
	getDeltaLog(since?: number, includeUnsynced?: boolean): DeltaEntry[];
	markDeltaSynced(uptoId: number): number;
	getUnsyncedDeltas(limit?: number): DeltaEntry[];
	getDeltaStats(): { total: number; unsynced: number; byTable: Record<string, number>; byOp: Record<string, number> };

	// Lifecycle
	close(): void;
	get isClosed(): boolean;
}

export class WebMemoryLayer implements MemoryLayerLike {
	private children = new Map<string, ChildProfile>();
	private facts = new Map<string, Fact>();
	private episodes = new Map<string, Episode>();
	private sessions = new Map<string, Session>();
	private deltas: DeltaEntry[] = [];
	private nextDeltaId = 1;
	private closed = false;

	// ─── L1: Children ────────────────────────────────────────────────────

	upsertChild(profile: ChildProfile): ChildProfile {
		const stage = profile.stage ?? computeWebStage(profile.birthDate);
		const child: ChildProfile = { ...profile, stage };
		this.children.set(child.id, child);
		this.recordDelta("children", child.id, "upsert", { ...child });
		return child;
	}

	getChild(id: string): ChildProfile | null {
		return this.children.get(id) ?? null;
	}

	listChildren(): ChildProfile[] {
		return Array.from(this.children.values());
	}

	deleteChild(id: string): boolean {
		const existed = this.children.delete(id);
		if (existed) this.recordDelta("children", id, "delete", { id });
		return existed;
	}

	// ─── L2: Facts ───────────────────────────────────────────────────────

	addFact(childId: string, category: FactCategory, key: string, value: string | Record<string, unknown>): Fact {
		const fact: Fact = {
			id: genWebId("fact"),
			childId,
			category,
			key,
			value: typeof value === "string" ? { data: value } : value,
			createdAt: new Date().toISOString(),
		};
		this.facts.set(fact.id, fact);
		this.recordDelta("facts", fact.id, "insert", { ...fact });
		return fact;
	}

	getFacts(childId: string, category?: FactCategory): Fact[] {
		return Array.from(this.facts.values()).filter(
			(f) => f.childId === childId && (category === undefined || f.category === category),
		);
	}

	deleteFact(id: string): boolean {
		const existed = this.facts.delete(id);
		if (existed) this.recordDelta("facts", id, "delete", { id });
		return existed;
	}

	// ─── L3: Episodes ────────────────────────────────────────────────────

	addEpisode(childId: string, type: EpisodeType, content: Record<string, unknown>): Episode {
		const episode: Episode = {
			id: genWebId("ep"),
			childId,
			type,
			content,
			createdAt: new Date().toISOString(),
		};
		this.episodes.set(episode.id, episode);
		this.recordDelta("episodes", episode.id, "insert", { ...episode });
		return episode;
	}

	getEpisodes(childId: string, type?: EpisodeType, limit?: number): Episode[] {
		let results = Array.from(this.episodes.values())
			.filter((e) => e.childId === childId && (type === undefined || e.type === type))
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		if (limit !== undefined) results = results.slice(0, limit);
		return results;
	}

	// ─── L4: Sessions ────────────────────────────────────────────────────

	startSession(childId: string, context: Record<string, unknown> = {}): Session {
		const now = new Date().toISOString();
		const session: Session = {
			id: genWebId("sess"),
			childId,
			startedAt: now,
			lastActive: now,
			context,
		};
		this.sessions.set(session.id, session);
		this.recordDelta("sessions", session.id, "insert", { ...session });
		return session;
	}

	getSession(sessionId: string): Session | null {
		return this.sessions.get(sessionId) ?? null;
	}

	updateSession(sessionId: string, context: Record<string, unknown>): Session | null {
		const session = this.sessions.get(sessionId);
		if (!session) return null;
		session.context = context;
		session.lastActive = new Date().toISOString();
		this.sessions.set(sessionId, session);
		this.recordDelta("sessions", sessionId, "update", { context, lastActive: session.lastActive });
		return session;
	}

	// ─── Delta Log ───────────────────────────────────────────────────────

	private recordDelta(tableName: string, rowId: string, op: DeltaOp, payload: Record<string, unknown>): void {
		this.deltas.push({
			id: this.nextDeltaId++,
			tableName,
			rowId,
			op,
			payload,
			syncedAt: null,
			createdAt: new Date().toISOString(),
		});
	}

	getDeltaLog(since?: number, includeUnsynced: boolean = true): DeltaEntry[] {
		let results = since ? this.deltas.filter((d) => d.id > since) : [...this.deltas];
		if (!includeUnsynced) results = results.filter((d) => d.syncedAt !== null);
		return results;
	}

	markDeltaSynced(uptoId: number): number {
		const now = new Date().toISOString();
		let count = 0;
		for (const d of this.deltas) {
			if (d.id <= uptoId && d.syncedAt === null) {
				d.syncedAt = now;
				count++;
			}
		}
		return count;
	}

	getUnsyncedDeltas(limit?: number): DeltaEntry[] {
		const results = this.deltas.filter((d) => d.syncedAt === null);
		return limit ? results.slice(0, limit) : results;
	}

	getDeltaStats(): { total: number; unsynced: number; byTable: Record<string, number>; byOp: Record<string, number> } {
		const total = this.deltas.length;
		const unsynced = this.deltas.filter((d) => d.syncedAt === null).length;
		const byTable: Record<string, number> = {};
		const byOp: Record<string, number> = {};
		for (const d of this.deltas) {
			byTable[d.tableName] = (byTable[d.tableName] ?? 0) + 1;
			byOp[d.op] = (byOp[d.op] ?? 0) + 1;
		}
		return { total, unsynced, byTable, byOp };
	}

	// ─── Lifecycle ───────────────────────────────────────────────────────

	close(): void {
		this.children.clear();
		this.facts.clear();
		this.episodes.clear();
		this.sessions.clear();
		this.deltas = [];
		this.closed = true;
	}

	get isClosed(): boolean {
		return this.closed;
	}
}
