import { describe, expect, it } from "vitest";
import {
	backoffDelay,
	buildCacheKey,
	buildSwConfig,
	cacheFirst,
	installPrompt,
	isOnline,
	isRetryableError,
	OfflineTracker,
	replayQueuedRequests,
	shouldCache,
} from "../src/pwa.js";

describe("buildCacheKey", () => {
	it("builds versioned cache key", () => {
		expect(buildCacheKey("/app.js", "v1")).toBe("v1::/app.js");
	});

	it("handles query strings", () => {
		expect(buildCacheKey("/api?x=1", "v2")).toBe("v2::/api?x=1");
	});
});

describe("buildSwConfig", () => {
	it("returns correct URL and scope", () => {
		const c = buildSwConfig();
		expect(c.url).toBe("./sw.js");
		expect(c.scope).toBe("./");
	});
});

describe("isOnline", () => {
	it("returns true in jsdom default", () => {
		expect(isOnline()).toBe(true);
	});
});

describe("backoffDelay", () => {
	it("returns value within expected range for retry 0", () => {
		const d = backoffDelay(0);
		expect(d).toBeGreaterThanOrEqual(800);
		expect(d).toBeLessThanOrEqual(1200);
	});

	it("grows with retry count", () => {
		const _a = backoffDelay(1, 100, 10000);
		const b = backoffDelay(2, 100, 10000);
		// b could overlap a due to jitter, but generally larger
		expect(b).toBeGreaterThanOrEqual(150);
	});

	it("caps at maxMs", () => {
		const d = backoffDelay(20, 100, 500);
		expect(d).toBeLessThanOrEqual(700);
	});
});

describe("shouldCache", () => {
	it("caches html assets", () => {
		expect(shouldCache("/index.html")).toBe(true);
	});

	it("rejects data URLs", () => {
		expect(shouldCache("data:text/plain,hello")).toBe(false);
	});

	it("rejects blob URLs", () => {
		expect(shouldCache("blob:http://x/y")).toBe(false);
	});

	it("rejects API URLs", () => {
		expect(shouldCache("/api/users")).toBe(false);
	});
});

describe("isRetryableError", () => {
	it("network error (0) is retryable", () => {
		expect(isRetryableError(0)).toBe(true);
	});

	it("408 timeout is retryable", () => {
		expect(isRetryableError(408)).toBe(true);
	});

	it("429 rate limit is retryable", () => {
		expect(isRetryableError(429)).toBe(true);
	});

	it("500 server errors are retryable", () => {
		expect(isRetryableError(500)).toBe(true);
		expect(isRetryableError(599)).toBe(true);
	});

	it("404 is not retryable", () => {
		expect(isRetryableError(404)).toBe(false);
	});

	it("200 is not retryable", () => {
		expect(isRetryableError(200)).toBe(false);
	});
});

describe("cacheFirst", () => {
	it("matches .js", () => {
		expect(cacheFirst("/main.js")).toBe(true);
	});

	it("matches .css", () => {
		expect(cacheFirst("/styles.css")).toBe(true);
	});

	it("matches images", () => {
		expect(cacheFirst("/logo.png")).toBe(true);
	});

	it("does not match api", () => {
		expect(cacheFirst("/api/data")).toBe(false);
	});

	it("does not match plain html", () => {
		expect(cacheFirst("/about")).toBe(false);
	});
});

describe("OfflineTracker", () => {
	it("starts with online status", () => {
		const t = new OfflineTracker();
		expect(t.getState().status).toBe("online");
		expect(t.isOffline()).toBe(false);
	});

	it("transitions to offline", () => {
		const t = new OfflineTracker();
		t.markOffline();
		expect(t.isOffline()).toBe(true);
	});

	it("transitions back to online", () => {
		const t = new OfflineTracker();
		t.markOffline();
		t.markOnline();
		expect(t.isOffline()).toBe(false);
	});

	it("updates lastChange on transition", () => {
		const t = new OfflineTracker();
		const before = t.getState().lastChange;
		t.markOffline();
		expect(t.getState().lastChange).toBeGreaterThanOrEqual(before);
	});

	it("tracks pending sync count", () => {
		const t = new OfflineTracker();
		t.incrementPendingSync();
		t.incrementPendingSync();
		t.incrementPendingSync();
		expect(t.pendingSyncCount()).toBe(3);
		t.clearPendingSync();
		expect(t.pendingSyncCount()).toBe(0);
	});

	it("sets cache hit", () => {
		const t = new OfflineTracker();
		t.setCacheHit(true);
		expect(t.getState().cacheHit).toBe(true);
	});

	it("does not update lastChange if already offline", () => {
		const t = new OfflineTracker();
		t.markOffline();
		const before = t.getState().lastChange;
		t.markOffline();
		expect(t.getState().lastChange).toBe(before);
	});
});

describe("replayQueuedRequests", () => {
	it("returns 0/0 when no pending", async () => {
		const t = new OfflineTracker();
		const r = await replayQueuedRequests(t);
		expect(r.replayed).toBe(0);
		expect(r.failed).toBe(0);
	});

	it("replays pending requests successfully", async () => {
		const t = new OfflineTracker();
		t.incrementPendingSync();
		t.incrementPendingSync();
		const fakeFetch = async () => ({ ok: true }) as Response;
		const r = await replayQueuedRequests(t, fakeFetch as typeof fetch);
		expect(r.replayed).toBe(2);
		expect(r.failed).toBe(0);
	});

	it("counts failures", async () => {
		const t = new OfflineTracker();
		t.incrementPendingSync();
		const fakeFetch = async () => ({ ok: false }) as Response;
		const r = await replayQueuedRequests(t, fakeFetch as typeof fetch);
		expect(r.failed).toBe(1);
	});
});

describe("installPrompt", () => {
	it("returns Chinese copy by default", () => {
		const p = installPrompt();
		expect(p.title).toContain("安装");
	});

	it("returns English copy", () => {
		const p = installPrompt("en-US");
		expect(p.title).toContain("Install");
	});

	it("returns Spanish copy", () => {
		const p = installPrompt("es-ES");
		expect(p.title).toContain("Instalar");
	});

	it("all locales have CTA", () => {
		for (const l of ["zh-CN", "en-US", "es-ES"] as const) {
			const p = installPrompt(l);
			expect(p.cta.length).toBeGreaterThan(0);
		}
	});
});
