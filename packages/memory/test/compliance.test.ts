import { describe, expect, it } from "vitest";
import {
	AuditLog,
	COMPLIANCE_DISCLAIMER,
	computeExpiry,
	type DataRecord,
	DEFAULT_RETENTION,
	exportSubjectData,
	isExpired,
	processRightToBeForgotten,
	redactValue,
	requiresConsent,
	shouldAutoDelete,
	shouldAutoRedact,
} from "../src/index.js";

function makeRecord(overrides: Partial<DataRecord> = {}): DataRecord {
	return {
		id: "r1",
		category: "health_record",
		subject: "child",
		value: "flu symptoms",
		createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
		retentionDays: 2190,
		redacted: false,
		...overrides,
	};
}

describe("redactValue", () => {
	it("redacts personal_id keeping last 4 chars", () => {
		expect(redactValue("1234567890", "personal_id")).toBe("***7890");
	});

	it("redacts short personal_id entirely", () => {
		expect(redactValue("123", "personal_id")).toBe("***");
	});

	it("redacts email keeping domain", () => {
		const out = redactValue("john@example.com", "contact");
		expect(out).toContain("***@example.com");
		expect(out).not.toContain("john");
	});

	it("redacts phone keeping first/last 2 chars", () => {
		const out = redactValue("13800138000", "contact");
		expect(out).toContain("***");
		expect(out.length).toBeLessThan(12);
	});

	it("redacts email with empty domain", () => {
		const out = redactValue("user@", "contact");
		expect(out).toContain("@");
	});

	it("redacts email with empty local part (fallback to *)", () => {
		const out = redactValue("@domain.com", "contact");
		expect(out).toContain("***@domain.com");
	});

	it("redacts short contact as ***", () => {
		expect(redactValue("1234", "contact")).toBe("***");
	});

	it("always fully redacts biometric", () => {
		expect(redactValue("any biometric data", "biometric")).toBe(
			"[REDACTED-BIOMETRIC]",
		);
	});

	it("always fully redacts location", () => {
		expect(redactValue("Beijing", "location")).toBe("[REDACTED-LOCATION]");
	});

	it("redacts health record with length", () => {
		expect(redactValue("cough fever", "health_record")).toContain(
			"[REDACTED-HEALTH:",
		);
	});

	it("redacts other categories with category tag", () => {
		expect(redactValue("x", "behavioral")).toBe("[REDACTED-BEHAVIORAL]");
	});
});

describe("computeExpiry", () => {
	it("uses category policy", () => {
		const created = new Date("2024-01-01").getTime();
		const exp = computeExpiry(created, "health_record");
		const expected = created + 2190 * 24 * 60 * 60 * 1000;
		expect(exp).toBe(expected);
	});

	it("uses custom policy", () => {
		const created = new Date("2024-01-01").getTime();
		const exp = computeExpiry(created, "health_record", {
			maxAgeDays: 100,
			autoRedact: true,
			autoDelete: false,
			requiresConsent: true,
		});
		expect(exp).toBe(created + 100 * 24 * 60 * 60 * 1000);
	});
});

describe("isExpired", () => {
	it("returns false for new record", () => {
		expect(isExpired(makeRecord({ createdAt: Date.now() }))).toBe(false);
	});

	it("returns true for old record", () => {
		const old = makeRecord({
			createdAt: Date.now() - 100 * 365 * 24 * 60 * 60 * 1000,
		});
		expect(isExpired(old)).toBe(true);
	});
});

describe("shouldAutoRedact", () => {
	it("returns false if policy doesn't auto-redact", () => {
		const r = makeRecord({ category: "health_record" });
		expect(shouldAutoRedact(r)).toBe(false);
	});

	it("returns true for behavioral close to expiry", () => {
		const r = makeRecord({
			category: "behavioral",
			createdAt: Date.now() - (730 - 29) * 24 * 60 * 60 * 1000,
		});
		expect(shouldAutoRedact(r)).toBe(true);
	});

	it("returns false if already redacted", () => {
		const r = makeRecord({
			category: "behavioral",
			redacted: true,
			createdAt: Date.now() - (730 - 31) * 24 * 60 * 60 * 1000,
		});
		expect(shouldAutoRedact(r)).toBe(false);
	});
});

describe("shouldAutoDelete", () => {
	it("returns true for expired health_record", () => {
		const r = makeRecord({
			category: "health_record",
			createdAt: Date.now() - 100 * 365 * 24 * 60 * 60 * 1000,
		});
		expect(shouldAutoDelete(r)).toBe(true);
	});

	it("returns false for new record", () => {
		expect(shouldAutoDelete(makeRecord({ createdAt: Date.now() }))).toBe(
			false,
		);
	});

	it("returns false for categories without autoDelete", () => {
		const r = makeRecord({
			category: "preferences",
			createdAt: Date.now() - 100 * 365 * 24 * 60 * 60 * 1000,
		});
		expect(shouldAutoDelete(r)).toBe(false);
	});
});

