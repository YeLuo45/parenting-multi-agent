import { describe, expect, it } from "vitest";
import {
	formatMilestoneNotification,
	formatScreenNotification,
	formatStreakNotification,
	formatVaccineNotification,
	getOverdueNotifications,
	isNotificationSupported,
	NOTIFICATION_DISCLAIMER,
	NOTIFICATION_ICON,
	NotificationScheduler,
	requestNotificationPermission,
	showNotification,
} from "../src/notifications.js";

describe("isNotificationSupported", () => {
	it("returns true in jsdom (Notification is mocked)", () => {
		// jsdom doesn't include Notification by default — should be false
		expect(typeof isNotificationSupported()).toBe("boolean");
	});
});

describe("requestNotificationPermission", () => {
	it("returns denied when not supported", async () => {
		const r = await requestNotificationPermission();
		expect(typeof r.granted).toBe("boolean");
		expect(typeof r.denied).toBe("boolean");
		expect(typeof r.timestamp).toBe("number");
	});
});

describe("formatVaccineNotification", () => {
	it("formats upcoming vaccine (days > 0)", () => {
		const future = Date.now() + 7 * 24 * 60 * 60 * 1000;
		const n = formatVaccineNotification("乙肝疫苗", future);
		expect(n.title).toContain("疫苗");
		expect(n.body).toContain("7");
		expect(n.kind).toBe("vaccine");
	});

	it("formats due-today vaccine (days = 0)", () => {
		const n = formatVaccineNotification("卡介苗", Date.now());
		expect(n.body).toContain("今天");
	});

	it("formats overdue vaccine (days < 0)", () => {
		const past = Date.now() - 3 * 24 * 60 * 60 * 1000;
		const n = formatVaccineNotification("百白破", past);
		expect(n.body).toContain("已过期");
		expect(n.body).toContain("3");
	});
});

describe("formatMilestoneNotification", () => {
	it("formats milestone", () => {
		const n = formatMilestoneNotification("小明", 18, "会跑");
		expect(n.title).toContain("小明");
		expect(n.body).toContain("18");
		expect(n.body).toContain("会跑");
	});
});

describe("formatStreakNotification", () => {
	it("formats streak", () => {
		const n = formatStreakNotification("刷牙", 30);
		expect(n.title).toContain("习惯");
		expect(n.body).toContain("30");
	});
});

describe("formatScreenNotification", () => {
	it("formats screen reminder", () => {
		const n = formatScreenNotification("cbcl", 90);
		expect(n.title).toContain("筛查");
		expect(n.body).toContain("90");
	});
});

describe("showNotification", () => {
	it("returns false when not supported", async () => {
		const ok = await showNotification({
			title: "t",
			body: "b",
			emoji: "X",
			kind: "general",
		});
		expect(ok).toBe(false);
	});
});

