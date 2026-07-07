#!/usr/bin/env node
/**
 * parenting CLI — `parenting ask "..."`, `parenting add-child`, `parenting list`,
 * `parenting repl`, `parenting use`, `parenting history`, `parenting children`
 */

import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { createCareerAgent } from "@parenting/agent-career";
import { createCollegePrepAgent } from "@parenting/agent-college-prep";
import { createCryDecoderAgent } from "@parenting/agent-cry-decoder";
import { createEducatorAgent } from "@parenting/agent-educator";
import { createFamilyMediatorAgent } from "@parenting/agent-family-mediator";
import { createFinanceAgent } from "@parenting/agent-finance";
import { createGrowthTrackerAgent } from "@parenting/agent-growth-tracker";
import { createHabitBuilderAgent } from "@parenting/agent-habit-builder";
import { createHomeworkHelperAgent } from "@parenting/agent-homework-helper";
import { createKnowledgeRAGAgent } from "@parenting/agent-knowledge-rag";
import { createLegalAgent } from "@parenting/agent-legal";
import { createNutritionistAgent } from "@parenting/agent-nutritionist";
import { createParentSupportAgent } from "@parenting/agent-parent-support";
import { createPediatricianAgent } from "@parenting/agent-pediatrician";
import { createPsychologistAgent } from "@parenting/agent-psychologist";
import { createSafetyGuardAgent } from "@parenting/agent-safety-guard";
import { createSchoolReadinessAgent } from "@parenting/agent-school-readiness";
import { createSiblingAgent } from "@parenting/agent-sibling";
import { createSleepCoachAgent } from "@parenting/agent-sleep-coach";
import { createSocialAgent } from "@parenting/agent-social";
import {
	type ChildProfile,
	computeStage,
	type Episode,
	MemoryLayer,
} from "@parenting/memory";
import { OrchestratorCore } from "@parenting/orchestrator";

/* v8 ignore next */
const CLI_VERSION = "0.1.0";

/**
 * Read an env var in both Node (process.env) and Node-with-Userland shims.
 * Returns the trimmed string or `undefined` when missing. Tests pass
 * through `defaults` so the CLI works even when neither tier's API
 * key is configured.
 */
function readEnv(name: string): string | undefined {
	const proc = (
		globalThis as { process?: { env?: Record<string, string | undefined> } }
	).process;
	return proc?.env?.[name]?.trim() || undefined;
}

/**
 * Print the current LLM provider chain status to stdout.
 * Mirrors what the web workbench-badge shows so operators on a
 * server with no browser can confirm keys are wired correctly.
 */
export function cmdLlmStatus(): void {
	const min = readEnv("MINIMAX_CN_API_KEY");
	const xiaomi = readEnv("XIAOMI_API_KEY");
	const lines: string[] = [];
	lines.push(`parenting CLI (v${CLI_VERSION}) — LLM provider chain status`);
	lines.push("");
	lines.push(
		`  primary    minimax-m3   ${min ? "configured" : "missing key"}  (env MINIMAX_CN_API_KEY)`,
	);
	lines.push(
		`  secondary  xiaomi-mimo  ${xiaomi ? "configured" : "missing key"}  (env XIAOMI_API_KEY)`,
	);
	lines.push(`  fallback   rule-fallback always-ready (deterministic)`);
	lines.push("");
	const count = (min ? 1 : 0) + (xiaomi ? 1 : 0);
	if (count === 0) {
		lines.push(
			"  status: no real LLM wired. The CLI will fall back to rule-based replies.",
		);
	} else {
		const primary = min ? "minimax-m3" : "xiaomi-mimo";
		lines.push(
			`  status: ready. Primary = ${primary}. ${count} API key${count > 1 ? "s" : ""} detected.`,
		);
	}
	console.log(lines.join("\n"));
}

function dataDir(): string {
	/* v8 ignore next */
	return (
		process.env.PARENTING_DATA_DIR ??
		join(homedir(), ".parenting-multi-agent")
	);
}

function dbPath(): string {
	return join(dataDir(), "memory.sqlite");
}

