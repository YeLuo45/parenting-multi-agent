#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const FORWARDABLE_NPM_FLAGS = new Set(["host", "port", "open", "base"]);

export function buildWorkspaceRunArgs(workspace, script, rawArgs, env = process.env) {
	const npmConfigPrefix = "npm_config_";
	const npmConfigArgs = Object.entries(env)
		.filter(([key, value]) => key.startsWith(npmConfigPrefix) && value === "true")
		.map(([key]) => key.slice(npmConfigPrefix.length).replaceAll("_", "-"))
		.filter((key) => FORWARDABLE_NPM_FLAGS.has(key))
		.map((key) => `--${key}`);
	const forwardedArgs = [...npmConfigArgs, ...rawArgs.filter((arg) => arg !== "--")];
	return ["run", "-w", workspace, script, "--", ...forwardedArgs];
}

export function runWorkspaceScript(argv = process.argv, env = process.env) {
	const [, , workspace, script, ...rawArgs] = argv;
	if (!workspace || !script) {
		console.error("usage: run-workspace-dev.mjs <workspace> <script> [args...]");
		return 1;
	}
	const child = spawn("npm", buildWorkspaceRunArgs(workspace, script, rawArgs, env), {
		stdio: "inherit",
		env,
	});
	child.on("exit", (code, signal) => {
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exit(code ?? 1);
	});
	return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const status = runWorkspaceScript();
	if (status !== 0) process.exit(status);
}
