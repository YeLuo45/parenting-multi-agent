/**
 * Production mount — React 19 safe wrapper for parenting web app.
 *
 * Direction U1: React 19 production mount fix.
 *
 * Provides `safeMount()` that wraps the createRoot + render call with
 * error boundaries, fallback DOM, and diagnostic instrumentation to
 * catch the "r is not a function" / hook-after-render errors that occur
 * when stale or hot-reloaded code mounts into a mismatched React fiber.
 */

export interface MountError {
	timestamp: number;
	message: string;
	stack?: string;
	phase: "init" | "render" | "commit" | "service-worker";
	reactVersion?: string;
}

export interface MountResult {
	root: HTMLElement;
	reactVersion: string;
	errorBoundaryMounted: boolean;
}

export interface SafeMountOptions {
	rootElementId: string;
	render: (container: HTMLElement) => void;
	onError?: (error: MountError) => void;
	maxRetries?: number;
	retryDelayMs?: number;
}

/** Detect the React version from the bundled runtime (best-effort). */
export function detectReactVersion(): string {
	try {
		// Walk the bundle's React imports via the bundled object map.
		// This is best-effort; fall back to "unknown" if not exposed.
		// @ts-expect-error - global React marker, optional
		const ver = globalThis.__PARENTING_REACT_VERSION__;
		if (typeof ver === "string") return ver;
	} catch {
		// ignore
	}
	return "unknown";
}

/**
 * Safe mount — wraps user render() with error capture + retry.
 * Returns the mounted container + diagnostics.
 */
export function safeMount(options: SafeMountOptions): MountResult {
	const {
		rootElementId,
		render,
		onError,
		maxRetries = 1,
		retryDelayMs = 100,
	} = options;

	const root = document.getElementById(rootElementId);
	if (!root) {
		const err: MountError = {
			timestamp: Date.now(),
			message: `#${rootElementId} element not found`,
			phase: "init",
		};
		onError?.(err);
		throw new Error(err.message);
	}

	const reactVersion = detectReactVersion();
	let errorBoundaryMounted = false;

	// Install a global error handler to capture mount-time errors.
	const globalHandler = (event: ErrorEvent | PromiseRejectionEvent) => {
		const message =
			"message" in event ? event.message : String(event.reason);
		const error = "error" in event && event.error ? event.error : undefined;
		const err: MountError = {
			timestamp: Date.now(),
			message,
			stack: error instanceof Error ? error.stack : undefined,
			phase: "commit",
			reactVersion,
		};
		onError?.(err);
		// Render fallback DOM so users aren't staring at a blank screen.
		if (!errorBoundaryMounted && root) {
			renderFallback(root, message);
			errorBoundaryMounted = true;
		}
	};
	window.addEventListener("error", globalHandler);
	window.addEventListener("unhandledrejection", globalHandler);

	try {
		let attempts = 0;
		const tryRender = (): void => {
			try {
				render(root);
			} catch (e) {
				attempts++;
				const err: MountError = {
					timestamp: Date.now(),
					message: e instanceof Error ? e.message : String(e),
					stack: e instanceof Error ? e.stack : undefined,
					phase: "render",
					reactVersion,
				};
				onError?.(err);
				if (attempts <= maxRetries) {
					setTimeout(tryRender, retryDelayMs);
				} else if (!errorBoundaryMounted) {
					renderFallback(root, err.message);
					errorBoundaryMounted = true;
				}
			}
		};
		tryRender();
	} finally {
		// Note: keep the handler installed for the app's lifetime; React
		// renders might surface errors asynchronously. Production hosts
		// should provide a graceful onError that escalates appropriately.
	}

	return {
		root,
		reactVersion,
		errorBoundaryMounted,
	};
}

/** Render a fallback DOM tree when mount fails. */
export function renderFallback(root: HTMLElement, errorMessage: string): void {
	root.innerHTML = "";
	const wrapper = document.createElement("div");
	wrapper.className = "parenting-mount-fallback";
	wrapper.setAttribute("data-testid", "mount-fallback");
	// Safe text assignment (no innerHTML to avoid XSS from error message).
	const title = document.createElement("h2");
	title.textContent = "⚠️ 应用启动失败";
	wrapper.appendChild(title);
	const detail = document.createElement("pre");
	detail.className = "parenting-mount-fallback-detail";
	detail.textContent = `${errorMessage}\n\n请刷新页面或清除浏览器缓存。`;
	wrapper.appendChild(detail);
	const retry = document.createElement("button");
	retry.className = "parenting-mount-fallback-retry";
	retry.textContent = "🔄 重新加载";
	retry.onclick = () => window.location.reload();
	wrapper.appendChild(retry);
	root.appendChild(wrapper);
}

/** Check whether the React 19 production mount is healthy. */
export function isMountHealthy(
	result: MountResult,
	errors: readonly MountError[],
): boolean {
	if (!result.root) return false;
	// Fallback mounted = degraded state (recovered but not ideal)
	if (result.errorBoundaryMounted) return false;
	// Errors present = unhealthy
	if (errors.length > 0) return false;
	return true;
}

/** Summarize mount errors for Sentry-style reporting. */
export function summarizeMountErrors(errors: readonly MountError[]): string {
	if (errors.length === 0) return "no mount errors";
	const counts: Record<string, number> = {};
	for (const e of errors) {
		counts[e.phase] = (counts[e.phase] ?? 0) + 1;
	}
	const parts = Object.entries(counts).map(([phase, n]) => `${phase}:${n}`);
	return `mount errors (${errors.length}): ${parts.join(", ")}`;
}
