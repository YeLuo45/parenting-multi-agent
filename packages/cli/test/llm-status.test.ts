import { afterEach, describe, expect, it, vi } from "vitest";
import { cmdLlmStatus, runCli } from "../src/index.js";

describe("cmdLlmStatus", () => {
	const ORIGINAL_MIN = process.env.MINIMAX_CN_API_KEY;
	const ORIGINAL_XIAOMI = process.env.XIAOMI_API_KEY;

	afterEach(() => {
		if (ORIGINAL_MIN === undefined) delete process.env.MINIMAX_CN_API_KEY;
		else process.env.MINIMAX_CN_API_KEY = ORIGINAL_MIN;
		if (ORIGINAL_XIAOMI === undefined) delete process.env.XIAOMI_API_KEY;
		else process.env.XIAOMI_API_KEY = ORIGINAL_XIAOMI;
	});

	it("reports no real LLM wired when both env vars are missing", () => {
		delete process.env.MINIMAX_CN_API_KEY;
		delete process.env.XIAOMI_API_KEY;
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		try {
			cmdLlmStatus();
			expect(log).toHaveBeenCalledTimes(1);
			const out = log.mock.calls[0]?.[0] as string;
			expect(out).toContain("minimax-m3");
			expect(out).toContain("xiaomi-mimo");
			expect(out).toContain("rule-fallback");
			expect(out).toContain("no real LLM wired");
		} finally {
			log.mockRestore();
		}
	});

	it("reports minimax configured when MINIMAX_CN_API_KEY is set", () => {
		process.env.MINIMAX_CN_API_KEY = "minimax-test-key";
		delete process.env.XIAOMI_API_KEY;
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		try {
			cmdLlmStatus();
			const out = log.mock.calls[0]?.[0] as string;
			expect(out).toContain("minimax-m3   configured");
			expect(out).toContain("xiaomi-mimo  missing");
			expect(out).toContain("Primary = minimax-m3");
		} finally {
			log.mockRestore();
		}
	});

	it("falls back to xiaomi when only XIAOMI_API_KEY is set", () => {
		delete process.env.MINIMAX_CN_API_KEY;
		process.env.XIAOMI_API_KEY = "xiaomi-test-key";
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		try {
			cmdLlmStatus();
			const out = log.mock.calls[0]?.[0] as string;
			expect(out).toContain("Primary = xiaomi-mimo");
			expect(out).toContain("1 API key detected");
		} finally {
			log.mockRestore();
		}
	});

	it("detects both keys as configured", () => {
		process.env.MINIMAX_CN_API_KEY = "minimax-test-key";
		process.env.XIAOMI_API_KEY = "xiaomi-test-key";
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		try {
			cmdLlmStatus();
			const out = log.mock.calls[0]?.[0] as string;
			expect(out).toContain("Primary = minimax-m3");
			expect(out).toContain("2 API keys detected");
		} finally {
			log.mockRestore();
		}
	});

	it("handles whitespace-only env vars as missing", () => {
		process.env.MINIMAX_CN_API_KEY = "   ";
		delete process.env.XIAOMI_API_KEY;
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		try {
			cmdLlmStatus();
			const out = log.mock.calls[0]?.[0] as string;
			expect(out).toContain("minimax-m3   missing");
		} finally {
			log.mockRestore();
		}
	});
});

describe("runCli llm-status command", () => {
	it("returns 0 from the llm-status case (no key configured)", async () => {
		delete process.env.MINIMAX_CN_API_KEY;
		delete process.env.XIAOMI_API_KEY;
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
		try {
			const code = await runCli(["llm-status"]);
			expect(code).toBe(0);
		} finally {
			log.mockRestore();
			err.mockRestore();
		}
	});

	it("shows the minimax primary when its key is the only one set", async () => {
		process.env.MINIMAX_CN_API_KEY = "minimax-test-key";
		delete process.env.XIAOMI_API_KEY;
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
		try {
			const code = await runCli(["llm-status"]);
			expect(code).toBe(0);
			expect(log).toHaveBeenCalled();
			const out = (log.mock.calls[0]?.[0] as string) ?? "";
			expect(out).toContain("Primary = minimax-m3");
		} finally {
			log.mockRestore();
			err.mockRestore();
		}
	});
});
