import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryLayer } from "@parenting/memory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	cmdHistory,
	cmdList,
	cmdUse,
	createOrchestrator,
	handleReplLine,
	loadDefaultChild,
	parseReplLine,
	printResult,
	type ReplDeps,
	type ReplReader,
	runCli,
	runRepl,
} from "../src/index.js";

let tempDir: string;
let logs: string[];
let errors: string[];

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), "parenting-cli-"));
	process.env.PARENTING_DATA_DIR = tempDir;
	logs = [];
	errors = [];
	vi.spyOn(console, "log").mockImplementation((...args) =>
		logs.push(args.join(" ")),
	);
	vi.spyOn(console, "error").mockImplementation((...args) =>
		errors.push(args.join(" ")),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
	delete process.env.PARENTING_DATA_DIR;
	rmSync(tempDir, { recursive: true, force: true });
});

describe("parenting CLI", () => {
	it("prints help with no command", async () => {
		await expect(runCli([])).resolves.toBe(0);
		expect(logs.join("\n")).toContain("parenting CLI");
	});

	it("prints help with help flags", async () => {
		await expect(runCli(["help"])).resolves.toBe(0);
		await expect(runCli(["--help"])).resolves.toBe(0);
		await expect(runCli(["-h"])).resolves.toBe(0);
		expect(logs.join("\n").match(/parenting CLI/g)).toHaveLength(3);
	});

	it("adds and lists a child profile", async () => {
		await expect(
			runCli(["add-child", "alice", "爱丽丝", "2024-06-19"]),
		).resolves.toBe(0);
		await expect(runCli(["list"])).resolves.toBe(0);
		expect(logs.join("\n")).toContain("爱丽丝");
	});

	it("prints the empty child profile state", () => {
		cmdList();
		expect(logs.join("\n")).toContain("没有孩子档案");
	});

	it("creates a default child and answers questions", async () => {
		await expect(
			runCli(["ask", "我家宝宝3个月发烧38.5度怎么办"]),
		).resolves.toBe(0);
		const output = logs.join("\n");
		expect(output).toContain("问题:");
		expect(output).toMatch(/儿科|紧急|发烧|医生/);
	});

	it("returns non-zero for missing ask question", async () => {
		await expect(runCli(["ask"])).resolves.toBe(1);
		expect(errors.join("\n")).toContain("请提供问题");
	});

	it("returns non-zero for invalid add-child args", async () => {
		await expect(runCli(["add-child", "alice"])).resolves.toBe(1);
		expect(errors.join("\n")).toContain("add-child");
	});

	it("returns non-zero for unknown commands", async () => {
		await expect(runCli(["unknown"])).resolves.toBe(1);
		expect(errors.join("\n")).toContain("未知命令");
		expect(logs.join("\n")).toContain("parenting CLI");
	});

	it("prints emergency escalations without normal replies", () => {
		printResult({
			question: "孩子抽搐怎么办",
			replies: [],
			emergencyEscalation: true,
			redFlag: {
				ruleId: "L0-TEST",
				severity: "emergency",
				description: "抽搐",
				action: "立即就医",
			},
		} as Parameters<typeof printResult>[0]);

		const output = logs.join("\n");
		expect(output).toContain("紧急情况");
		expect(output).toContain("立即就医");
	});

	it("prints no-match results", () => {
		printResult({
			question: "完全无匹配",
			replies: [],
			emergencyEscalation: false,
		} as Parameters<typeof printResult>[0]);

		expect(logs.join("\n")).toContain("没有匹配的 agent");
	});

	it("falls back to no-match when emergency has no red flag", () => {
		printResult({
			question: "边界问题",
			replies: [],
			emergencyEscalation: true,
		} as Parameters<typeof printResult>[0]);

		expect(logs.join("\n")).toContain("没有匹配的 agent");
	});

	it("prints replies without optional urgency", () => {
		printResult({
			question: "普通问题",
			replies: [
				{
					agentId: "test",
					agentName: "测试Agent",
					content: "测试回复",
					confidence: 0.5,
				},
			],
			emergencyEscalation: false,
		} as Parameters<typeof printResult>[0]);

		const output = logs.join("\n");
		expect(output).toContain("测试Agent");
		expect(output).not.toContain("urgency:");
	});

	it("prints replies with urgency", () => {
		printResult({
			question: "普通问题",
			replies: [
				{
					agentId: "test",
					agentName: "测试Agent",
					content: "测试回复",
					confidence: 0.9,
					urgency: "info",
				},
			],
			emergencyEscalation: false,
		} as Parameters<typeof printResult>[0]);

		expect(logs.join("\n")).toContain("urgency: info");
	});

	it("registers all production agents", () => {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		try {
			const orchestrator = createOrchestrator(memory);
			expect(orchestrator.listAgents()).toHaveLength(19);
		} finally {
			memory.close();
		}
	});

	it("loads an existing default child before creating a sample", () => {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		try {
			memory.upsertChild({
				id: "bob",
				name: "Bob",
				birthDate: "2020-01-01",
				stage: "school_age",
			});
			expect(loadDefaultChild(memory).id).toBe("bob");
		} finally {
			memory.close();
		}
	});
});

