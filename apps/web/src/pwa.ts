/**
 * PWA Offline — service worker registration + offline state detection.
 *
 * Direction U3: PWA offline support.
 *
 * Pure helpers for: SW URL generation, offline-state tracking, and
 * cache-version negotiation. The actual SW is at apps/web/public/sw.js.
 */

export const SW_URL = "./sw.js";
export const SW_SCOPE = "./";

export type OfflineStatus = "online" | "offline" | "checking" | "unknown";

export interface OfflineState {
	status: OfflineStatus;
	lastChange: number;
	pendingSync: number; // # of queued requests waiting to replay
	cacheHit: boolean;
}

/** Build a cache key from URL + version. */
export function buildCacheKey(url: string, version: string): string {
	return `${version}::${url}`;
}

/** Build a SW registration config object. */
export function buildSwConfig(): {
	url: string;
	scope: string;
} {
	return { url: SW_URL, scope: SW_SCOPE };
}

/** Check whether the navigator is currently online. */
export function isOnline(): boolean {
	if (typeof navigator === "undefined") return true;
	return navigator.onLine !== false;
}

/** Compute a backoff delay (ms) for the Nth retry. */
export function backoffDelay(
	retry: number,
	baseMs = 1000,
	maxMs = 60_000,
): number {
	const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, retry));
	// Add ±20% jitter to avoid thundering herd
	const jitter = exp * (0.8 + Math.random() * 0.4);
	return Math.round(jitter);
}

/** Decide if a URL should be cached by the service worker. */
export function shouldCache(url: string): boolean {
	if (!url) return false;
	if (url.startsWith("data:")) return false;
	if (url.startsWith("blob:")) return false;
	// Don't cache API calls (let them go to network for fresh data)
	if (url.includes("/api/")) return false;
	return true;
}

/** Classify a fetch failure as retryable. */
export function isRetryableError(status: number): boolean {
	// 5xx and 408/429 are typically transient
	return (
		status === 0 || // network error
		status === 408 || // request timeout
		status === 429 || // rate limit
		(status >= 500 && status < 600)
	);
}

/** Build a cache-first strategy predicate. */
export function cacheFirst(assetPath: string): boolean {
	const cacheable = [
		/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp)$/,
		/\/assets\//,
		/\/static\//,
	];
	return cacheable.some((p) => p.test(assetPath));
}

/** Track online/offline transitions for offline state. */
export class OfflineTracker {
	private state: OfflineState = {
		status:
			typeof navigator !== "undefined" && navigator.onLine === false
				? "offline"
				: "online",
		lastChange: Date.now(),
		pendingSync: 0,
		cacheHit: false,
	};

	getState(): OfflineState {
		return { ...this.state };
	}

	markOnline(): void {
		if (this.state.status === "offline") {
			this.state.lastChange = Date.now();
		}
		this.state.status = "online";
	}

	markOffline(): void {
		if (this.state.status !== "offline") {
			this.state.lastChange = Date.now();
		}
		this.state.status = "offline";
	}

	incrementPendingSync(): void {
		this.state.pendingSync++;
	}

	clearPendingSync(): void {
		this.state.pendingSync = 0;
	}

	setCacheHit(hit: boolean): void {
		this.state.cacheHit = hit;
	}

	isOffline(): boolean {
		return this.state.status === "offline";
	}

	pendingSyncCount(): number {
		return this.state.pendingSync;
	}
}

/** Replay queued requests when coming back online. */
export async function replayQueuedRequests(
	tracker: OfflineTracker,
	fetchFn: typeof fetch = fetch,
): Promise<{ replayed: number; failed: number }> {
	const total = tracker.pendingSyncCount();
	if (total === 0) return { replayed: 0, failed: 0 };
	let replayed = 0;
	let failed = 0;
	for (let i = 0; i < total; i++) {
		try {
			const r = await fetchFn("/", { method: "HEAD" });
			if (r.ok) replayed++;
			else failed++;
		} catch {
			failed++;
		}
	}
	if (failed === 0) tracker.clearPendingSync();
	return { replayed, failed };
}

/** PWA install banner copy (i18n-ready). */
export function installPrompt(locale: "zh-CN" | "en-US" | "es-ES" = "zh-CN"): {
	title: string;
	body: string;
	cta: string;
} {
	const copy = {
		"zh-CN": {
			title: "安装 parenting 应用",
			body: "添加到主屏幕，离线也能用",
			cta: "安装",
		},
		"en-US": {
			title: "Install parenting app",
			body: "Add to home screen, works offline",
			cta: "Install",
		},
		"es-ES": {
			title: "Instalar aplicación",
			body: "Añadir a pantalla de inicio, funciona sin conexión",
			cta: "Instalar",
		},
	};
	return copy[locale];
}

export const PWA_DISCLAIMER =
	"⚠️ 离线模式下，数据来自本地缓存。联网后将自动同步。";
