#!/usr/bin/env node
import { readFileSync } from "node:fs";

const required = [
	"NODE_ENV=development npm run test:coverage",
	"npm run build:web",
	"npm run dev:web",
	"npm run release:gate",
	"npm run smoke:web",
];

for (const file of ["README.md", "README.zh-CN.md"]) {
	const text = readFileSync(file, "utf8");
	for (const command of required) {
		if (!text.includes(command)) {
			console.error(`${file}: missing documented command: ${command}`);
			process.exit(1);
		}
	}
}

console.log("README command verification passed");
