import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWorkspaceRunArgs } from "../scripts/run-workspace-dev.mjs";

describe("run-workspace-dev", () => {
	it("forwards normal args after the workspace script separator", () => {
		assert.deepEqual(
			buildWorkspaceRunArgs("@parenting/web", "dev", ["--host", "127.0.0.1"], {}),
			["run", "-w", "@parenting/web", "dev", "--", "--host", "127.0.0.1"],
		);
	});

	it("drops redundant npm separators", () => {
		assert.deepEqual(
			buildWorkspaceRunArgs("@parenting/web", "dev", ["--", "--host", "127.0.0.1"], {}),
			["run", "-w", "@parenting/web", "dev", "--", "--host", "127.0.0.1"],
		);
	});

	it("converts npm_config boolean flags from npm run X --flag", () => {
		assert.deepEqual(
			buildWorkspaceRunArgs("@parenting/web", "dev", ["127.0.0.1"], { npm_config_host: "true" }),
			["run", "-w", "@parenting/web", "dev", "--", "--host", "127.0.0.1"],
		);
	});

	it("does not forward npm's own persistent config flags", () => {
		assert.deepEqual(
			buildWorkspaceRunArgs("@parenting/web", "dev", ["--host", "127.0.0.1"], { npm_config_save_exact: "true" }),
			["run", "-w", "@parenting/web", "dev", "--", "--host", "127.0.0.1"],
		);
	});
});
