#!/usr/bin/env node
/**
 * parenting CLI — `parenting ask "..."`, `parenting add-child`, `parenting list`
 */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { OrchestratorCore } from "@parenting/orchestrator";
import { MemoryLayer, computeStage, type ChildProfile } from "@parenting/memory";
import { createPediatricianAgent } from "@parenting/agent-pediatrician";
import { createPsychologistAgent } from "@parenting/agent-psychologist";
import { createEducatorAgent } from "@parenting/agent-educator";

const DATA_DIR = join(homedir(), ".parenting-multi-agent");
const DB_PATH = join(DATA_DIR, "memory.sqlite");

function ensureDataDir(): void {
	if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadDefaultChild(memory: MemoryLayer): ChildProfile {
	const children = memory.listChildren();
	if (children.length === 0) {
		// Create a default sample child (1 year old)
		const sample: ChildProfile = {
			id: "default",
			name: "示例宝宝",
			birthDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
			stage: "toddler",
		};
		memory.upsertChild(sample);
		return sample;
	}
	return children[0];
}

function createOrchestrator(memory: MemoryLayer): OrchestratorCore {
	const orch = new OrchestratorCore({ memory, maxAgentsPerAsk: 3, minConfidence: 0.3 });
	orch.registerAgent(createPediatricianAgent());
	orch.registerAgent(createPsychologistAgent());
	orch.registerAgent(createEducatorAgent());
	return orch;
}

function printResult(result: Awaited<ReturnType<OrchestratorCore["ask"]>>): void {
	console.log("\n" + "=".repeat(60));
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
		console.log(`\n[${reply.agentName}] (confidence: ${(reply.confidence * 100).toFixed(0)}%${reply.urgency ? `, urgency: ${reply.urgency}` : ""})`);
		console.log("-".repeat(60));
		console.log(reply.content);
	}
	console.log();
}

async function cmdAsk(question: string): Promise<void> {
	ensureDataDir();
	const memory = new MemoryLayer({ dbPath: DB_PATH });
	try {
		const child = loadDefaultChild(memory);
		const orch = createOrchestrator(memory);
		const result = await orch.ask(question, child);
		printResult(result);
	} finally {
		memory.close();
	}
}

function cmdList(): void {
	ensureDataDir();
	const memory = new MemoryLayer({ dbPath: DB_PATH });
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

function cmdAddChild(id: string, name: string, birthDate: string): void {
	ensureDataDir();
	const memory = new MemoryLayer({ dbPath: DB_PATH });
	try {
		const stage = computeStage(birthDate);
		memory.upsertChild({ id, name, birthDate, stage });
		console.log(`✓ 已添加孩子: ${name} (${id}, ${birthDate}, ${stage})`);
	} finally {
		memory.close();
	}
}

function cmdHelp(): void {
	console.log(`
parenting CLI (v0.1.0)

用法:
  parenting ask <问题>          问一个育儿问题
  parenting list                列出所有孩子档案
  parenting add-child <id> <name> <birthDate>
                               添加孩子档案 (birthDate: YYYY-MM-DD)
  parenting help                显示此帮助

示例:
  parenting ask "我家宝宝3个月发烧38.5度怎么办"
  parenting ask "4岁孩子总发脾气怎么办"
  parenting add-child alice 爱丽丝 2024-06-19
`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const cmd = args[0];

	switch (cmd) {
		case "ask": {
			const question = args.slice(1).join(" ");
			if (!question) {
				console.error("错误: 请提供问题");
				process.exit(1);
			}
			await cmdAsk(question);
			break;
		}
		case "list":
			cmdList();
			break;
		case "add-child": {
			const [, id, name, birthDate] = args;
			if (!id || !name || !birthDate) {
				console.error("错误: parenting add-child <id> <name> <birthDate>");
				process.exit(1);
			}
			cmdAddChild(id, name, birthDate);
			break;
		}
		case "help":
		case "--help":
		case "-h":
		case undefined:
			cmdHelp();
			break;
		default:
			console.error(`未知命令: ${cmd}`);
			cmdHelp();
			process.exit(1);
	}
}

main().catch((err) => {
	console.error("错误:", err);
	process.exit(1);
});
