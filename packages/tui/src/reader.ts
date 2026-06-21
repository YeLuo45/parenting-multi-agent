import readline from "node:readline";
import type { ReplReader } from "@parenting/cli";

export function createReadlineReader(): ReplReader {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	return {
		question: (prompt: string) => new Promise<string>((resolve) => rl.question(prompt, resolve)),
		close: () => rl.close(),
	};
}
