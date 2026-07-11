import { describe, expect, it } from "vitest";
import {
	buildVaccineSchedule,
	formatVaccineReminder,
	formatVaccineSchedule,
	getDueVaccines,
	isVaccineDue,
	recommendedDateForVaccine,
	VACCINE_DISCLAIMER,
	VACCINES,
	type VaccineId,
	type VaccineRecord,
} from "../src/index.js";

function _makeChild(birthDate: string) {
	return birthDate;
}

function makeRecord(
	vaccineId: VaccineId,
	administeredAt: number,
): VaccineRecord {
	return {
		id: `r_${vaccineId}`,
		vaccineId,
		administeredAt,
	};
}

const NOW = new Date("2026-06-19T00:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

describe("VACCINES data integrity", () => {
	it("contains at least 20 vaccines", () => {
		expect(VACCINES.length).toBeGreaterThanOrEqual(20);
	});

	it("every vaccine has unique id", () => {
		const ids = VACCINES.map((v) => v.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("each vaccine has required fields", () => {
		for (const v of VACCINES) {
			expect(v.name.length).toBeGreaterThan(0);
			expect(v.nameEn.length).toBeGreaterThan(0);
			expect(v.doseLabel.length).toBeGreaterThan(0);
			expect(v.recommendedAgeMonths).toBeGreaterThanOrEqual(0);
		}
	});

	it("every vaccine has either 'national' or 'optional' category", () => {
		for (const v of VACCINES) {
			expect(["national", "optional"]).toContain(v.category);
		}
	});
});

describe("recommendedDateForVaccine", () => {
	it("hep_b_birth is at birth", () => {
		const d = recommendedDateForVaccine("hep_b_birth", "2024-01-01");
		const birth = new Date("2024-01-01").getTime();
		expect(d).toBe(birth);
	});

	it("bcg is at birth", () => {
		const d = recommendedDateForVaccine("bcg", "2024-01-01");
		const birth = new Date("2024-01-01").getTime();
		expect(d).toBe(birth);
	});

	it("dtap_1 is 3 months after birth", () => {
		const d = recommendedDateForVaccine("dtap_1", "2024-01-01");
		const birth = new Date("2024-01-01").getTime();
		const expected = birth + 3 * 30.44 * DAY;
		expect(d).toBeCloseTo(expected, -3);
	});

	it("returns 0 for unknown vaccine id (cast)", () => {
		expect(
			recommendedDateForVaccine(
				"unknown_vaccine" as VaccineId,
				"2024-01-01",
			),
		).toBe(0);
	});
});

describe("buildVaccineSchedule", () => {
	it("returns one entry per vaccine", () => {
		const sched = buildVaccineSchedule("2024-01-01", [], NOW);
		expect(sched).toHaveLength(VACCINES.length);
	});

	it("marks hep_b_birth as completed when record exists", () => {
		const records = [
			makeRecord("hep_b_birth", new Date("2024-01-01").getTime()),
		];
		const sched = buildVaccineSchedule("2024-01-01", records, NOW);
		const entry = sched.find((e) => e.vaccine.id === "hep_b_birth");
		expect(entry?.dueStatus).toBe("completed");
	});

	it("marks future vaccines correctly", () => {
		// Born 2026-06-19 (today) → all vaccines are upcoming/future
		const sched = buildVaccineSchedule("2026-06-19", [], NOW);
		const future = sched.filter((e) => e.dueStatus === "future");
		expect(future.length).toBeGreaterThan(0);
	});

	it("marks overdue vaccines correctly (born 2 years ago)", () => {
		// Born 2018-01-01, NOW=2026-06-19 → all NIP vaccines should be
		// completed if no records. Wait, no records means none completed,
		// so some are overdue.
		const sched = buildVaccineSchedule("2018-01-01", [], NOW);
		const overdue = sched.filter((e) => e.dueStatus === "overdue");
		expect(overdue.length).toBeGreaterThan(0);
	});

	it("marks dtap_1 as due when born ~3 months ago", () => {
		// Born 2026-03-19 (3 months before NOW=2026-06-19)
		const sched = buildVaccineSchedule("2026-03-19", [], NOW);
		const dtap = sched.find((e) => e.vaccine.id === "dtap_1");
		expect(["due", "overdue"]).toContain(dtap?.dueStatus);
	});

	it("daysUntilDue is negative for overdue", () => {
		const sched = buildVaccineSchedule("2018-01-01", [], NOW);
		const hep = sched.find((e) => e.vaccine.id === "hep_b_birth");
		expect(hep?.daysUntilDue).toBeLessThan(0);
	});
});

describe("getDueVaccines", () => {
	it("filters to due/overdue/upcoming only", () => {
		const sched = buildVaccineSchedule("2018-01-01", [], NOW);
		const due = getDueVaccines(sched);
		for (const e of due) {
			expect(["due", "overdue", "upcoming"]).toContain(e.dueStatus);
		}
	});

	it("returns empty when all completed", () => {
		const records: VaccineRecord[] = VACCINES.map((v) =>
			makeRecord(v.id, NOW - 365 * DAY),
		);
		const sched = buildVaccineSchedule("2018-01-01", records, NOW);
		const due = getDueVaccines(sched);
		expect(due).toEqual([]);
	});
});

describe("isVaccineDue", () => {
	it("returns true for current age window", () => {
		// Born 3 months ago, dtap_1 due around 3 months
		expect(isVaccineDue("dtap_1", "2026-03-19", NOW)).toBe(true);
	});

	it("returns false for past vaccines (no window check)", () => {
		// hep_b_birth for child born 5 years ago is way past
		expect(isVaccineDue("hep_b_birth", "2021-01-01", NOW)).toBe(false);
	});

	it("returns false for unknown id (cast)", () => {
		expect(isVaccineDue("nope" as VaccineId, "2024-01-01", NOW)).toBe(
			false,
		);
	});
});

describe("formatVaccineReminder", () => {
	it("formats completed status", () => {
		const records = [
			makeRecord("hep_b_birth", new Date("2024-01-02").getTime()),
		];
		const sched = buildVaccineSchedule("2024-01-01", records, NOW);
		const hep = sched.find((e) => e.vaccine.id === "hep_b_birth");
		const out = formatVaccineReminder(hep!);
		expect(out).toContain("已完成");
	});

	it("formats overdue status", () => {
		const sched = buildVaccineSchedule("2018-01-01", [], NOW);
		const overdue = sched.find((e) => e.dueStatus === "overdue");
		if (overdue) {
			const out = formatVaccineReminder(overdue);
			expect(out).toContain("已过期");
		}
	});

	it("formats due status", () => {
		const sched = buildVaccineSchedule("2026-03-19", [], NOW);
		const due = sched.find((e) => e.dueStatus === "due");
		if (due) {
			const out = formatVaccineReminder(due);
			expect(out).toContain("现在可接种");
		}
	});

	it("formats future status", () => {
		const sched = buildVaccineSchedule("2026-06-19", [], NOW);
		const future = sched.find((e) => e.dueStatus === "future");
		if (future) {
			const out = formatVaccineReminder(future);
			expect(out).toContain("计划");
		}
	});
});

describe("formatVaccineSchedule", () => {
	it("renders all entries", () => {
		const sched = buildVaccineSchedule("2018-01-01", [], NOW);
		const out = formatVaccineSchedule(sched, 30);
		expect(out).toContain("疫苗接种计划");
		for (const e of sched) {
			expect(out).toContain(e.vaccine.name);
		}
	});

	it("respects limit", () => {
		const sched = buildVaccineSchedule("2018-01-01", [], NOW);
		const out = formatVaccineSchedule(sched, 5);
		const bulletCount = (out.match(/^-/gm) || []).length;
		expect(bulletCount).toBeLessThanOrEqual(5);
	});

	it("shows '...还有 N 项' when truncated", () => {
		const sched = buildVaccineSchedule("2018-01-01", [], NOW);
		const out = formatVaccineSchedule(sched, 3);
		expect(out).toContain("还有");
	});
});

describe("VACCINE_DISCLAIMER", () => {
	it("includes a warning", () => {
		expect(VACCINE_DISCLAIMER).toContain("⚠️");
	});
});
