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

export type FactCategory =
	| "vaccine"
	| "milestone"
	| "family"
	| "medical"
	| "education"
	| "preference";

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

// ─── L2.5: Symptom Time Series ────────────────────────────────────────

/**
 * Closed vocabulary of symptom signals parents can log. Adding to this
 * list is a deliberate API change (the persistence layer treats it as
 * `CHECK` in newer schema versions, but the current schema is loose).
 */
export type SymptomType =
	| "fever"
	| "cough"
	| "vomit"
	| "diarrhea"
	| "rash"
	| "appetite"
	| "sleep"
	| "mood"
	| "other";

export interface SymptomLog {
	id: string;
	childId: string;
	type: SymptomType;
	/** Numeric magnitude. Free-form (Celsius for fever, count for vomit, etc.). */
	value: number;
	/** Display unit such as "C", "°F", "次", "mmol/L". Optional. */
	unit?: string;
	note?: string;
	createdAt: string;
}

/**
 * Result of a fever trend analysis over the recent N hours.
 * Computed by `MemoryLayer.computeFeverTrend()`.
 */
export type FeverDirection = "rising" | "stable" | "falling" | "unknown";
export type FeverActionFlag =
	| "none"
	| "watch"
	| "see-doctor"
	| "urgent";

export interface FeverTrend {
	count: number;
	min: number;
	max: number;
	avg: number;
	/** Latest value - earliest value (positive = rising). */
	delta: number;
	direction: FeverDirection;
	/** Span of the readings in hours (max ts - min ts). */
	durationHours: number;
	actionFlag: FeverActionFlag;
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
export function computeStage(
	birthDate: string,
	asOf: Date = new Date(),
): ChildStage {
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

// ─── Family collaboration (shared child profiles) ─────────────────────

/**
 * Caregiver roles control what a co-parent / grandparent can do in a
 * shared child profile.
 *   - "primary"  → full read/write, can add facts, episodes, feedback
 *   - "caregiver"→ can read everything, can add episodes/feedback, no
 *                  changes to milestones or vaccine history
 *   - "viewer"   → read-only, cannot mutate the shared profile
 */
export type CaregiverRole = "primary" | "caregiver" | "viewer";

export interface Caregiver {
	id: string;
	name: string;
	role: CaregiverRole;
	/** Optional contact (email/phone/WeChat) for share-link delivery. */
	contact?: string;
	addedAt: string;
}

export interface ChildSharePayload {
	version: 1;
	exportedAt: string;
	exportedBy: string;
	child: ChildProfile;
	facts: Fact[];
	episodes: Episode[];
	caregivers: Caregiver[];
}

/**
 * Permissions a CaregiverRole grants on a shared profile.
 * Returns the set of operations a role can perform.
 */
export function caregiverPermissions(role: CaregiverRole): {
	canEditChild: boolean;
	canAddFacts: boolean;
	canAddEpisodes: boolean;
	canAddFeedback: boolean;
	canExport: boolean;
} {
	switch (role) {
		case "primary":
			return {
				canEditChild: true,
				canAddFacts: true,
				canAddEpisodes: true,
				canAddFeedback: true,
				canExport: true,
			};
		case "caregiver":
			return {
				canEditChild: false,
				canAddFacts: false,
				canAddEpisodes: true,
				canAddFeedback: true,
				canExport: true,
			};
		case "viewer":
			return {
				canEditChild: false,
				canAddFacts: false,
				canAddEpisodes: false,
				canAddFeedback: false,
				canExport: true,
			};
	}
}

/**
 * Validate that a CaregiverRole can perform an action. Returns true
 * if allowed, false if denied.
 */
export function canCaregiver(
	role: CaregiverRole,
	action:
		| "editChild"
		| "addFacts"
		| "addEpisodes"
		| "addFeedback"
		| "export",
): boolean {
	const perms = caregiverPermissions(role);
	switch (action) {
		case "editChild":
			return perms.canEditChild;
		case "addFacts":
			return perms.canAddFacts;
		case "addEpisodes":
			return perms.canAddEpisodes;
		case "addFeedback":
			return perms.canAddFeedback;
		case "export":
			return perms.canExport;
	}
}

/**
 * Strip metadata that should not be exported (e.g. internal flags).
 * Returns a new child profile with only shareable fields.
 */
export function sanitizeChildForShare(
	child: ChildProfile,
): ChildProfile {
	const { metadata, ...rest } = child;
	// Drop the metadata bag; medical and contact data should never
	// leave the device without explicit consent.
	void metadata;
	return { ...rest };
}

/**
 * Build a shareable payload from a child + facts + episodes + caregivers.
 * Pure function — caller supplies the data layer. The output is a
 * deterministic JSON-serializable object suitable for QR code, deep
 * link, or file export.
 */
export function buildChildSharePayload(input: {
	child: ChildProfile;
	facts: Fact[];
	episodes: Episode[];
	caregivers: Caregiver[];
	exportedBy: string;
}): ChildSharePayload {
	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		exportedBy: input.exportedBy,
		child: sanitizeChildForShare(input.child),
		facts: [...input.facts],
		episodes: [...input.episodes],
		caregivers: [...input.caregivers],
	};
}

/**
 * Validate a share payload. Returns true if the payload is well-formed
 * (version 1, child has required fields, all dates are valid).
 */
export function validateChildSharePayload(
	payload: unknown,
): payload is ChildSharePayload {
	if (!payload || typeof payload !== "object") return false;
	const p = payload as Partial<ChildSharePayload>;
	if (p.version !== 1) return false;
	if (!p.child || typeof p.child !== "object") return false;
	const c = p.child as Partial<ChildProfile>;
	if (!c.id || !c.name || !c.birthDate || !c.stage) return false;
	if (typeof c.id !== "string") return false;
	if (typeof c.name !== "string") return false;
	if (typeof c.birthDate !== "string" || isNaN(Date.parse(c.birthDate)))
		return false;
	if (!Array.isArray(p.facts)) return false;
	if (!Array.isArray(p.episodes)) return false;
	if (!Array.isArray(p.caregivers)) return false;
	if (typeof p.exportedBy !== "string") return false;
	if (typeof p.exportedAt !== "string" || isNaN(Date.parse(p.exportedAt)))
		return false;
	return true;
}

/**
 * Encode a share payload to a base64url string (URL-safe). Useful for
 * embedding in a query string or QR code.
 */
export function encodeSharePayload(payload: ChildSharePayload): string {
	const json = JSON.stringify(payload);
	// Use base64url-safe encoding that works in URLs and QR codes.
	return Buffer.from(json, "utf8").toString("base64url");
}

/**
 * Decode a base64url string back into a share payload. Returns null
 * if the input is not valid base64url or not a valid payload.
 */
export function decodeSharePayload(
	encoded: string,
): ChildSharePayload | null {
	try {
		const json = Buffer.from(encoded, "base64url").toString("utf8");
		const parsed = JSON.parse(json);
		if (!validateChildSharePayload(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}
