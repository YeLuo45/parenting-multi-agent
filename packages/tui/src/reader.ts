import readline from "node:readline";
import type { ReplReader } from "@parenting/cli";
import { TUI_COMMANDS, completeTuiCommand } from "./ui.js";

export function createReadlineReader(): ReplReader {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true,
		completer: (line: string): [string[], string] => {
			if (!line.startsWith("/")) return [[], line];
			const matches = completeTuiCommand(line);
			// Readline expects [completions, originalLine].
			return [matches as unknown as string[], line];
		},
	});
	return {
		question: (prompt: string) => new Promise<string>((resolve) => rl.question(prompt, resolve)),
		close: () => rl.close(),
	};
}

// Re-export for tests + downstream consumers that need to disable tab
// completion on a per-call basis.
export { TUI_COMMANDS, completeTuiCommand };
