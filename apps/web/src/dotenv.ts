/**
 * Tiny .env loader so the Node build/test can read real LLM keys.
 * Reads `apps/web/.env` (or any absolute path) and merges entries
 * into `process.env`. Browser bundle is a no-op (no `process.versions.node`).
 *
 * Format: simple `KEY=VALUE` lines, `#` comments, optional
 * surrounding double-quotes.
 *
 * Returns synchronously in the browser no-op path, asynchronously in
 * Node. The browser bundle only ever sees the no-op path, so the
 * dynamic `node:module` import below is never reached — Vite
 * tree-shakes the entire function body in client builds.
 */

function parseEnvFile(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq <= 0) continue;
		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		out[key] = value;
	}
	return out;
}

function isNode(): boolean {
	return (
		typeof process !== "undefined" &&
		typeof process.versions?.node === "string"
	);
}

/** Read .env files under `dir` and merge into process.env. */
async function readDir(
	dir: string,
	override: boolean,
): Promise<{ loaded: string[]; keys: string[] }> {
	// Dynamic import of node:module — Vite tree-shakes this branch
	// from the browser bundle because it sits behind `isNode()`.
	const mod = (await import("node:module")) as {
		default: { createRequire: (p: string | URL) => NodeRequire };
	};
	const nodeUrl =
		typeof import.meta.url === "string" ? import.meta.url : "./";
	const req = mod.default.createRequire(nodeUrl);
	const fs = req("node:fs") as typeof import("node:fs");
	const path = req("node:path") as typeof import("node:path");
	const loaded: string[] = [];
	const merged: Record<string, string> = {};
	for (const file of [".env", ".env.local"]) {
		const filePath = path.join(dir, file);
		if (!fs.existsSync(filePath)) continue;
		const text = fs.readFileSync(filePath, "utf8");
		Object.assign(merged, parseEnvFile(text));
		loaded.push(filePath);
	}
	if (loaded.length === 0) return { loaded, keys: [] };
	for (const [key, value] of Object.entries(merged)) {
		if (override || process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
	return { loaded, keys: Object.keys(merged) };
}

/**
 * Load .env files relative to the caller's directory. In Node, this
 * is async (uses dynamic `node:module` import). In the browser, it
 * is a sync no-op.
 */
export function loadDotenv(
	options: { dir?: string; override?: boolean } = {},
):
	| Promise<{ loaded: string[]; keys: string[] }>
	| { loaded: string[]; keys: string[] } {
	if (!isNode()) {
		return { loaded: [], keys: [] };
	}
	// Resolve the default dir from process.cwd() once we're in Node.
	const cwd = process.cwd();
	const defaultDir = `${cwd}/apps/web`;
	return readDir(options.dir ?? defaultDir, options.override ?? false);
}

/** Resolve the canonical .env path under the apps/web directory. */
export function resolveEnvPath(): string {
	if (typeof process === "undefined") return ".env";
	return `${process.cwd()}/apps/web/.env`;
}