describe("requiresConsent", () => {
	it("returns true for personal_id", () => {
		expect(requiresConsent("personal_id")).toBe(true);
	});

	it("returns false for preferences", () => {
		expect(requiresConsent("preferences")).toBe(false);
	});
});

describe("DEFAULT_RETENTION", () => {
	it("has entries for all categories", () => {
		const cats = [
			"personal_id",
			"health_record",
			"behavioral",
			"biometric",
			"location",
			"contact",
			"preferences",
		];
		for (const c of cats) {
			expect(DEFAULT_RETENTION[c as never]).toBeDefined();
		}
	});

	it("all retention periods are positive", () => {
		for (const policy of Object.values(DEFAULT_RETENTION)) {
			expect(policy.maxAgeDays).toBeGreaterThan(0);
		}
	});
});

describe("AuditLog", () => {
	it("records entries with incrementing ids", () => {
		const log = new AuditLog();
		const e1 = log.record("user1", "read", "child", "r1", "health_record");
		const e2 = log.record("user1", "write", "child", "r2", "health_record");
		expect(e1.id).not.toBe(e2.id);
		expect(log.size()).toBe(2);
	});

	it("lists all without filter", () => {
		const log = new AuditLog();
		log.record("a", "read", "child", "r", "health_record");
		log.record("b", "write", "parent", "r", "contact");
		expect(log.list()).toHaveLength(2);
	});

	it("filters by subject", () => {
		const log = new AuditLog();
		log.record("a", "read", "child", "r", "health_record");
		log.record("b", "write", "parent", "r", "contact");
		const childOnly = log.list({ subject: "child" });
		expect(childOnly).toHaveLength(1);
		expect(childOnly[0]?.subject).toBe("child");
	});

	it("filters by actor", () => {
		const log = new AuditLog();
		log.record("alice", "read", "child", "r", "health_record");
		log.record("bob", "write", "parent", "r", "contact");
		const aliceOnly = log.list({ actor: "alice" });
		expect(aliceOnly).toHaveLength(1);
	});

	it("clear empties log", () => {
		const log = new AuditLog();
		log.record("a", "read", "child", "r", "health_record");
		log.clear();
		expect(log.size()).toBe(0);
	});
});

describe("processRightToBeForgotten", () => {
	it("redacts non-auto-delete categories", () => {
		const records = [makeRecord({ id: "x1", category: "behavioral" })];
		const log = new AuditLog();
		const result = processRightToBeForgotten(records, "x1", log, "user1");
		expect(result.redacted).toBe(1);
		expect(result.deleted).toBe(0);
		expect(log.size()).toBe(1);
		expect(log.list()[0]?.action).toBe("redact");
	});

	it("deletes auto-delete categories", () => {
		const records = [makeRecord({ id: "x1", category: "personal_id" })];
		const log = new AuditLog();
		const result = processRightToBeForgotten(records, "x1", log, "user1");
		expect(result.deleted).toBe(1);
		expect(result.redacted).toBe(0);
	});

	it("leaves unrelated records untouched", () => {
		const records = [
			makeRecord({ id: "x1", category: "personal_id" }),
			makeRecord({ id: "x2", category: "behavioral" }),
		];
		const log = new AuditLog();
		const result = processRightToBeForgotten(records, "x1", log, "user1");
		expect(result.deleted).toBe(1);
		expect(result.remaining).toBe(1);
	});

	it("no-op for missing target", () => {
		const records = [makeRecord({ id: "x1" })];
		const log = new AuditLog();
		const result = processRightToBeForgotten(records, "x2", log, "user1");
		expect(result.deleted).toBe(0);
		expect(result.redacted).toBe(0);
		expect(result.remaining).toBe(1);
	});
});

describe("exportSubjectData", () => {
	it("exports subject records as markdown", () => {
		const records = [
			makeRecord({ id: "x1", subject: "child" }),
			makeRecord({ id: "x2", subject: "parent" }),
		];
		const out = exportSubjectData(records, "child");
		expect(out).toContain("Data export for child");
		expect(out).toContain("x1");
		expect(out).not.toContain("x2");
	});

	it("includes metadata in export", () => {
		const records = [makeRecord({ id: "x1", category: "biometric" })];
		const out = exportSubjectData(records, "child");
		expect(out).toContain("biometric");
		expect(out).toContain("Redacted");
	});
});

describe("COMPLIANCE_DISCLAIMER", () => {
	it("includes warning emoji", () => {
		expect(COMPLIANCE_DISCLAIMER).toContain("⚠️");
	});
});
