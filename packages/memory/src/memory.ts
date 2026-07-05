/**
 * MemoryLayer — L0-L4 hierarchical child memory with SQLite persistence.
 *
 * Layers (generic-agent pattern):
 *   L1 Index:   child profile metadata
 *   L2 Global:  long-term facts (vaccines, milestones, etc.)
 *   L3 Episodic: per-incident episodes (Q&A, visits, events)
 *   L4 Working:  active session context
 *
 * Plus:
 *   - L0 Rules: hardcoded guardrails (see l0-rules.ts)
 *   - Delta log: every write produces a delta entry for future PowerSync
 */

import Database from "better-sqlite3";
import {
	type ChildProfile,
	type ChildStage,
	computeStage,
	type DeltaEntry,
	type DeltaOp,
	type Episode,
	type EpisodeType,
	type Fact,
	type FactCategory,
	genId,
	type Session,
	type SymptomLog,
	type SymptomType,
	type FeverTrend,
} from "./types.js";
import { computeFeverTrend } from "./symptom.js";

export const MEMORY_SCHEMA_VERSION = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  stage TEXT NOT NULL,
  metadata TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_facts_child ON facts(child_id);
CREATE INDEX IF NOT EXISTS idx_facts_category ON facts(child_id, category);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_episodes_child ON episodes(child_id);
CREATE INDEX IF NOT EXISTS idx_episodes_type ON episodes(child_id, type);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_active TEXT NOT NULL,
  context TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_child ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(child_id, last_active);

CREATE TABLE IF NOT EXISTS delta_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  op TEXT NOT NULL,
  payload TEXT NOT NULL,
  synced_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_delta_synced ON delta_log(synced_at);
CREATE INDEX IF NOT EXISTS idx_delta_created ON delta_log(created_at);

