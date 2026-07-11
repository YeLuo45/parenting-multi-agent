/**
 * Compliance audit — data privacy + retention helpers.
 *
 * Direction U7: HIPAA/GDPR compliance.
 *
 * Pure functions: audit log + redaction + retention policy.
 */

export type DataCategory =
	| "personal_id"
	| "health_record"
	| "behavioral"
	| "biometric"
	| "location"
	| "contact"
	| "preferences";

export type DataSubject = "child" | "parent" | "household";

export interface DataRecord {
	id: string;
	category: DataCategory;
	subject: DataSubject;
	value: string;
	createdAt: number;
	retentionDays: number;
	redacted: boolean;
}

export interface AuditEntry {
	id: string;
	timestamp: number;
	actor: string;
	action: "read" | "write" | "delete" | "export" | "redact" | "consent";
	subject: DataSubject;
	recordId: string;
	category: DataCategory;
	legalBasis: string;
}

export interface RetentionPolicy {
	maxAgeDays: number;
	autoRedact: boolean;
	autoDelete: boolean;
	requiresConsent: boolean;
}

export const DEFAULT_RETENTION: Record<DataCategory, RetentionPolicy> = {
	personal_id: {
		maxAgeDays: 2555,
		autoRedact: false,
		autoDelete: true,
		requiresConsent: true,
	},
	health_record: {
		maxAgeDays: 2190,
		autoRedact: false,
		autoDelete: true,
		requiresConsent: true,
	},
	behavioral: {
		maxAgeDays: 730,
		autoRedact: true,
		autoDelete: false,
		requiresConsent: true,
	},
	biometric: {
		maxAgeDays: 365,
		autoRedact: true,
		autoDelete: true,
		requiresConsent: true,
	},
	location: {
		maxAgeDays: 90,
		autoRedact: true,
		autoDelete: true,
		requiresConsent: true,
	},
	contact: {
		maxAgeDays: 1825,
		autoRedact: false,
		autoDelete: true,
		requiresConsent: true,
	},
	preferences: {
		maxAgeDays: 1095,
		autoRedact: false,
		autoDelete: false,
		requiresConsent: false,
	},
};

/** Redact a value for safe logging / sharing. */
export function redactValue(value: string, category: DataCategory): string {
	if (category === "personal_id") {
		// Hash-like placeholder: keep last 4 chars
		return value.length > 4 ? `***${value.slice(-4)}` : "***";
	}
	if (category === "contact") {
		// Email/phone: keep first char + domain if email
		if (value.includes("@")) {
			const parts = value.split("@");
			const local = parts[0] || "";
			const domain = parts.slice(1).join("@");
			const first = local.length > 0 ? local[0]! : "*";
			return `${first}***@${domain}`;
		}
		return value.length > 4
			? `${value.slice(0, 2)}***${value.slice(-2)}`
			: "***";
	}
	if (category === "biometric") {
		return "[REDACTED-BIOMETRIC]";
	}
	if (category === "location") {
		return "[REDACTED-LOCATION]";
	}
	if (category === "health_record") {
		return `[REDACTED-HEALTH:${value.length}]`;
	}
	return `[REDACTED-${category.toUpperCase()}]`;
}

/** Compute expiry timestamp for a record. */
export function computeExpiry(
	createdAt: number,
	category: DataCategory,
	policy: RetentionPolicy = DEFAULT_RETENTION[category],
): number {
	return createdAt + policy.maxAgeDays * 24 * 60 * 60 * 1000;
}

/** Check if a record has expired. */
export function isExpired(
	record: DataRecord,
	now: number = Date.now(),
): boolean {
	return computeExpiry(record.createdAt, record.category) < now;
}

/** Check if a record is eligible for auto-redaction. */
export function shouldAutoRedact(
	record: DataRecord,
	now: number = Date.now(),
): boolean {
	const policy = DEFAULT_RETENTION[record.category];
	if (!policy.autoRedact) return false;
	const expiry = computeExpiry(record.createdAt, record.category);
	const redactAt = expiry - 30 * 24 * 60 * 60 * 1000; // 30 days before expiry
	return now >= redactAt && !record.redacted;
}

/** Check if a record is eligible for auto-deletion. */
export function shouldAutoDelete(
	record: DataRecord,
	now: number = Date.now(),
): boolean {
	const policy = DEFAULT_RETENTION[record.category];
	if (!policy.autoDelete) return false;
	return isExpired(record, now);
}

/** Audit log — append-only entry tracker. */
export class AuditLog {
	private entries: AuditEntry[] = [];
	private nextId = 0;

	record(
		actor: string,
		action: AuditEntry["action"],
		subject: DataSubject,
		recordId: string,
		category: DataCategory,
		legalBasis = "legitimate-interest",
	): AuditEntry {
		const e: AuditEntry = {
			id: `a_${this.nextId++}`,
			timestamp: Date.now(),
			actor,
			action,
			subject,
			recordId,
			category,
			legalBasis,
		};
		this.entries.push(e);
		return e;
	}

	list(filter?: { subject?: DataSubject; actor?: string }): AuditEntry[] {
		if (!filter) return [...this.entries];
		return this.entries.filter((e) => {
			if (filter.subject && e.subject !== filter.subject) return false;
			if (filter.actor && e.actor !== filter.actor) return false;
			return true;
		});
	}

	size(): number {
		return this.entries.length;
	}

	clear(): void {
		this.entries = [];
	}
}

/** Right-to-be-forgotten processor — redacts or deletes matching records. */
export function processRightToBeForgotten(
	records: DataRecord[],
	targetId: string,
	audit: AuditLog,
	actor: string,
): { redacted: number; deleted: number; remaining: number } {
	let redacted = 0;
	let deleted = 0;
	const remaining: DataRecord[] = [];
	for (const r of records) {
		if (r.id !== targetId) {
			remaining.push(r);
			continue;
		}
		const policy = DEFAULT_RETENTION[r.category];
		if (policy.autoDelete) {
			deleted++;
			audit.record(
				actor,
				"delete",
				r.subject,
				r.id,
				r.category,
				"right-to-be-forgotten",
			);
		} else {
			redacted++;
			audit.record(
				actor,
				"redact",
				r.subject,
				r.id,
				r.category,
				"right-to-be-forgotten",
			);
		}
	}
	return { redacted, deleted, remaining: remaining.length };
}

/** Generate a data export for a subject (GDPR Article 15). */
export function exportSubjectData(
	records: DataRecord[],
	subject: DataSubject,
): string {
	const lines: string[] = [
		`# Data export for ${subject}`,
		`# Generated at ${new Date().toISOString()}`,
		"",
	];
	for (const r of records) {
		if (r.subject !== subject) continue;
		lines.push(
			`## ${r.id}`,
			`Category: ${r.category}`,
			`Created: ${new Date(r.createdAt).toISOString()}`,
			`Redacted: ${r.redacted}`,
			"",
		);
	}
	return lines.join("\n");
}

/** Check whether a category requires explicit consent. */
export function requiresConsent(category: DataCategory): boolean {
	return DEFAULT_RETENTION[category].requiresConsent;
}

export const COMPLIANCE_DISCLAIMER =
	"⚠️ 数据保护合规需结合当地法规（HIPAA/GDPR/PIPL）。本模块提供技术辅助。";
