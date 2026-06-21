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

export const TUI_VERSION = "0.1.0";

export interface TuiOptions {
	dataDir?: string;
	dbPath?: string;
	reader: ReplReader;
}

export function renderTuiBanner(agentCount: number): string {
	return [
		"╭────────────────────────────────────────────╮",
		"│ parenting-multi-agent TUI                  │",
		`│ ${agentCount.toString().padStart(2, " ")} specialist agents ready              │`,
		"╰────────────────────────────────────────────╯",
	].join("\n");
}

export function renderTuiHelp(): string {
	return [
		"Commands:",
		"  type a parenting question and press Enter",
		"  /list              list child profiles",
		"  /use <child-id>    switch active child",
		"  /history [n]       show recent Q&A history",
		"  /help              show CLI help",
		"  /quit              exit TUI",
	].join("\n");
}

export function createTuiDeps(memory: MemoryLayer): ReplDeps {
	const currentChild = loadDefaultChild(memory);
	const orchestrator = createOrchestrator(memory);
	return {
		memory,
		currentChild,
		defaultLimit: 10,
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
		history: (child, limit) => {
			cmdHistory(memory, child.id, limit);
		},
		use: (childId) => cmdUse(memory, childId),
	};
}

export async function runTui(options: TuiOptions): Promise<void> {
	const dbPath = options.dbPath ?? ":memory:";
	const memory = new MemoryLayer({ dbPath });
	try {
		const deps = createTuiDeps(memory);
		const agentCount = createOrchestrator(memory).listAgents().length;
		console.log(renderTuiBanner(agentCount));
		console.log(renderTuiHelp());
		await runRepl(deps, options.reader);
	} finally {
		memory.close();
	}
}

export async function main(
	argv: string[] = process.argv.slice(2),
	runner: (options: TuiOptions) => Promise<void> = runTui,
): Promise<number> {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(renderTuiBanner(18));
		console.log(renderTuiHelp());
		return 0;
	}
	/* v8 ignore next 2 */
	const { createReadlineReader } = await import("./reader.js");
	/* v8 ignore next 2 */
	await runner({ reader: createReadlineReader() });
	return 0;
}