function ensureDataDir(): void {
	const dir = dataDir();
	/* v8 ignore next */
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function loadDefaultChild(memory: MemoryLayer): ChildProfile {
	const children = memory.listChildren();
	if (children.length === 0) {
		// Create a default sample child (1 year old)
		const sample: ChildProfile = {
			id: "default",
			name: "示例宝宝",
			birthDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
			stage: "toddler",
		};
		memory.upsertChild(sample);
		return sample;
	}
	return children[0];
}

export function createOrchestrator(memory: MemoryLayer): OrchestratorCore {
	const orch = new OrchestratorCore({
		memory,
		maxAgentsPerAsk: 3,
		minConfidence: 0.3,
	});
	orch.registerAgent(createPediatricianAgent());
	orch.registerAgent(createPsychologistAgent());
	orch.registerAgent(createEducatorAgent());
	orch.registerAgent(createNutritionistAgent());
	orch.registerAgent(createSleepCoachAgent());
	orch.registerAgent(createFamilyMediatorAgent());
	orch.registerAgent(createFinanceAgent());
	orch.registerAgent(createParentSupportAgent());
	orch.registerAgent(createGrowthTrackerAgent());
	orch.registerAgent(createHabitBuilderAgent());
	orch.registerAgent(createKnowledgeRAGAgent());
	orch.registerAgent(createSafetyGuardAgent());
	orch.registerAgent(createSocialAgent());
	orch.registerAgent(createSchoolReadinessAgent());
	orch.registerAgent(createCollegePrepAgent());
	orch.registerAgent(createCareerAgent());
	orch.registerAgent(createLegalAgent());
	orch.registerAgent(createSiblingAgent());
	orch.registerAgent(createCryDecoderAgent());
	orch.registerAgent(createHomeworkHelperAgent());
	return orch;
}

export function printResult(
	result: Awaited<ReturnType<OrchestratorCore["ask"]>>,
): void {
	console.log(`\n${"=".repeat(60)}`);
	console.log(`问题: ${result.question}`);
	console.log("=".repeat(60));

	if (result.emergencyEscalation && result.redFlag) {
		console.log(`\n🚨 紧急情况 (${result.redFlag.severity.toUpperCase()})`);
		console.log(`规则: ${result.redFlag.ruleId}`);
		console.log(`描述: ${result.redFlag.description}`);
		console.log(`建议: ${result.redFlag.action}\n`);
		return;
	}

	if (result.replies.length === 0) {
		console.log("\n（没有匹配的 agent，请换个方式描述）\n");
		return;
	}

	for (const reply of result.replies) {
		console.log(
			`\n[${reply.agentName}] (confidence: ${(reply.confidence * 100).toFixed(0)}%${reply.urgency ? `, urgency: ${reply.urgency}` : ""})`,
		);
		console.log("-".repeat(60));
		console.log(reply.content);
	}
	console.log();
}

export async function cmdAsk(question: string): Promise<void> {
	ensureDataDir();
	const memory = new MemoryLayer({ dbPath: dbPath() });
	try {
		const child = loadDefaultChild(memory);
		const orch = createOrchestrator(memory);
		const result = await orch.ask(question, child);
		printResult(result);
	} finally {
		memory.close();
	}
}

export function cmdList(): void {
	ensureDataDir();
	const memory = new MemoryLayer({ dbPath: dbPath() });
	try {
		const children = memory.listChildren();
		if (children.length === 0) {
			console.log("（没有孩子档案，请先 parenting add-child）");
			return;
		}
		console.log("\n孩子档案：");
		for (const c of children) {
			console.log(`  ${c.id}  ${c.name}  (${c.birthDate}, ${c.stage})`);
		}
		console.log();
	} finally {
		memory.close();
	}
}

export function cmdAddChild(id: string, name: string, birthDate: string): void {
	ensureDataDir();
	const memory = new MemoryLayer({ dbPath: dbPath() });
	try {
		const stage = computeStage(birthDate);
		memory.upsertChild({ id, name, birthDate, stage });
		console.log(`✓ 已添加孩子: ${name} (${id}, ${birthDate}, ${stage})`);
	} finally {
		memory.close();
	}
}

export function cmdHistory(
	memory: MemoryLayer,
	childId: string,
	limit = 10,
): Episode[] {
	const episodes = memory.getEpisodes(childId, "qa", limit);
	if (episodes.length === 0) {
		console.log(`\n（child ${childId} 暂无问答记录）\n`);
		return episodes;
	}
	console.log(`\n📜 child ${childId} 最近 ${episodes.length} 条问答：\n`);
	for (const ep of episodes) {
		const content = ep.content as {
			question?: string;
			redFlag?: boolean;
			severity?: string;
		};
		const tag = content.redFlag ? "🚨" : "💬";
		const summary =
			content.question ?? JSON.stringify(content).slice(0, 60);
		console.log(`  ${tag} [${ep.createdAt}] ${summary}`);
	}
	console.log();
	return episodes;
}

export function cmdUse(
	memory: MemoryLayer,
	childId: string,
): ChildProfile | null {
	const child = memory.getChild(childId);
	if (!child) {
		console.error(`错误: 找不到 child id="${childId}"`);
		return null;
	}
	console.log(`✓ 已切换到 child ${child.id} (${child.name}, ${child.stage})`);
	return child;
}

/** Strip leading "/", normalize empty input. */
function normalizeReplLine(line: string): string {
	return line.trim();
}

/** Pure handler: given a state + line, return next prompt + side-effect list. */
export type ReplAction =
	| { kind: "ask"; question: string }
	| { kind: "use"; childId: string }
	| { kind: "history"; limit: number }
	| { kind: "list" }
	| { kind: "clear" }
	| { kind: "help" }
	| { kind: "quit" }
	| { kind: "noop" };

export function parseReplLine(line: string, defaultLimit: number): ReplAction {
	const trimmed = normalizeReplLine(line);
	if (
		trimmed === "" ||
		trimmed === "/quit" ||
		trimmed === "quit" ||
		trimmed === "exit"
	) {
		return trimmed === "" ? { kind: "noop" } : { kind: "quit" };
	}
	if (trimmed === "/help" || trimmed === "help" || trimmed === "?")
		return { kind: "help" };
	if (trimmed === "/list" || trimmed === "list") return { kind: "list" };
	if (trimmed === "/clear" || trimmed === "clear") return { kind: "clear" };
	if (trimmed === "/history" || trimmed === "history")
		return { kind: "history", limit: defaultLimit };
	const historyMatch = /^\/(?:history|hist)\s+(\d+)$/.exec(trimmed);
	if (historyMatch)
		return { kind: "history", limit: Number(historyMatch[1]) };
	const useMatch = /^\/use\s+(\S+)$/.exec(trimmed);
	if (useMatch) return { kind: "use", childId: useMatch[1] };
	return { kind: "ask", question: trimmed };
}

export interface ReplDeps {
	memory: MemoryLayer;
	currentChild: ChildProfile;
	ask: (child: ChildProfile, question: string) => Promise<void>;
	list: () => void;
	clear?: () => void;
	history: (child: ChildProfile, limit: number) => void;
	use: (childId: string) => ChildProfile | null;
	defaultLimit: number;
}

/** Process one REPL line: dispatch to the right action; returns false to exit. */
export function handleReplLine(deps: ReplDeps, line: string): boolean {
	const action = parseReplLine(line, deps.defaultLimit);
	switch (action.kind) {
		case "noop":
			return true;
		case "quit":
			return false;
		case "help":
			cmdHelp();
			return true;
		case "list":
			deps.list();
			return true;
		case "clear":
			deps.clear?.();
			return true;
		case "history":
			deps.history(deps.currentChild, action.limit);
			return true;
		case "use": {
			const next = deps.use(action.childId);
			if (next) deps.currentChild = next;
			return true;
		}
		case "ask":
			// Fire-and-forget; errors surface through ask() console.error already.
			void deps.ask(deps.currentChild, action.question);
			return true;
		default: {
			// Exhaustiveness guard — unreachable if ReplAction union is complete.
			const _exhaustive: never = action;
			void _exhaustive;
			return true;
		}
	}
}

/** Read input via injected reader, run REPL until quit/EOF. Exposed for tests. */
export interface ReplReader {
	question: (prompt: string) => Promise<string>;
	close: () => void;
}

export async function runRepl(
	deps: ReplDeps,
	reader: ReplReader,
): Promise<void> {
	// Loop: prompt → handle line → continue until handleReplLine returns false
	// or reader yields empty (EOF).
	// Use an iterative loop with await for testability (no real while/for-of await).
	for (;;) {
		const line = await reader.question("parenting> ");
		const next = handleReplLine(deps, line);
		if (!next) break;
	}
	reader.close();
	console.log("\n👋 再见");
}

/** Production REPL: real readline over stdin/stdout. */
/* v8 ignore next 24 */
export function startRepl(
	memory: MemoryLayer,
	currentChild: ChildProfile,
): void {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	const reader: ReplReader = {
		question: (prompt) =>
			new Promise<string>((res) => rl.question(prompt, res)),
		close: () => rl.close(),
	};
	const deps: ReplDeps = {
		memory,
		currentChild,
		ask: async (child, question) => {
			const orch = createOrchestrator(memory);
			const result = await orch.ask(question, child);
			printResult(result);
		},
		list: () => cmdList(),
		history: (child, limit) => cmdHistory(memory, child.id, limit),
		use: (childId) => cmdUse(memory, childId),
		defaultLimit: 10,
	};
	void runRepl(deps, reader);
}

/* v8 ignore next 6 */
export function cmdRepl(memory: MemoryLayer): void {
	ensureDataDir();
	const child = loadDefaultChild(memory);
	startRepl(memory, child);
}

export function cmdHelp() {
	console.log(`
parenting CLI (v${CLI_VERSION})

用法:
  parenting ask <问题>          问一个育儿问题
  parenting list                列出所有孩子档案
  parenting add-child <id> <name> <birthDate>
                               添加孩子档案 (birthDate: YYYY-MM-DD)
  parenting children            列出所有孩子档案（同 list）
  parenting use <id>            切换当前 child（影响后续 ask/history）
  parenting history [n]         显示当前 child 的最近 n 条问答（默认 10）
  parenting llm-status          显示当前 LLM provider chain 的状态
                               (primary / fallback / API key 检测)
  parenting repl                启动交互式会话（连续问、/use /history /quit）
  parenting help                显示此帮助

示例:
  parenting ask "我家宝宝3个月发烧38.5度怎么办"
  parenting ask "4岁孩子总发脾气怎么办"
  parenting add-child alice 爱丽丝 2024-06-19
  parenting use alice
  parenting llm-status
  parenting repl
`);
}

export async function runCli(args: string[]): Promise<number> {
	const cmd = args[0];

	switch (cmd) {
		case "ask": {
			const question = args.slice(1).join(" ");
			if (!question) {
				console.error("错误: 请提供问题");
				return 1;
			}
			await cmdAsk(question);
			return 0;
		}
		case "list":
		case "children": {
			cmdList();
			return 0;
		}
		case "add-child": {
			const [, id, name, birthDate] = args;
			if (!id || !name || !birthDate) {
				console.error(
					"错误: parenting add-child <id> <name> <birthDate>",
				);
				return 1;
			}
			cmdAddChild(id, name, birthDate);
			return 0;
		}
		case "use": {
			const childId = args[1];
			if (!childId) {
				console.error("错误: parenting use <childId>");
				return 1;
			}
			ensureDataDir();
			const memory = new MemoryLayer({ dbPath: dbPath() });
			try {
				const result = cmdUse(memory, childId);
				return result ? 0 : 1;
			} finally {
				memory.close();
			}
		}
		case "history": {
			const limit = Number(args[1]) || 10;
			ensureDataDir();
			const memory = new MemoryLayer({ dbPath: dbPath() });
			try {
				const child = loadDefaultChild(memory);
				cmdHistory(memory, child.id, limit);
				return 0;
			} finally {
				memory.close();
			}
		}
		case "llm-status": {
			cmdLlmStatus();
			return 0;
		}
		/* v8 ignore next 8 */
		case "repl": {
			ensureDataDir();
			cmdRepl(new MemoryLayer({ dbPath: dbPath() }));
			return 0;
		}
		case "help":
		case "--help":
		case "-h":
		case undefined:
			cmdHelp();
			return 0;
		default:
			console.error(`未知命令: ${cmd}`);
			cmdHelp();
			return 1;
	}
}

/* v8 ignore next 3 */
function isDirectRun(): boolean {
	return process.argv[1] === fileURLToPath(import.meta.url);
}

/* v8 ignore next 10 */
if (isDirectRun()) {
	runCli(process.argv.slice(2))
		.then((code) => {
			process.exitCode = code;
		})
		.catch((err) => {
			console.error("错误:", err);
			process.exitCode = 1;
		});
}