CREATE TABLE IF NOT EXISTS symptom_logs (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_symptom_child_time ON symptom_logs(child_id, created_at);
CREATE INDEX IF NOT EXISTS idx_symptom_child_type ON symptom_logs(child_id, type);

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export interface MemoryLayerOptions {
	dbPath?: string; // ":memory:" for in-memory (tests)
}

export class MemoryLayer {
	private db: Database.Database;
	private _closed = false;

	constructor(options: MemoryLayerOptions = {}) {
		const path = options.dbPath ?? ":memory:";
		this.db = new Database(path);
		this.db.pragma("journal_mode = WAL");
		this.db.exec(SCHEMA);
		this.migrateSchema();
	}

	private migrateSchema(): void {
		const now = new Date().toISOString();
		this.db
			.prepare(`
			INSERT INTO schema_meta (key, value, updated_at)
			VALUES ('schema', ?, ?)
			ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
		`)
			.run(JSON.stringify({ version: MEMORY_SCHEMA_VERSION }), now);
	}

	getSchemaVersion(): number {
		return this.getSchemaMeta().version;
	}

	getSchemaMeta(): { version: number } {
		const row = this.db
			.prepare(`SELECT value FROM schema_meta WHERE key = 'schema'`)
			.get() as { value: string } | undefined;
		return row
			? (JSON.parse(row.value) as { version: number })
			: { version: 0 };
	}

	// ─── L1: Children (Index) ─────────────────────────────────────────────

	upsertChild(profile: ChildProfile): ChildProfile {
		const stage = profile.stage ?? computeStage(profile.birthDate);
		const now = new Date().toISOString();
		const stmt = this.db.prepare(`
			INSERT INTO children (id, name, birth_date, stage, metadata, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				name = excluded.name,
				birth_date = excluded.birth_date,
				stage = excluded.stage,
				metadata = excluded.metadata,
				updated_at = excluded.updated_at
		`);
		stmt.run(
			profile.id,
			profile.name,
			profile.birthDate,
			stage,
			profile.metadata ? JSON.stringify(profile.metadata) : null,
			now,
		);
		this.recordDelta("children", profile.id, "upsert", {
			id: profile.id,
			name: profile.name,
			birthDate: profile.birthDate,
			stage,
			metadata: profile.metadata ?? {},
		});
		return { ...profile, stage };
	}

	getChild(id: string): ChildProfile | null {
		const row = this.db
			.prepare(`SELECT * FROM children WHERE id = ?`)
			.get(id) as
			| {
					id: string;
					name: string;
					birth_date: string;
					stage: ChildStage;
					metadata: string | null;
			  }
			| undefined;
		if (!row) return null;
		return {
			id: row.id,
			name: row.name,
			birthDate: row.birth_date,
			stage: row.stage,
			metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
		};
	}

	listChildren(): ChildProfile[] {
		const rows = this.db
			.prepare(`SELECT * FROM children ORDER BY updated_at DESC`)
			.all() as Array<{
			id: string;
			name: string;
			birth_date: string;
			stage: ChildStage;
			metadata: string | null;
		}>;
		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			birthDate: row.birth_date,
			stage: row.stage,
			metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
		}));
	}

	deleteChild(id: string): boolean {
		const result = this.db
			.prepare(`DELETE FROM children WHERE id = ?`)
			.run(id);
		if (result.changes > 0) {
			this.recordDelta("children", id, "delete", { id });
			return true;
		}
		return false;
	}

	// ─── L2: Facts (Global) ───────────────────────────────────────────────

	addFact(
		childId: string,
		category: FactCategory,
		key: string,
		value: Record<string, unknown>,
	): Fact {
		const fact: Fact = {
			id: genId("fact"),
			childId,
			category,
			key,
			value,
			createdAt: new Date().toISOString(),
		};
		this.db
			.prepare(
				`INSERT INTO facts (id, child_id, category, key, value, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(
				fact.id,
				fact.childId,
				fact.category,
				fact.key,
				JSON.stringify(fact.value),
				fact.createdAt,
			);
		this.recordDelta("facts", fact.id, "insert", { ...fact });
		return fact;
	}

	getFacts(childId: string, category?: FactCategory): Fact[] {
		const sql = category
			? `SELECT * FROM facts WHERE child_id = ? AND category = ? ORDER BY created_at DESC`
			: `SELECT * FROM facts WHERE child_id = ? ORDER BY created_at DESC`;
		const stmt = this.db.prepare(sql);
		const rows = (
			category ? stmt.all(childId, category) : stmt.all(childId)
		) as Array<{
			id: string;
			child_id: string;
			category: FactCategory;
			key: string;
			value: string;
			created_at: string;
		}>;
		return rows.map((row) => ({
			id: row.id,
			childId: row.child_id,
			category: row.category,
			key: row.key,
			value: JSON.parse(row.value),
			createdAt: row.created_at,
		}));
	}

	deleteFact(id: string): boolean {
		const result = this.db
			.prepare(`DELETE FROM facts WHERE id = ?`)
			.run(id);
		if (result.changes > 0) {
			this.recordDelta("facts", id, "delete", { id });
			return true;
		}
		return false;
	}

	// ─── L3: Episodes (Episodic) ──────────────────────────────────────────

	addEpisode(
		childId: string,
		type: EpisodeType,
		content: Record<string, unknown>,
	): Episode {
		const episode: Episode = {
			id: genId("ep"),
			childId,
			type,
			content,
			createdAt: new Date().toISOString(),
		};
		this.db
			.prepare(
				`INSERT INTO episodes (id, child_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)`,
			)
			.run(
				episode.id,
				episode.childId,
				episode.type,
				JSON.stringify(episode.content),
				episode.createdAt,
			);
		this.recordDelta("episodes", episode.id, "insert", { ...episode });
		return episode;
	}

	getEpisodes(
		childId: string,
		type?: EpisodeType,
		limit?: number,
	): Episode[] {
		const sql = type
			? `SELECT * FROM episodes WHERE child_id = ? AND type = ? ORDER BY created_at DESC ${limit ? `LIMIT ${limit}` : ""}`
			: `SELECT * FROM episodes WHERE child_id = ? ORDER BY created_at DESC ${limit ? `LIMIT ${limit}` : ""}`;
		const stmt = this.db.prepare(sql);
		const rows = (
			type ? stmt.all(childId, type) : stmt.all(childId)
		) as Array<{
			id: string;
			child_id: string;
			type: EpisodeType;
			content: string;
			created_at: string;
		}>;
		return rows.map((row) => ({
			id: row.id,
			childId: row.child_id,
			type: row.type,
			content: JSON.parse(row.content),
			createdAt: row.created_at,
		}));
	}

	// ─── L4: Sessions (Working Memory) ────────────────────────────────────

	startSession(
		childId: string,
		context: Record<string, unknown> = {},
	): Session {
		const now = new Date().toISOString();
		const session: Session = {
			id: genId("sess"),
			childId,
			startedAt: now,
			lastActive: now,
			context,
		};
		this.db
			.prepare(
				`INSERT INTO sessions (id, child_id, started_at, last_active, context) VALUES (?, ?, ?, ?, ?)`,
			)
			.run(
				session.id,
				session.childId,
				session.startedAt,
				session.lastActive,
				JSON.stringify(session.context),
			);
		this.recordDelta("sessions", session.id, "insert", { ...session });
		return session;
	}

	updateSession(
		sessionId: string,
		context: Record<string, unknown>,
	): Session | null {
		const now = new Date().toISOString();
		const result = this.db
			.prepare(
				`UPDATE sessions SET context = ?, last_active = ? WHERE id = ?`,
			)
			.run(JSON.stringify(context), now, sessionId);
		if (result.changes === 0) return null;
		const row = this.db
			.prepare(`SELECT * FROM sessions WHERE id = ?`)
			.get(sessionId) as {
			id: string;
			child_id: string;
			started_at: string;
			last_active: string;
			context: string;
		};
		this.recordDelta("sessions", sessionId, "update", {
			context,
			lastActive: now,
		});
		return {
			id: row.id,
			childId: row.child_id,
			startedAt: row.started_at,
			lastActive: row.last_active,
			context: JSON.parse(row.context),
		};
	}

	getSession(sessionId: string): Session | null {
		const row = this.db
			.prepare(`SELECT * FROM sessions WHERE id = ?`)
			.get(sessionId) as
			| {
					id: string;
					child_id: string;
					started_at: string;
					last_active: string;
					context: string;
			  }
			| undefined;
		if (!row) return null;
		return {
			id: row.id,
			childId: row.child_id,
			startedAt: row.started_at,
			lastActive: row.last_active,
			context: row.context ? JSON.parse(row.context) : {},
		};
	}

	getActiveSession(childId: string): Session | null {
		// most recently active session in the last 24 hours
		const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const row = this.db
			.prepare(
				`SELECT * FROM sessions WHERE child_id = ? AND last_active > ? ORDER BY last_active DESC LIMIT 1`,
			)
			.get(childId, cutoff) as
			| {
					id: string;
					child_id: string;
					started_at: string;
					last_active: string;
					context: string;
			  }
			| undefined;
		if (!row) return null;
		return {
			id: row.id,
			childId: row.child_id,
			startedAt: row.started_at,
			lastActive: row.last_active,
			context: row.context ? JSON.parse(row.context) : {},
		};
	}

	// ─── Delta Log (PowerSync-ready) ──────────────────────────────────────

	private recordDelta(
		tableName: string,
		rowId: string,
		op: DeltaOp,
		payload: Record<string, unknown>,
	): void {
		this.db
			.prepare(
				`INSERT INTO delta_log (table_name, row_id, op, payload, synced_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)`,
			)
			.run(
				tableName,
				rowId,
				op,
				JSON.stringify(payload),
				new Date().toISOString(),
			);
	}

	getDeltaLog(since?: number, includeUnsynced: boolean = true): DeltaEntry[] {
		const sql = includeUnsynced
			? `SELECT * FROM delta_log WHERE id > ? ORDER BY id ASC`
			: `SELECT * FROM delta_log WHERE id > ? AND synced_at IS NOT NULL ORDER BY id ASC`;
		const rows = this.db.prepare(sql).all(since ?? 0) as Array<{
			id: number;
			table_name: string;
			row_id: string;
			op: string;
			payload: string;
			synced_at: string | null;
			created_at: string;
		}>;
		return rows.map((row) => ({
			id: row.id,
			tableName: row.table_name,
			rowId: row.row_id,
			op: row.op as DeltaOp,
			payload: JSON.parse(row.payload),
			syncedAt: row.synced_at,
			createdAt: row.created_at,
		}));
	}

	markDeltaSynced(uptoId: number): number {
		const now = new Date().toISOString();
		const result = this.db
			.prepare(
				`UPDATE delta_log SET synced_at = ? WHERE id <= ? AND synced_at IS NULL`,
			)
			.run(now, uptoId);
		return result.changes;
	}

	/** Get only unsynced deltas (synced_at IS NULL), optionally capped. */
	getUnsyncedDeltas(limit?: number): DeltaEntry[] {
		const sql = limit
			? `SELECT * FROM delta_log WHERE synced_at IS NULL ORDER BY id ASC LIMIT ?`
			: `SELECT * FROM delta_log WHERE synced_at IS NULL ORDER BY id ASC`;
		const rows = (
			limit ? this.db.prepare(sql).all(limit) : this.db.prepare(sql).all()
		) as Array<{
			id: number;
			table_name: string;
			row_id: string;
			op: string;
			payload: string;
			synced_at: string | null;
			created_at: string;
		}>;
		return rows.map((row) => ({
			id: row.id,
			tableName: row.table_name,
			rowId: row.row_id,
			op: row.op as DeltaOp,
			payload: JSON.parse(row.payload),
			syncedAt: row.synced_at,
			createdAt: row.created_at,
		}));
	}

	/** Summary stats for the delta log. */
	getDeltaStats(): {
		total: number;
		unsynced: number;
		byTable: Record<string, number>;
		byOp: Record<string, number>;
	} {
		const total = (
			this.db.prepare(`SELECT COUNT(*) AS cnt FROM delta_log`).get() as {
				cnt: number;
			}
		).cnt;
		const unsynced = (
			this.db
				.prepare(
					`SELECT COUNT(*) AS cnt FROM delta_log WHERE synced_at IS NULL`,
				)
				.get() as { cnt: number }
		).cnt;
		const byTable: Record<string, number> = {};
		for (const row of this.db
			.prepare(
				`SELECT table_name, COUNT(*) AS cnt FROM delta_log GROUP BY table_name`,
			)
			.all() as Array<{ table_name: string; cnt: number }>) {
			byTable[row.table_name] = row.cnt;
		}
		const byOp: Record<string, number> = {};
		for (const row of this.db
			.prepare(`SELECT op, COUNT(*) AS cnt FROM delta_log GROUP BY op`)
			.all() as Array<{ op: string; cnt: number }>) {
			byOp[row.op] = row.cnt;
		}
		return { total, unsynced, byTable, byOp };
	}

	// ─── Symptom time series (fever curve etc.) ────────────────────────────

	/**
	 * Insert a symptom reading. Pass `createdAt` in options to backfill
	 * historical readings (e.g. when a parent logs yesterday's fever
	 * after the fact).
	 */
	addSymptom(
		childId: string,
		type: SymptomType,
		value: number,
		options: { unit?: string; note?: string; createdAt?: string } = {},
	): SymptomLog {
		const log: SymptomLog = {
			id: genId("sym"),
			childId,
			type,
			value,
			createdAt: options.createdAt ?? new Date().toISOString(),
			...(options.unit !== undefined ? { unit: options.unit } : {}),
			...(options.note !== undefined ? { note: options.note } : {}),
		};
		this.db
			.prepare(
				`INSERT INTO symptom_logs (id, child_id, type, value, unit, note, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				log.id,
				log.childId,
				log.type,
				log.value,
				log.unit ?? null,
				log.note ?? null,
				log.createdAt,
			);
		this.recordDelta("symptom_logs", log.id, "insert", {
			childId: log.childId,
			type: log.type,
			value: log.value,
			unit: log.unit ?? null,
			note: log.note ?? null,
			createdAt: log.createdAt,
		});
		return log;
	}

	/**
	 * All readings for a child, sorted newest-first.
	 */
	listSymptoms(childId: string): SymptomLog[] {
		const rows = this.db
			.prepare(
				`SELECT * FROM symptom_logs WHERE child_id = ? ORDER BY created_at DESC`,
			)
			.all(childId) as Array<{
				id: string;
				child_id: string;
				type: string;
				value: number;
				unit: string | null;
				note: string | null;
				created_at: string;
			}>;
		return rows.map((row) => ({
			id: row.id,
			childId: row.child_id,
			type: row.type as SymptomType,
			value: row.value,
			...(row.unit !== null ? { unit: row.unit } : {}),
			...(row.note !== null ? { note: row.note } : {}),
			createdAt: row.created_at,
		}));
	}

	/**
	 * Fever readings for a child within the last `hours` window.
	 * Returns chronological-ascending so `computeFeverTrend` can sum them
	 * without re-sorting.
	 */
	recentFeverBy(childId: string, sinceIso: string): SymptomLog[] {
		const rows = this.db
			.prepare(
				`SELECT * FROM symptom_logs
				 WHERE child_id = ? AND type = 'fever' AND created_at >= ?
				 ORDER BY created_at ASC`,
			)
			.all(childId, sinceIso) as Array<{
				id: string;
				child_id: string;
				type: string;
				value: number;
				unit: string | null;
				note: string | null;
				created_at: string;
			}>;
		return rows.map((row) => ({
			id: row.id,
			childId: row.child_id,
			type: row.type as SymptomType,
			value: row.value,
			...(row.unit !== null ? { unit: row.unit } : {}),
			...(row.note !== null ? { note: row.note } : {}),
			createdAt: row.created_at,
		}));
	}

	/**
	 * Compute a fever trend over the last `hours`. Thin wrapper that
	 * fetches the readings then delegates to `computeFeverTrend` (the
	 * pure function lives in symptom.ts so tests can cover it without
	 * spinning up the DB).
	 */
	computeFeverTrend(
		childId: string,
		hours: number,
		asOf: Date = new Date(),
	): FeverTrend {
		const since = new Date(asOf.getTime() - hours * 60 * 60 * 1000).toISOString();
		const readings = this.recentFeverBy(childId, since);
		return computeFeverTrend(readings);
	}

	// ─── Lifecycle ────────────────────────────────────────────────────────

	close(): void {
		if (!this._closed) {
			this.db.close();
			this._closed = true;
		}
	}

	get isClosed(): boolean {
		return this._closed;
	}
}
