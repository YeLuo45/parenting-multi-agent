import { describe, expect, it } from "vitest";
import {
	classifyMilestone,
	createVisionService,
	extractText,
	HeuristicVisionProvider,
	imageBytesFromDataUrl,
	imageHash,
	LlmVisionProvider,
	MAX_IMAGE_BYTES,
	MockVisionProvider,
	OcrVisionProvider,
	SUPPORTED_MIME_TYPES,
	VISION_DISCLAIMER,
	type VisionInput,
	VisionService,
	validateImageInput,
} from "../src/index.js";

const SAMPLE_PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
	0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
	0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0xf3, 0xff, 0x61, 0x00, 0x00, 0x00,
	0x1a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0xfc, 0xff, 0xff, 0x3f,
	0x03, 0x35, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
	0xae, 0x42, 0x60, 0x82,
]);

function makeInput(overrides: Partial<VisionInput> = {}): VisionInput {
	return {
		image: SAMPLE_PNG,
		mimeType: "image/png",
		prompt: "describe",
		...overrides,
	};
}

describe("SUPPORTED_MIME_TYPES", () => {
	it("includes common image types", () => {
		expect(SUPPORTED_MIME_TYPES).toContain("image/jpeg");
		expect(SUPPORTED_MIME_TYPES).toContain("image/png");
		expect(SUPPORTED_MIME_TYPES).toContain("image/webp");
		expect(SUPPORTED_MIME_TYPES).toContain("image/gif");
	});
});

describe("MAX_IMAGE_BYTES", () => {
	it("is 10MB", () => {
		expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
	});
});

describe("imageBytesFromDataUrl", () => {
	it("decodes base64 data URL", () => {
		const dataUrl = `data:image/png;base64,${btoa("hello")}`;
		const bytes = imageBytesFromDataUrl(dataUrl);
		expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
	});

	it("returns empty array for invalid data URL", () => {
		expect(imageBytesFromDataUrl("not a data url").length).toBe(0);
	});

	it("returns empty array for empty string", () => {
		expect(imageBytesFromDataUrl("").length).toBe(0);
	});
});

describe("validateImageInput", () => {
	it("valid png input passes", () => {
		const v = validateImageInput(makeInput());
		expect(v.ok).toBe(true);
	});

	it("rejects empty image", () => {
		const v = validateImageInput(makeInput({ image: new Uint8Array() }));
		expect(v.ok).toBe(false);
	});

	it("rejects unsupported mimeType", () => {
		const v = validateImageInput(makeInput({ mimeType: "image/bmp" }));
		expect(v.ok).toBe(false);
	});

	it("rejects missing mimeType", () => {
		const v = validateImageInput(makeInput({ mimeType: "" }));
		expect(v.ok).toBe(false);
	});

	it("rejects oversized image", () => {
		const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
		const v = validateImageInput(makeInput({ image: big }));
		expect(v.ok).toBe(false);
	});

	it("accepts data URL image", () => {
		const dataUrl = `data:image/png;base64,${Buffer.from(SAMPLE_PNG).toString("base64")}`;
		const v = validateImageInput(makeInput({ image: dataUrl }));
		expect(v.ok).toBe(true);
	});
});

describe("imageHash", () => {
	it("is deterministic", () => {
		const h1 = imageHash(SAMPLE_PNG);
		const h2 = imageHash(SAMPLE_PNG);
		expect(h1).toBe(h2);
	});

	it("is 16 hex chars", () => {
		const h = imageHash(SAMPLE_PNG);
		expect(h.length).toBe(16);
		expect(/^[0-9a-f]+$/.test(h)).toBe(true);
	});

	it("differs for different inputs", () => {
		const h1 = imageHash(new Uint8Array([1, 2, 3]));
		const h2 = imageHash(new Uint8Array([4, 5, 6]));
		expect(h1).not.toBe(h2);
	});

	it("handles empty input", () => {
		const h = imageHash(new Uint8Array(0));
		expect(h.length).toBe(16);
	});
});

