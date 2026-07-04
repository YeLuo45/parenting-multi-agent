#!/usr/bin/env node
import { MemoryLayer } from "@parenting/memory";
import {
	cmdHistory,
	cmdUse,
	createOrchestrator,
	loadDefaultChild,
	printResult,
	runRepl,
	type ReplDeps,
	type ReplReader,
} from "@parenting/cli";
import {
	colorize,
	isWorkbenchDirection,
	renderChildTabs,
	renderClearScreen,
	renderGoodbye,
	renderHistoryPage,
	renderWorkbenchPanel,
	type ChildTab,
	type HistoryEntry,
	type HistoryPageOptions,
	type WorkbenchDirectionId,
	type WorkbenchPanelState,
	WORKBENCH_DIRECTIONS,
} from "./ui.js";

export const TUI_VERSION = "0.1.0";

export interface TuiOptions {
	dataDir?: string;
	dbPath?: string;
	reader: ReplReader;
	color?: boolean;
	pageSize?: number;
}

export function renderTuiBanner(agentCount: number, enabled = true): string {
	return [
		"╭────────────────────────────────────────────╮",
		"│ parenting-multi-agent TUI                  │",
		`│ ${agentCount.toString().padStart(2, " ")} specialist agents ready              │`,
		"╰────────────────────────────────────────────╯",
		colorize("  (type /help for commands, /quit to leave)", "dim", enabled),
	].join("\n");
}

export function renderTuiHelp(enabled = true): string {
	return [
		colorize("Commands:", "bold", enabled),
		colorize("  type a parenting question and press Enter", "dim", enabled),
		"  /list              list child profiles",
		"  /use <child-id>    switch active child",
		"  /history [n] [p]   show history — last n entries (default 10), page p (default 1)",
		"  /clear             clear the screen",
		"  /help              show this help",
		"  /quit              exit TUI",
	].join("\n");
}

/**
 * Build a horizontal tab strip of children. The active child is highlighted
 * with cyan arrows; the rest are dim. Pure formatter — used both by the TUI
 * loop and the test suite.
 */
export { renderChildTabs as renderTuiTabs, renderHistoryPage as renderTuiHistoryPage, renderGoodbye as renderTuiGoodbye, renderClearScreen as renderTuiClear } from "./ui.js";

function snapshotChildren(memory: MemoryLayer): ChildTab[] {
	return memory.listChildren().map((c) => ({
		id: c.id,
		name: c.name,
		stage: c.stage,
	}));
}

export function createTuiDeps(
	memory: MemoryLayer,
	pageSize = 10,
	color = true,
): ReplDeps {
	const currentChild = loadDefaultChild(memory);
	const orchestrator = createOrchestrator(memory);
	return {
		memory,
		currentChild,
		defaultLimit: pageSize,
		ask: async (child, question) => {
			const result = await orchestrator.ask(question, child);
			printResult(result);
		},
		list: () => {
			const children = memory.listChildren();
			if (children.length === 0) {
				console.log("（没有孩子档案）");
				return;
			}
			console.log("\n孩子档案：");
			for (const child of children) {
				console.log(`  ${child.id}  ${child.name}  (${child.birthDate}, ${child.stage})`);
			}
			console.log();
		},
		clear: () => {
			process.stdout.write(renderClearScreen(color));
		},
		history: (child, limit) => {
			cmdHistory(memory, child.id, limit);
		},
		use: (childId) => cmdUse(memory, childId),
	};
}

export async function runTui(options: TuiOptions): Promise<void> {
	const dbPath = options.dbPath ?? ":memory:";
	const memory = new MemoryLayer({ dbPath });
	const color = options.color ?? true;
	const pageSize = options.pageSize ?? 10;
	try {
		const deps = createTuiDeps(memory, pageSize, color);
		const agentCount = createOrchestrator(memory).listAgents().length;
		console.log(renderTuiBanner(agentCount, color));
		console.log(renderTuiHelp(color));
		console.log();
		console.log(renderChildTabs(snapshotChildren(memory), deps.currentChild.id, color));
		console.log();
		// Wrap reader.question so we can re-print the tab strip before each
		// prompt (so the user always knows which child is active).
		const tabSnapshot = () =>
			renderChildTabs(snapshotChildren(memory), deps.currentChild.id, color);
		const innerReader: ReplReader = {
			question: (prompt) => {
				process.stdout.write(tabSnapshot());
				process.stdout.write("\n");
				return options.reader.question(prompt);
			},
			close: () => options.reader.close(),
		};
		await runRepl(deps, innerReader);
	} finally {
		memory.close();
		process.stdout.write(renderGoodbye(color));
	}
}

/* v8 ignore start */
export async function main(
	argv: string[] = process.argv.slice(2),
	runner: (options: TuiOptions) => Promise<void> = runTui,
): Promise<number> {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(renderTuiBanner(18));
		console.log(renderTuiHelp());
		return 0;
	}
	if (argv.includes("--no-color")) {
		const { createReadlineReader } = await import("./reader.js");
		await runner({ reader: createReadlineReader(), color: false });
		return 0;
	}
	const { createReadlineReader } = await import("./reader.js");
	await runner({ reader: createReadlineReader() });
	return 0;
}
/* v8 ignore stop */