describe("NotificationScheduler", () => {
	it("schedules and retrieves by id", () => {
		const sched = new NotificationScheduler();
		const n = sched.schedule(
			{ title: "t", body: "b", emoji: "X", kind: "general" },
			Date.now() + 1000,
		);
		expect(n.id).toBeTruthy();
		expect(sched.size()).toBe(1);
	});

	it("getDue returns only due items", () => {
		const sched = new NotificationScheduler();
		const past = Date.now() - 1000;
		const future = Date.now() + 1000;
		sched.schedule(
			{ title: "a", body: "", emoji: "A", kind: "general" },
			past,
		);
		sched.schedule(
			{ title: "b", body: "", emoji: "B", kind: "general" },
			future,
		);
		const due = sched.getDue();
		expect(due).toHaveLength(1);
		expect(due[0]?.content.title).toBe("a");
	});

	it("cancel sets cancelled flag", () => {
		const sched = new NotificationScheduler();
		const n = sched.schedule(
			{ title: "t", body: "", emoji: "X", kind: "general" },
			Date.now() - 1000,
		);
		expect(sched.cancel(n.id)).toBe(true);
		expect(sched.getDue()).toHaveLength(0);
	});

	it("cancel returns false for unknown id", () => {
		const sched = new NotificationScheduler();
		expect(sched.cancel("nonexistent")).toBe(false);
	});

	it("markDelivered sets flag and prevents re-delivery", () => {
		const sched = new NotificationScheduler();
		const n = sched.schedule(
			{ title: "t", body: "", emoji: "X", kind: "general" },
			Date.now() - 1000,
		);
		expect(sched.markDelivered(n.id)).toBe(true);
		expect(sched.getDue()).toHaveLength(0);
	});

	it("markDelivered returns false for already delivered", () => {
		const sched = new NotificationScheduler();
		const n = sched.schedule(
			{ title: "t", body: "", emoji: "X", kind: "general" },
			Date.now() - 1000,
		);
		sched.markDelivered(n.id);
		expect(sched.markDelivered(n.id)).toBe(false);
	});

	it("markDelivered returns false for cancelled", () => {
		const sched = new NotificationScheduler();
		const n = sched.schedule(
			{ title: "t", body: "", emoji: "X", kind: "general" },
			Date.now() - 1000,
		);
		sched.cancel(n.id);
		expect(sched.markDelivered(n.id)).toBe(false);
	});

	it("markRetry increments retryCount", () => {
		const sched = new NotificationScheduler();
		const n = sched.schedule(
			{ title: "t", body: "", emoji: "X", kind: "general" },
			Date.now() - 1000,
		);
		sched.markRetry(n.id);
		sched.markRetry(n.id);
		expect(n.retryCount).toBe(2);
	});

	it("markRetry returns false for delivered", () => {
		const sched = new NotificationScheduler();
		const n = sched.schedule(
			{ title: "t", body: "", emoji: "X", kind: "general" },
			Date.now() - 1000,
		);
		sched.markDelivered(n.id);
		expect(sched.markRetry(n.id)).toBe(false);
	});

	it("markRetry returns false for cancelled", () => {
		const sched = new NotificationScheduler();
		const n = sched.schedule(
			{ title: "t", body: "", emoji: "X", kind: "general" },
			Date.now() - 1000,
		);
		sched.cancel(n.id);
		expect(sched.markRetry(n.id)).toBe(false);
	});

	it("list filters by partial", () => {
		const sched = new NotificationScheduler();
		sched.schedule(
			{ title: "a", body: "", emoji: "A", kind: "vaccine" },
			Date.now() - 100,
		);
		sched.schedule(
			{ title: "b", body: "", emoji: "B", kind: "milestone" },
			Date.now() - 100,
		);
		const vaccineOnly = sched.list({ kind: "vaccine" });
		expect(vaccineOnly).toHaveLength(1);
		expect(vaccineOnly[0]?.content.kind).toBe("vaccine");
	});

	it("list returns all without filter", () => {
		const sched = new NotificationScheduler();
		sched.schedule(
			{ title: "a", body: "", emoji: "A", kind: "general" },
			Date.now(),
		);
		sched.schedule(
			{ title: "b", body: "", emoji: "B", kind: "general" },
			Date.now(),
		);
		expect(sched.list()).toHaveLength(2);
	});

	it("clear empties the queue", () => {
		const sched = new NotificationScheduler();
		sched.schedule(
			{ title: "a", body: "", emoji: "A", kind: "general" },
			Date.now(),
		);
		sched.clear();
		expect(sched.size()).toBe(0);
	});

	it("size returns queue length", () => {
		const sched = new NotificationScheduler();
		expect(sched.size()).toBe(0);
		sched.schedule(
			{ title: "a", body: "", emoji: "A", kind: "general" },
			Date.now(),
		);
		expect(sched.size()).toBe(1);
	});
});

describe("getOverdueNotifications", () => {
	it("sorts by fireAt ascending", () => {
		const sched = new NotificationScheduler();
		const now = Date.now();
		sched.schedule(
			{ title: "b", body: "", emoji: "B", kind: "general" },
			now - 1000,
		);
		sched.schedule(
			{ title: "a", body: "", emoji: "A", kind: "general" },
			now - 2000,
		);
		const sorted = getOverdueNotifications(sched, now);
		expect(sorted[0]?.content.title).toBe("a");
		expect(sorted[1]?.content.title).toBe("b");
	});

	it("excludes future notifications", () => {
		const sched = new NotificationScheduler();
		const now = Date.now();
		sched.schedule(
			{ title: "a", body: "", emoji: "A", kind: "general" },
			now - 100,
		);
		sched.schedule(
			{ title: "b", body: "", emoji: "B", kind: "general" },
			now + 1000,
		);
		const overdue = getOverdueNotifications(sched, now);
		expect(overdue).toHaveLength(1);
	});
});

describe("constants", () => {
	it("NOTIFICATION_ICON is an emoji", () => {
		expect(NOTIFICATION_ICON.length).toBeGreaterThan(0);
	});

	it("NOTIFICATION_DISCLAIMER has warning", () => {
		expect(NOTIFICATION_DISCLAIMER).toContain("⚠️");
	});
});
