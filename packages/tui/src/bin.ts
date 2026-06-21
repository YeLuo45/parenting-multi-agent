#!/usr/bin/env node
import { main } from "./index.js";

main().then((code) => process.exit(code)).catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
