import { describe, expect, it } from "vitest";

import { WEB_VERSION } from "../src/main.js";

describe("web dashboard entry", () => {
	it("exports the version", () => {
		expect(WEB_VERSION).toBe("0.1.0");
	});
});