describe("extractText", () => {
	it("returns 8-character string", () => {
		const t = extractText(SAMPLE_PNG);
		expect(t.length).toBe(8);
	});

	it("is deterministic", () => {
		expect(extractText(SAMPLE_PNG)).toBe(extractText(SAMPLE_PNG));
	});

	it("uses only alphanumeric chars", () => {
		const t = extractText(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
		expect(/^[A-Z0-9]+$/.test(t)).toBe(true);
	});
});

describe("classifyMilestone", () => {
	it("returns one of 6 milestone labels", () => {
		const labels = ["会抬头", "会翻身", "会坐", "会爬", "会站", "会走"];
		const m = classifyMilestone(SAMPLE_PNG, 12);
		expect(labels).toContain(m);
	});

	it("returns '会走' for 18+ months with high-bucket hash", () => {
		// Find a hash that maps to bucket 5 (index 5 = "会走")
		let found = "";
		for (let i = 0; i < 1000; i++) {
			const b = new Uint8Array([
				i,
				0xff,
				0xee,
				0xdd,
				0xcc,
				0xbb,
				0xaa,
				0x99,
			]);
			if (classifyMilestone(b, 18) === "会走") {
				found = "found";
				break;
			}
		}
		expect(found).toBe("found");
	});

	it("falls back gracefully for young children", () => {
		const m = classifyMilestone(SAMPLE_PNG, 2);
		expect(m.length).toBeGreaterThan(0);
	});
});

describe("MockVisionProvider", () => {
	it("returns mock result with hash-derived text", async () => {
		const p = new MockVisionProvider();
		const r = await p.analyze(makeInput());
		expect(r.provider).toBe("mock");
		expect(r.text).toContain("[mock]");
		expect(r.labels).toContain("mock");
	});

	it("works with data URL input", async () => {
		const p = new MockVisionProvider();
		const dataUrl = `data:image/png;base64,${Buffer.from("hello").toString("base64")}`;
		const r = await p.analyze(makeInput({ image: dataUrl }));
		expect(r.provider).toBe("mock");
	});

	it("falls back to default prompt when not provided", async () => {
		const p = new MockVisionProvider();
		const r = await p.analyze({ image: SAMPLE_PNG, mimeType: "image/png" });
		expect(r.text).toContain("no prompt");
	});
});

describe("HeuristicVisionProvider", () => {
	it("detects PNG from first byte", async () => {
		const p = new HeuristicVisionProvider();
		const r = await p.analyze(makeInput());
		expect(r.labels).toContain("png");
	});

	it("detects JPEG from first byte (0xff)", async () => {
		const p = new HeuristicVisionProvider();
		const jpegBytes = new Uint8Array(50_000);
		jpegBytes[0] = 0xff;
		const r = await p.analyze(makeInput({ image: jpegBytes }));
		expect(r.labels).toContain("jpeg");
	});

	it("detects GIF from first byte (0x47)", async () => {
		const p = new HeuristicVisionProvider();
		const gifBytes = new Uint8Array(50_000);
		gifBytes[0] = 0x47;
		const r = await p.analyze(makeInput({ image: gifBytes }));
		expect(r.labels).toContain("gif");
	});

	it("detects large image", async () => {
		const big = new Uint8Array(2_000_000);
		big[0] = 0x89; // PNG signature
		const p = new HeuristicVisionProvider();
		const r = await p.analyze(makeInput({ image: big }));
		expect(r.labels).toContain("large");
	});

	it("detects small image", async () => {
		const small = new Uint8Array(50_000);
		small[0] = 0x89;
		const p = new HeuristicVisionProvider();
		const r = await p.analyze(makeInput({ image: small }));
		expect(r.labels).toContain("small");
	});

	it("returns OCR text", async () => {
		const p = new HeuristicVisionProvider();
		const r = await p.analyze(makeInput());
		expect(r.text.length).toBe(8);
	});

	it("handles data URL input", async () => {
		const p = new HeuristicVisionProvider();
		const dataUrl = `data:image/png;base64,${Buffer.from(SAMPLE_PNG).toString("base64")}`;
		const r = await p.analyze(makeInput({ image: dataUrl }));
		expect(r.text.length).toBe(8);
	});
});

describe("LlmVisionProvider", () => {
	it("returns stub with model name", async () => {
		const p = new LlmVisionProvider("test-model");
		const r = await p.analyze(makeInput());
		expect(r.provider).toBe("llm");
		expect(r.text).toContain("test-model");
	});

	it("uses default model", async () => {
		const p = new LlmVisionProvider();
		const r = await p.analyze(makeInput());
		expect(r.text).toContain("minimax-m3");
	});

	it("handles data URL input", async () => {
		const p = new LlmVisionProvider();
		const dataUrl = `data:image/png;base64,${Buffer.from(SAMPLE_PNG).toString("base64")}`;
		const r = await p.analyze(makeInput({ image: dataUrl }));
		expect(r.text).toContain("vision");
	});

	it("falls back to default prompt when not provided", async () => {
		const p = new LlmVisionProvider();
		const r = await p.analyze({ image: SAMPLE_PNG, mimeType: "image/png" });
		expect(r.text).toContain("general");
	});
});

describe("OcrVisionProvider", () => {
	it("returns OCR result", async () => {
		const p = new OcrVisionProvider();
		const r = await p.analyze(makeInput());
		expect(r.provider).toBe("ocr");
		expect(r.text.length).toBe(8);
	});

	it("handles data URL input", async () => {
		const p = new OcrVisionProvider();
		const dataUrl = `data:image/png;base64,${Buffer.from(SAMPLE_PNG).toString("base64")}`;
		const r = await p.analyze(makeInput({ image: dataUrl }));
		expect(r.provider).toBe("ocr");
	});
});

describe("VisionService", () => {
	it("defaults to 4 providers", () => {
		const s = createVisionService();
		expect(s.listProviders()).toHaveLength(4);
	});

	it("analyzes with first provider", async () => {
		const s = createVisionService();
		const r = await s.analyze(makeInput());
		expect(["mock", "heuristic", "ocr", "llm"]).toContain(r.provider);
	});

	it("falls back to next provider on failure", async () => {
		const s = new VisionService([
			{
				id: "mock",
				async analyze() {
					throw new Error("fail");
				},
			},
			new OcrVisionProvider(),
		]);
		const r = await s.analyze(makeInput());
		expect(r.provider).toBe("ocr");
	});

	it("returns fallback result when all providers fail", async () => {
		const s = new VisionService([
			{
				id: "mock",
				async analyze() {
					throw new Error("fail1");
				},
			},
			{
				id: "heuristic",
				async analyze() {
					throw new Error("fail2");
				},
			},
		]);
		const r = await s.analyze(makeInput());
		expect(r.provider).toBe("mock"); // fallback default
		expect(r.text).toContain("all providers failed");
	});

	it("adds new provider", () => {
		const s = createVisionService();
		s.addProvider(new OcrVisionProvider());
		expect(s.listProviders()).toContain("ocr");
	});

	it("returns invalid input result for bad image", async () => {
		const s = createVisionService();
		const r = await s.analyze(makeInput({ image: new Uint8Array(0) }));
		expect(r.text).toContain("invalid");
		expect(r.confidence).toBe(0);
	});
});

describe("VISION_DISCLAIMER", () => {
	it("includes warning emoji", () => {
		expect(VISION_DISCLAIMER).toContain("⚠️");
	});
});
