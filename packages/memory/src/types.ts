/**
 * Core types for MemoryLayer.
 */

export type ChildStage =
	| "newborn" // 0-1 month
	| "infant" // 1-12 months
	| "toddler" // 1-3 years
	| "preschool" // 3-6 years
	| "school_age" // 6-12 years
	| "tween" // 12-15 years
	| "teen" // 15-18 years
	| "young_adult"; // 18+ (college)

export interface ChildProfile {
	id: string;
	name: string;
	birthDate: string; // ISO 8601 date
	stage: ChildStage;
	metadata?: Record<string, unknown>;
}

export type FactCategory = "vaccine" | "milestone" | "family" | "medical" | "education" | "preference";

export interface Fact {
	id: string;
	childId: string;
	category: FactCategory;
	key: string;
	value: Record<string, unknown>;
	createdAt: string;
}

export type EpisodeType = "qa" | "visit" | "event" | "observation";

export interface Episode {
	id: string;
	childId: string;
	type: EpisodeType;
	content: Record<string, unknown>;
	createdAt: string;
}

export interface Session {
	id: string;
	childId: string;
	startedAt: string;
	lastActive: string;
	context: Record<string, unknown>;
}

export type DeltaOp = "insert" | "update" | "upsert" | "delete";

export interface DeltaEntry {
	id: number;
	tableName: string;
	rowId: string;
	op: DeltaOp;
	payload: Record<string, unknown>;
	syncedAt: string | null;
	createdAt: string;
}

/**
 * Compute child stage from birth date.
 */
export function computeStage(birthDate: string, asOf: Date = new Date()): ChildStage {
	const birth = new Date(birthDate);
	const ageMs = asOf.getTime() - birth.getTime();
	const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44); // avg month
	const ageYears = ageMonths / 12;

	if (ageMonths < 1) return "newborn";
	if (ageYears < 1) return "infant";
	if (ageYears < 3) return "toddler";
	if (ageYears < 6) return "preschool";
	if (ageYears < 12) return "school_age";
	if (ageYears < 15) return "tween";
	if (ageYears < 18) return "teen";
	return "young_adult";
}

/**
 * Generate a unique ID with optional prefix.
 */
export function genId(prefix: string = "id"): string {
	const ts = Date.now().toString(36);
	const rand = Math.random().toString(36).slice(2, 8);
	return `${prefix}_${ts}${rand}`;
}
