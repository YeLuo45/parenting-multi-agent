import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplReader } from "@parenting/cli";
import { createTuiDeps, main, renderChildTabs, renderTuiBanner, renderTuiHelp, runTui } from "../src/index.js";
import { MemoryLayer } from "@parenting/memory";

let logs: string[];

beforeEach(() => {
	logs = [];
	vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));
});

afterEach(() => {
	vi.restoreAllMocks();
});

function makeReader(lines: string[]): { reader: ReplReader; closed: () => boolean } {
	let index = 0;
	let didClose = false;
	return {
		reader: {
			question: () => Promise.resolve(lines[index++] ?? "/quit"),
			close: () => {
				didClose = true;
			},
		},
		closed: () => didClose,
	};
}

describe("TUI rendering", () => {
	it("renders a banner with the agent count", () => {
		expect(renderTuiBanner(18)).toContain("18 specialist agents");
		expect(renderTuiBanner(3)).toContain(" 3 specialist agents");
	});

	it("renders command help including /clear", () => {
		const help = renderTuiHelp();
		expect(help).toContain("/list");
		expect(help).toContain("/use <child-id>");
		expect(help).toContain("/quit");
		expect(help).toContain("/clear");
	});
});

describe("TUI deps", () => {
	it("creates REPL dependencies with a default child and registered agents", () => {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		try {
			const deps = createTuiDeps(memory);
			expect(deps.currentChild.id).toBe("default");
			expect(memory.listChildren()).toHaveLength(1);
			expect(deps.defaultLimit).toBe(10);
			expect(typeof deps.clear).toBe("function");
		} finally {
			memory.close();
		}
	});

	it("lists children through injected deps", () => {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		try {
			memory.upsertChild({ id: "alice", name: "爱丽丝", birthDate: "2024-06-19", stage: "toddler" });
			const deps = createTuiDeps(memory);
			deps.list();
			expect(logs.join("\n")).toContain("爱丽丝");
		} finally {
			memory.close();
		}
	});

	it("prints empty-list state when memory has no children after cleanup", () => {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		try {
			const deps = createTuiDeps(memory);
			memory.deleteChild(deps.currentChild.id);
			deps.list();
			expect(logs.join("\n")).toContain("没有孩子档案");
		} finally {
			memory.close();
		}
	});

	it("runs ask/history/use callbacks", async () => {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		try {
			memory.upsertChild({ id: "alice", name: "爱丽丝", birthDate: "2024-06-19", stage: "toddler" });
			const deps = createTuiDeps(memory);
			const alice = deps.use("alice");
			expect(alice?.id).toBe("alice");
			await deps.ask(alice!, "宝宝3个月发烧38.5度怎么办");
			deps.history(alice!, 5);
			const output = logs.join("\n");
			expect(output).toContain("已切换到 child alice");
			expect(output).toContain("问题:");
			expect(output).toContain("最近");
		} finally {
			memory.close();
		}
	});

	it("invokes clear() and writes the ANSI clear sequence", () => {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		try {
			const deps = createTuiDeps(memory, 10, true);
			const writes: string[] = [];
			const originalWrite = process.stdout.write.bind(process.stdout);
			vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
				writes.push(String(chunk));
				return originalWrite(chunk as never);
			});
			deps.clear?.();
			expect(writes.join("")).toContain("\x1b[2J");
		} finally {
			memory.close();
		}
	});

	it("clear() with color=false writes an empty string", () => {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		try {
			const deps = createTuiDeps(memory, 10, false);
			const writes: string[] = [];
			const originalWrite = process.stdout.write.bind(process.stdout);
			vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
				writes.push(String(chunk));
				return originalWrite(chunk as never);
			});
			deps.clear?.();
			expect(writes.join("")).toBe("");
		} finally {
			memory.close();
		}
	});
});

describe("runTui", () => {
	it("runs with an injected reader until quit", async () => {
		const { reader, closed } = makeReader(["/list", "/quit"]);
		await runTui({ reader });
		const output = logs.join("\n");
		expect(output).toContain("parenting-multi-agent TUI");
		expect(output).toContain("Commands:");
		expect(output).toContain("孩子档案");
		expect(closed()).toBe(true);
	});

	it("renders a tab strip with the active child highlighted in cyan", async () => {
		const { reader } = makeReader(["/quit"]);
		await runTui({ reader });
		const output = logs.join("\n");
		// 0x1b[36m = cyan; default child is "default"
		expect(output).toContain("\x1b[36m");
		expect(output).toContain("▸");
	});

	it("prints the goodbye banner after the REPL exits", async () => {
		const { reader } = makeReader(["/quit"]);
		const writes: string[] = [];
		const originalWrite = process.stdout.write.bind(process.stdout);
		vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
			writes.push(String(chunk));
			return originalWrite(chunk as never);
		});
		await runTui({ reader });
		expect(writes.join("")).toContain("👋 再见");
	});

	it("invokes the clear handler when /clear is typed", async () => {
		const writes: string[] = [];
		const originalWrite = process.stdout.write.bind(process.stdout);
		vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
			writes.push(String(chunk));
			return originalWrite(chunk as never);
		});
		const { reader } = makeReader(["/clear", "/quit"]);
		await runTui({ reader });
		expect(writes.join("")).toContain("\x1b[2J");
	});

	it("respects color=false to disable ANSI escape sequences", async () => {
		const { reader } = makeReader(["/quit"]);
		await runTui({ reader, color: false });
		const output = logs.join("\n");
		expect(output).not.toContain("\x1b[36m");
	});

	it("main prints help and exits without starting readline", async () => {
		await expect(main(["--help"])).resolves.toBe(0);
		const output = logs.join("\n");
		expect(output).toContain("parenting-multi-agent TUI");
		expect(output).toContain("/history [n] [p]");
	});

	it("main starts the injected runner when no help flag is passed", async () => {
		let called = 0;
		await expect(main([], async (_options) => { called++; })).resolves.toBe(0);
		expect(called).toBe(1);
	});
});
