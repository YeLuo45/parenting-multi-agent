import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadDotenv, resolveEnvPath } from "../src/index.js";

describe("loadDotenv", () => {
	let tempDir: string;
	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "dotenv-"));
	});
	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("loads KEY=VALUE lines from .env and .env.local", async () => {
		writeFileSync(join(tempDir, ".env"), "FOO=bar\n# comment\nBAZ=qux\n");
		writeFileSync(join(tempDir, ".env.local"), "EXTRA=hello\n");
		const result = await loadDotenv({ dir: tempDir });
		expect(result.loaded).toHaveLength(2);
		expect(process.env.FOO).toBe("bar");
		expect(process.env.BAZ).toBe("qux");
		expect(process.env.EXTRA).toBe("hello");
	});

	it("strips surrounding double-quotes from values", async () => {
		writeFileSync(join(tempDir, ".env"), 'QUOTED="hello world"\n');
		const result = await loadDotenv({ dir: tempDir });
		expect(result.loaded).toHaveLength(1);
		expect(process.env.QUOTED).toBe("hello world");
	});

	it("does not override existing process.env values by default", async () => {
		process.env.PRESET = "preexisting";
		writeFileSync(join(tempDir, ".env"), "PRESET=fromfile\n");
		await loadDotenv({ dir: tempDir });
		expect(process.env.PRESET).toBe("preexisting");
	});

	it("override: true replaces existing process.env values", async () => {
		process.env.PRESET2 = "preexisting";
		writeFileSync(join(tempDir, ".env"), "PRESET2=fromfile\n");
		await loadDotenv({ dir: tempDir, override: true });
		expect(process.env.PRESET2).toBe("fromfile");
	});

	it("returns empty loaded array when no .env files exist", async () => {
		const result = await loadDotenv({ dir: tempDir });
		expect(result.loaded).toHaveLength(0);
		expect(result.keys).toHaveLength(0);
	});
});

describe("resolveEnvPath", () => {
	it("returns a string that ends with .env", () => {
		expect(resolveEnvPath()).toMatch(/\.env$/);
	});
});