describe("child history & switching", () => {
	const openMemory = () => {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		memory.upsertChild({
			id: "alice",
			name: "Alice",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		memory.upsertChild({
			id: "bob",
			name: "Bob",
			birthDate: "2020-01-01",
			stage: "school_age",
		});
		return memory;
	};

	it("cmdHistory returns empty for new child", () => {
		const memory = openMemory();
		try {
			const eps = cmdHistory(memory, "alice", 5);
			expect(eps).toEqual([]);
			expect(logs.join("\n")).toContain("暂无问答记录");
		} finally {
			memory.close();
		}
	});

	it("cmdHistory prints logged questions and red-flag marker", () => {
		const memory = openMemory();
		try {
			// Direct log an episode to bypass orchestrator
			memory.addEpisode("alice", "qa", {
				question: "宝宝发烧怎么办",
				redFlag: false,
			});
			memory.addEpisode("alice", "qa", {
				question: "3月宝宝40度",
				redFlag: true,
				severity: "emergency",
			});
			const eps = cmdHistory(memory, "alice", 10);
			expect(eps.length).toBe(2);
			const out = logs.join("\n");
			expect(out).toContain("📜");
			expect(out).toContain("🚨");
			expect(out).toContain("💬");
			expect(out).toContain("宝宝发烧怎么办");
		} finally {
			memory.close();
		}
	});

	it("cmdHistory summarizes when no question field", () => {
		const memory = openMemory();
		try {
			memory.addEpisode("alice", "qa", { unrelated: "x" });
			cmdHistory(memory, "alice", 5);
			expect(logs.join("\n")).toContain("💬");
		} finally {
			memory.close();
		}
	});

	it("cmdUse returns child when exists", () => {
		const memory = openMemory();
		try {
			const child = cmdUse(memory, "bob");
			expect(child?.id).toBe("bob");
			expect(logs.join("\n")).toContain("已切换到 child bob");
		} finally {
			memory.close();
		}
	});

	it("cmdUse returns null when child missing", () => {
		const memory = openMemory();
		try {
			const child = cmdUse(memory, "ghost");
			expect(child).toBeNull();
			expect(errors.join("\n")).toContain('找不到 child id="ghost"');
		} finally {
			memory.close();
		}
	});

	it("runCli use delegates to cmdUse and exits 0", async () => {
		await expect(
			runCli(["add-child", "alice", "Alice", "2024-06-19"]),
		).resolves.toBe(0);
		await expect(runCli(["use", "alice"])).resolves.toBe(0);
	});

	it("runCli use fails with missing childId", async () => {
		await expect(runCli(["use"])).resolves.toBe(1);
		expect(errors.join("\n")).toContain("use <childId>");
	});

	it("runCli use fails with unknown child", async () => {
		await expect(runCli(["use", "ghost"])).resolves.toBe(1);
		expect(errors.join("\n")).toContain("找不到 child");
	});

	it("runCli children mirrors list", async () => {
		await expect(
			runCli(["add-child", "alice", "Alice", "2024-06-19"]),
		).resolves.toBe(0);
		await expect(runCli(["children"])).resolves.toBe(0);
		expect(logs.join("\n")).toContain("Alice");
	});

	it("runCli history prints no-records message for fresh child", async () => {
		await expect(
			runCli(["add-child", "alice", "Alice", "2024-06-19"]),
		).resolves.toBe(0);
		await expect(runCli(["history"])).resolves.toBe(0);
		expect(logs.join("\n")).toContain("暂无问答记录");
	});
});

describe("REPL parser", () => {
	it("returns noop for empty line", () => {
		expect(parseReplLine("", 10).kind).toBe("noop");
		expect(parseReplLine("   ", 10).kind).toBe("noop");
	});

	it("returns quit for exit tokens", () => {
		expect(parseReplLine("/quit", 10).kind).toBe("quit");
		expect(parseReplLine("quit", 10).kind).toBe("quit");
		expect(parseReplLine("exit", 10).kind).toBe("quit");
	});

	it("returns help for /help / help / ?", () => {
		expect(parseReplLine("/help", 10).kind).toBe("help");
		expect(parseReplLine("help", 10).kind).toBe("help");
		expect(parseReplLine("?", 10).kind).toBe("help");
	});

	it("returns list for /list / list", () => {
		expect(parseReplLine("/list", 10).kind).toBe("list");
		expect(parseReplLine("list", 10).kind).toBe("list");
	});

	it("returns clear for /clear / clear", () => {
		expect(parseReplLine("/clear", 10).kind).toBe("clear");
		expect(parseReplLine("clear", 10).kind).toBe("clear");
	});

	it("returns history with default limit", () => {
		const a = parseReplLine("/history", 10);
		expect(a.kind).toBe("history");
		if (a.kind === "history") expect(a.limit).toBe(10);
		const b = parseReplLine("history", 7);
		if (b.kind === "history") expect(b.limit).toBe(7);
	});

	it("returns history with explicit limit (also /hist)", () => {
		const a = parseReplLine("/history 3", 10);
		expect(a.kind).toBe("history");
		if (a.kind === "history") expect(a.limit).toBe(3);
		const b = parseReplLine("/hist 42", 10);
		if (b.kind === "history") expect(b.limit).toBe(42);
	});

	it("returns use for /use <id>", () => {
		const a = parseReplLine("/use alice", 10);
		expect(a.kind).toBe("use");
		if (a.kind === "use") expect(a.childId).toBe("alice");
	});

	it("returns ask for any other text", () => {
		const a = parseReplLine("我家宝宝发烧", 10);
		expect(a.kind).toBe("ask");
		if (a.kind === "ask") expect(a.question).toBe("我家宝宝发烧");
	});
});

describe("REPL line handler", () => {
	function makeDeps(overrides: Partial<ReplDeps> = {}): ReplDeps {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		memory.upsertChild({
			id: "alice",
			name: "Alice",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		memory.upsertChild({
			id: "bob",
			name: "Bob",
			birthDate: "2020-01-01",
			stage: "school_age",
		});
		const ask = vi.fn(async (_c: any, _q: string) => {});
		const list = vi.fn();
		const history = vi.fn();
		const use = vi.fn((id: string) => memory.getChild(id));
		const currentChild = memory.getChild("alice")!;
		return {
			memory,
			currentChild,
			ask,
			list,
			history,
			use,
			defaultLimit: 10,
			...overrides,
		};
	}

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns true on noop", () => {
		const deps = makeDeps();
		try {
			expect(handleReplLine(deps, "")).toBe(true);
		} finally {
			deps.memory.close();
		}
	});

	it("returns false on quit", () => {
		const deps = makeDeps();
		try {
			expect(handleReplLine(deps, "/quit")).toBe(false);
		} finally {
			deps.memory.close();
		}
	});

	it("help dispatches to cmdHelp (prints help text)", () => {
		const deps = makeDeps();
		try {
			handleReplLine(deps, "/help");
			expect(logs.join("\n")).toContain("parenting CLI");
		} finally {
			deps.memory.close();
		}
	});

	it("list dispatches to list callback", () => {
		const deps = makeDeps();
		try {
			handleReplLine(deps, "/list");
			expect(deps.list).toHaveBeenCalled();
		} finally {
			deps.memory.close();
		}
	});

	it("history dispatches to history callback with parsed limit", () => {
		const deps = makeDeps();
		try {
			handleReplLine(deps, "/history 3");
			expect(deps.history).toHaveBeenCalledWith(deps.currentChild, 3);
		} finally {
			deps.memory.close();
		}
	});

	it("use with valid child switches currentChild", () => {
		const deps = makeDeps();
		try {
			handleReplLine(deps, "/use bob");
			expect(deps.currentChild.id).toBe("bob");
		} finally {
			deps.memory.close();
		}
	});

	it("use with unknown child leaves currentChild unchanged", () => {
		const deps = makeDeps();
		try {
			const before = deps.currentChild.id;
			handleReplLine(deps, "/use ghost");
			expect(deps.currentChild.id).toBe(before);
		} finally {
			deps.memory.close();
		}
	});

	it("ask dispatches to ask callback with current child", async () => {
		const deps = makeDeps();
		try {
			handleReplLine(deps, "宝宝发烧怎么办");
			// ask is async (void), wait microtask
			await new Promise((r) => setTimeout(r, 0));
			expect(deps.ask).toHaveBeenCalledWith(
				deps.currentChild,
				"宝宝发烧怎么办",
			);
		} finally {
			deps.memory.close();
		}
	});
});

describe("REPL run loop", () => {
	function makeDeps(overrides: Partial<ReplDeps> = {}): ReplDeps {
		const memory = new MemoryLayer({ dbPath: ":memory:" });
		memory.upsertChild({
			id: "alice",
			name: "Alice",
			birthDate: "2024-06-19",
			stage: "toddler",
		});
		return {
			memory,
			currentChild: memory.getChild("alice")!,
			ask: vi.fn(async () => {}),
			list: vi.fn(),
			history: vi.fn(),
			use: vi.fn((id: string) => memory.getChild(id)),
			defaultLimit: 10,
			...overrides,
		};
	}

	function makeReader(lines: string[]): {
		reader: ReplReader;
		prompts: string[];
		closed: () => boolean;
	} {
		const prompts: string[] = [];
		let idx = 0;
		let closed = false;
		const reader: ReplReader = {
			question: (prompt: string) => {
				prompts.push(prompt);
				return Promise.resolve(lines[idx++] ?? "");
			},
			close: () => {
				closed = true;
			},
		};
		return { reader, prompts, closed: () => closed };
	}

	it("runs until /quit and closes reader", async () => {
		const deps = makeDeps();
		const { reader, prompts, closed } = makeReader([
			"/help",
			"/list",
			"/quit",
		]);
		try {
			await runRepl(deps, reader);
		} finally {
			deps.memory.close();
		}
		expect(prompts).toEqual(["parenting> ", "parenting> ", "parenting> "]);
		expect(closed()).toBe(true);
		expect(deps.list).toHaveBeenCalledTimes(1);
	});

	it("skips empty lines (no-op)", async () => {
		const deps = makeDeps();
		const { reader } = makeReader(["", "   ", "/quit"]);
		try {
			await runRepl(deps, reader);
		} finally {
			deps.memory.close();
		}
		expect(deps.ask).not.toHaveBeenCalled();
	});

	it("ask in REPL calls ask callback with current child", async () => {
		const deps = makeDeps();
		const { reader } = makeReader(["宝宝发烧", "/quit"]);
		try {
			await runRepl(deps, reader);
			await new Promise((r) => setTimeout(r, 0));
		} finally {
			deps.memory.close();
		}
		expect(deps.ask).toHaveBeenCalledWith(deps.currentChild, "宝宝发烧");
	});
});
