/**
 * Web Push Notifications — vaccine/milestone/streak reminders.
 *
 * Direction U2: Web Push Notifications.
 *
 * Pure functions: Notification API wrapper + permission flow + schedule.
 * No LLM call.
 */

export type NotificationKind =
	| "vaccine"
	| "milestone"
	| "streak"
	| "screen"
	| "general";

export interface NotificationContent {
	title: string;
	body: string;
	emoji: string;
	kind: NotificationKind;
	url?: string;
	tag?: string;
}

export interface NotificationPermission {
	granted: boolean;
	denied: boolean;
	default: boolean;
	timestamp: number;
}

export interface ScheduledNotification {
	id: string;
	content: NotificationContent;
	fireAt: number; // epoch ms
	delivered: boolean;
	cancelled: boolean;
	retryCount: number;
}

export const NOTIFICATION_ICON = "🍼";
export const NOTIFICATION_BADGE = "🍼";

/** Check whether the Notification API is supported in this environment. */
export function isNotificationSupported(): boolean {
	return typeof globalThis !== "undefined" && "Notification" in globalThis;
}

/** Request permission to show notifications. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!isNotificationSupported()) {
		return {
			granted: false,
			denied: true,
			default: false,
			timestamp: Date.now(),
		};
	}
	try {
		const status = await (
			globalThis as unknown as {
				Notification: {
					requestPermission: () => Promise<NotificationPermission>;
				};
			}
		).Notification.requestPermission();
		return { ...status, timestamp: Date.now() };
	} catch {
		return {
			granted: false,
			denied: true,
			default: false,
			timestamp: Date.now(),
		};
	}
}

/** Format a vaccine reminder notification. */
export function formatVaccineNotification(
	vaccineName: string,
	dueDate: number,
): NotificationContent {
	const days = Math.round((dueDate - Date.now()) / (24 * 60 * 60 * 1000));
	const body =
		days > 0
			? `${vaccineName} 将在 ${days} 天后到期`
			: days === 0
				? `${vaccineName} 今天到期，请尽快接种`
				: `${vaccineName} 已过期 ${Math.abs(days)} 天`;
	return {
		title: "💉 疫苗提醒",
		body,
		emoji: "💉",
		kind: "vaccine",
		tag: "vaccine",
		url: "/dashboard#vaccines",
	};
}

/** Format a milestone reminder notification. */
export function formatMilestoneNotification(
	childName: string,
	ageMonths: number,
	milestone: string,
): NotificationContent {
	return {
		title: `🎯 ${childName} 即将达成`,
		body: `${ageMonths} 月龄里程碑：${milestone}`,
		emoji: "🎯",
		kind: "milestone",
		tag: "milestone",
		url: "/dashboard#milestones",
	};
}

/** Format a streak reminder notification. */
export function formatStreakNotification(
	habitName: string,
	currentStreak: number,
): NotificationContent {
	return {
		title: "🔥 习惯连续",
		body: `${habitName} 已连续 ${currentStreak} 天，继续保持！`,
		emoji: "🔥",
		kind: "streak",
		tag: "streak",
	};
}

/** Format a screen reminder notification. */
export function formatScreenNotification(
	scaleId: string,
	daysSinceLast: number,
): NotificationContent {
	return {
		title: "📋 发育筛查提醒",
		body: `${scaleId.toUpperCase()} 上次筛查距今 ${daysSinceLast} 天，建议复测`,
		emoji: "📋",
		kind: "screen",
		tag: "screen",
		url: "/dashboard#screen",
	};
}

/** Show a notification (returns true if shown). */
export async function showNotification(
	content: NotificationContent,
): Promise<boolean> {
	if (!isNotificationSupported()) return false;
	const N = (
		globalThis as unknown as {
			Notification: new (
				title: string,
				options?: {
					body?: string;
					icon?: string;
					tag?: string;
					data?: unknown;
				},
			) => unknown;
		}
	).Notification;
	if (typeof N !== "function") return false;
	try {
		new N(content.title, {
			body: content.body,
			icon: NOTIFICATION_ICON,
			tag: content.tag,
			data: {
				url: content.url,
				kind: content.kind,
				emoji: content.emoji,
			},
		});
		return true;
	} catch {
		return false;
	}
}

/** Notification scheduler — pure in-memory queue. */
export class NotificationScheduler {
	private queue: ScheduledNotification[] = [];
	private nextId = 0;

	schedule(
		content: NotificationContent,
		fireAt: number,
	): ScheduledNotification {
		const n: ScheduledNotification = {
			id: `n_${this.nextId++}`,
			content,
			fireAt,
			delivered: false,
			cancelled: false,
			retryCount: 0,
		};
		this.queue.push(n);
		return n;
	}

	cancel(id: string): boolean {
		const n = this.queue.find((x) => x.id === id);
		if (!n) return false;
		n.cancelled = true;
		return true;
	}

	/** Get all due notifications (fireAt <= now, not delivered, not cancelled). */
	getDue(now: number = Date.now()): ScheduledNotification[] {
		return this.queue.filter(
			(n) => !n.delivered && !n.cancelled && n.fireAt <= now,
		);
	}

	/** Mark a notification as delivered. */
	markDelivered(id: string): boolean {
		const n = this.queue.find((x) => x.id === id);
		if (!n || n.delivered || n.cancelled) return false;
		n.delivered = true;
		return true;
	}

	/** Mark delivery failure + retry. */
	markRetry(id: string): boolean {
		const n = this.queue.find((x) => x.id === id);
		if (!n || n.delivered || n.cancelled) return false;
		n.retryCount++;
		return true;
	}

	/** List all (filterable). */
	list(filter?: {
		kind?: NotificationKind;
		delivered?: boolean;
		cancelled?: boolean;
	}): ScheduledNotification[] {
		if (!filter) return [...this.queue];
		return this.queue.filter((n) => {
			if (filter.kind !== undefined && n.content.kind !== filter.kind)
				return false;
			if (
				filter.delivered !== undefined &&
				n.delivered !== filter.delivered
			)
				return false;
			if (
				filter.cancelled !== undefined &&
				n.cancelled !== filter.cancelled
			)
				return false;
			return true;
		});
	}

	clear(): void {
		this.queue = [];
	}

	size(): number {
		return this.queue.length;
	}
}

/** Get all overdue vaccines (fireAt < now) — for batch notification. */
export function getOverdueNotifications(
	sched: NotificationScheduler,
	now: number = Date.now(),
): ScheduledNotification[] {
	return sched.getDue(now).sort((a, b) => a.fireAt - b.fireAt);
}

export const NOTIFICATION_DISCLAIMER =
	"⚠️ 通知需浏览器授权。可在设置中随时关闭。";
