#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = "apps/web/dist";
if (!existsSync(dist) || !statSync(dist).isDirectory()) {
	console.error("apps/web/dist missing; run npm run build:web first");
	process.exit(1);
}
const htmlPath = join(dist, "index.html");
if (!existsSync(htmlPath)) {
	console.error("apps/web/dist/index.html missing");
	process.exit(1);
}
const html = readFileSync(htmlPath, "utf8");
if (!html.includes("root")) {
	console.error("dist/index.html does not include app root marker");
	process.exit(1);
}
const assets = readdirSync(join(dist, "assets"));
if (!assets.some((name) => name.endsWith(".js"))) {
	console.error("dist/assets has no JavaScript bundle");
	process.exit(1);
}
console.log(`web smoke passed: ${assets.length} assets`);
