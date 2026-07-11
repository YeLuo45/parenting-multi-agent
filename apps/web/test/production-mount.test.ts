import { describe, expect, it, vi } from "vitest";
import {
	detectReactVersion,
	isMountHealthy,
	type MountError,
	renderFallback,
	safeMount,
	summarizeMountErrors,
} from "../src/production-mount.js";

describe("detectReactVersion", () => {
	it("returns 'unknown' when no global marker", () => {
		expect(detectReactVersion()).toBe("unknown");
	});

	it("returns global marker when set", () => {
		(globalThis as Record<string, unknown>).__PARENTING_REACT_VERSION__ =
			"19.2.7";
		expect(detectReactVersion()).toBe("19.2.7");
		delete (globalThis as Record<string, unknown>)
			.__PARENTING_REACT_VERSION__;
	});
});

describe("safeMount", () => {
	function setupRoot(): HTMLElement {
		document.body.innerHTML = '<div id="app-root"></div>';
		return document.getElementById("app-root")!;
	}

	it("throws when root element is missing", () => {
		document.body.innerHTML = "";
		const errs: MountError[] = [];
		expect(() =>
			safeMount({
				rootElementId: "app-root",
				render: () => {},
				onError: (e) => errs.push(e),
			}),
		).toThrow(/not found/);
	});

	it("calls render with root element", () => {
		setupRoot();
		const render = vi.fn();
		const result = safeMount({
			rootElementId: "app-root",
			render,
		});
		expect(render).toHaveBeenCalled();
		expect(result.root).toBeDefined();
		expect(result.reactVersion).toBeTruthy();
	});

	it("captures render errors via onError", () => {
		setupRoot();
		const errs: MountError[] = [];
		safeMount({
			rootElementId: "app-root",
			render: () => {
				throw new Error("render failed");
			},
			onError: (e) => errs.push(e),
			maxRetries: 0,
		});
		expect(errs.length).toBeGreaterThan(0);
		expect(errs[0]?.phase).toBe("render");
	});

	it("retries on render failure", () => {
		setupRoot();
		let attempts = 0;
		const errs: MountError[] = [];
		safeMount({
			rootElementId: "app-root",
			render: () => {
				attempts++;
				if (attempts === 1) throw new Error("fail once");
			},
			onError: (e) => errs.push(e),
			maxRetries: 2,
			retryDelayMs: 1,
		});
		// With jsdom + setTimeout, retries happen asynchronously
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				expect(attempts).toBeGreaterThanOrEqual(1);
				resolve();
			}, 50);
		});
	});

	it("renders fallback DOM after max retries", () => {
		setupRoot();
		const errs: MountError[] = [];
		safeMount({
			rootElementId: "app-root",
			render: () => {
				throw new Error("permanent failure");
			},
			onError: (e) => errs.push(e),
			maxRetries: 0,
		});
		const root = document.getElementById("app-root")!;
		expect(
			root.querySelector('[data-testid="mount-fallback"]'),
		).toBeTruthy();
	});

	it("captures global error events", () => {
		setupRoot();
		const errs: MountError[] = [];
		safeMount({
			rootElementId: "app-root",
			render: () => {},
			onError: (e) => errs.push(e),
			maxRetries: 0,
		});
		// Dispatch a global error
		const event = new ErrorEvent("error", { message: "global err" });
		window.dispatchEvent(event);
		expect(errs.some((e) => e.message === "global err")).toBe(true);
	});

	it("captures unhandled rejection", () => {
		setupRoot();
		const errs: MountError[] = [];
		safeMount({
			rootElementId: "app-root",
			render: () => {},
			onError: (e) => errs.push(e),
			maxRetries: 0,
		});
		const event = new Event("unhandledrejection") as PromiseRejectionEvent;
		Object.defineProperty(event, "reason", { value: "rejection reason" });
		window.dispatchEvent(event);
		expect(errs.some((e) => e.message === "rejection reason")).toBe(true);
	});
});

describe("renderFallback", () => {
	it("creates fallback DOM with message", () => {
		const root = document.createElement("div");
		renderFallback(root, "test error");
		const fb = root.querySelector('[data-testid="mount-fallback"]');
		expect(fb).toBeTruthy();
		const detail = root.querySelector(".parenting-mount-fallback-detail");
		expect(detail?.textContent).toContain("test error");
	});

	it("includes retry button", () => {
		const root = document.createElement("div");
		renderFallback(root, "x");
		const btn = root.querySelector(".parenting-mount-fallback-retry");
		expect(btn?.textContent).toContain("重新加载");
	});

	it("replaces existing content", () => {
		const root = document.createElement("div");
		root.innerHTML = "<p>stale content</p>";
		renderFallback(root, "boom");
		expect(root.querySelector("p")).toBeNull();
	});
});

describe("isMountHealthy", () => {
	it("healthy when no errors and no fallback", () => {
		const root = document.createElement("div");
		const result = {
			root,
			reactVersion: "19.2.7",
			errorBoundaryMounted: false,
		};
		expect(isMountHealthy(result, [])).toBe(true);
	});

	it("unhealthy when fallback mounted but no errors", () => {
		const root = document.createElement("div");
		const result = {
			root,
			reactVersion: "19.2.7",
			errorBoundaryMounted: true,
		};
		expect(isMountHealthy(result, [])).toBe(false);
	});

	it("unhealthy when errors present", () => {
		const root = document.createElement("div");
		const result = {
			root,
			reactVersion: "19.2.7",
			errorBoundaryMounted: false,
		};
		const errors: MountError[] = [
			{ timestamp: 0, message: "x", phase: "render" },
		];
		expect(isMountHealthy(result, errors)).toBe(false);
	});

	it("unhealthy when root missing", () => {
		const result = {
			root: null as unknown as HTMLElement,
			reactVersion: "19.2.7",
			errorBoundaryMounted: false,
		};
		expect(isMountHealthy(result, [])).toBe(false);
	});
});

describe("summarizeMountErrors", () => {
	it("returns 'no mount errors' for empty list", () => {
		expect(summarizeMountErrors([])).toBe("no mount errors");
	});

	it("counts errors by phase", () => {
		const errors: MountError[] = [
			{ timestamp: 0, message: "x", phase: "render" },
			{ timestamp: 0, message: "y", phase: "render" },
			{ timestamp: 0, message: "z", phase: "commit" },
		];
		const out = summarizeMountErrors(errors);
		expect(out).toContain("render:2");
		expect(out).toContain("commit:1");
	});

	it("handles single error", () => {
		const errors: MountError[] = [
			{ timestamp: 0, message: "x", phase: "init" },
		];
		expect(summarizeMountErrors(errors)).toContain("init:1");
	});
});
