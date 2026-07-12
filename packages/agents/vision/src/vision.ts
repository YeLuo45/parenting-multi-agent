/**
 * @parenting/agent-vision — Multimodal image analysis.
 *
 * Direction U4: Multimodal 截图识别.
 *
 * Pure functions: image buffer validation, OCR stub, heuristic
 * milestone classifier, and pluggable VisionProvider interface.
 * No LLM call by default — uses pluggable providers.
 */

export type VisionProviderId = "mock" | "heuristic" | "llm" | "ocr";

export interface VisionInput {
	image: Uint8Array | string; // bytes or data-URL
	mimeType: string;
	prompt?: string;
}

export interface VisionResult {
	provider: VisionProviderId;
	text: string;
	labels: string[];
	confidence: number; // 0-1
	processingTimeMs: number;
	timestamp: number;
}

export interface VisionProvider {
	readonly id: VisionProviderId;
	analyze(input: VisionInput): Promise<VisionResult>;
}

export const SUPPORTED_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

/** Validate an image input. */
export function validateImageInput(input: VisionInput): {
	ok: boolean;
	errors: string[];
} {
	const errors: string[] = [];
	if (!input.mimeType) {
		errors.push("mimeType required");
	} else if (
		!(SUPPORTED_MIME_TYPES as readonly string[]).includes(input.mimeType)
	) {
		errors.push(`unsupported mimeType: ${input.mimeType}`);
	}
	const bytes =
		typeof input.image === "string"
			? imageBytesFromDataUrl(input.image)
			: input.image;
	if (bytes.length === 0) {
		errors.push("empty image");
	}
	if (bytes.length > MAX_IMAGE_BYTES) {
		errors.push(
			`image too large: ${bytes.length} bytes (max ${MAX_IMAGE_BYTES})`,
		);
	}
	return { ok: errors.length === 0, errors };
}

/** Convert a data URL to Uint8Array. */
export function imageBytesFromDataUrl(dataUrl: string): Uint8Array {
	const match = /^data:[^;]+;base64,(.*)$/.exec(dataUrl);
	if (!match) return new Uint8Array(0);
	const b64 = match[1]!;
	const binary = atob(b64);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		out[i] = binary.charCodeAt(i);
	}
	return out;
}

/** Compute a simple perceptual hash from image bytes (mock OCR). */
export function imageHash(bytes: Uint8Array): string {
	// Sampling-based hash: 64-bit polynomial mod 2^32
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	const step = Math.max(1, Math.floor(bytes.length / 16));
	for (let i = 0; i < bytes.length; i += step) {
		const v = bytes[i]!;
		h1 = Math.imul(h1 ^ v, 2654435761);
		h2 = Math.imul(h2 ^ v, 1597334677);
	}
	h1 =
		Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
		Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 =
		Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
		Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (
		(h2 >>> 0).toString(16).padStart(8, "0") +
		(h1 >>> 0).toString(16).padStart(8, "0")
	);
}

/** OCR stub: returns a mock text based on image hash. */
export function extractText(bytes: Uint8Array): string {
	const h = imageHash(bytes);
	// Pseudo-OCR: deterministic mock characters
	const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
	let out = "";
	for (let i = 0; i < 8; i++) {
		const idx = parseInt(h.slice(i % 16, (i % 16) + 1), 16) % chars.length;
		out += chars[idx];
	}
	return out;
}

/** Heuristic milestone classifier: maps image hash to milestone label. */
export function classifyMilestone(
	bytes: Uint8Array,
	ageMonths: number,
): string {
	const h = imageHash(bytes);
	const bucket = parseInt(h.slice(0, 2), 16) % 6;
	const labels = ["会抬头", "会翻身", "会坐", "会爬", "会站", "会走"];
	const ageMatch = [
		ageMonths >= 2,
		ageMonths >= 4,
		ageMonths >= 6,
		ageMonths >= 8,
		ageMonths >= 10,
		ageMonths >= 12,
	];
	// Pick the milestone that's closest to age and matches bucket
	for (let i = 0; i < labels.length; i++) {
		if (ageMatch[i] && i === bucket) return labels[i]!;
	}
	return labels[Math.min(bucket, labels.length - 1)]!;
}

/** Mock provider for testing — returns deterministic results from image hash. */
export class MockVisionProvider implements VisionProvider {
	readonly id = "mock" as const;
	async analyze(input: VisionInput): Promise<VisionResult> {
		const start = Date.now();
		const bytes =
			typeof input.image === "string"
				? imageBytesFromDataUrl(input.image)
				: input.image;
		const hash = imageHash(bytes);
		const text = extractText(bytes);
		return {
			provider: "mock",
			text: `[mock] ${text} (${input.prompt ?? "no prompt"})`,
			labels: ["mock", hash.slice(0, 8)],
			confidence: 0.5,
			processingTimeMs: Date.now() - start,
			timestamp: Date.now(),
		};
	}
}

/** Heuristic provider: rules-based, no LLM. */
export class HeuristicVisionProvider implements VisionProvider {
	readonly id = "heuristic" as const;
	async analyze(input: VisionInput): Promise<VisionResult> {
		const start = Date.now();
		const bytes =
			typeof input.image === "string"
				? imageBytesFromDataUrl(input.image)
				: input.image;
		const labels: string[] = [];
		// Detect a few common subjects via hash-derived heuristics
		const h = imageHash(bytes);
		const firstByte = bytes[0];
		if (firstByte === 0xff) labels.push("jpeg");
		else if (firstByte === 0x89) labels.push("png");
		else if (firstByte === 0x47) labels.push("gif");
		// Add a size label
		if (bytes.length > 1_000_000) labels.push("large");
		else if (bytes.length < 100_000) labels.push("small");
		return {
			provider: "heuristic",
			text: extractText(bytes),
			labels,
			confidence: 0.65,
			processingTimeMs: Date.now() - start,
			timestamp: Date.now(),
		};
	}
}

/** Stub LLM provider — returns a placeholder, ready to swap with real LLM. */
export class LlmVisionProvider implements VisionProvider {
	readonly id = "llm" as const;
	constructor(private readonly model = "minimax-m3") {}
	async analyze(input: VisionInput): Promise<VisionResult> {
		const start = Date.now();
		// In a real implementation, this would call the LLM API with the
		// image as base64 + prompt. For now, return a stub that names
		// the model + image size for debugging.
		const bytes =
			typeof input.image === "string"
				? imageBytesFromDataUrl(input.image)
				: input.image;
		return {
			provider: "llm",
			text: `[${this.model} vision] analyzing ${bytes.length} bytes for: ${input.prompt ?? "general"}`,
			labels: ["llm", this.model],
			confidence: 0.85,
			processingTimeMs: Date.now() - start,
			timestamp: Date.now(),
		};
	}
}

/** Pure-OCR provider — just calls extractText. */
export class OcrVisionProvider implements VisionProvider {
	readonly id = "ocr" as const;
	async analyze(input: VisionInput): Promise<VisionResult> {
		const start = Date.now();
		const bytes =
			typeof input.image === "string"
				? imageBytesFromDataUrl(input.image)
				: input.image;
		const text = extractText(bytes);
		return {
			provider: "ocr",
			text,
			labels: ["ocr"],
			confidence: 0.7,
			processingTimeMs: Date.now() - start,
			timestamp: Date.now(),
		};
	}
}

/** Vision service — orchestrates multiple providers with fallback. */
export class VisionService {
	private providers: VisionProvider[];

	constructor(
		providers: VisionProvider[] = [
			new MockVisionProvider(),
			new HeuristicVisionProvider(),
			new OcrVisionProvider(),
			new LlmVisionProvider(),
		],
	) {
		this.providers = providers;
	}

	addProvider(p: VisionProvider): void {
		this.providers.push(p);
	}

	listProviders(): VisionProviderId[] {
		return this.providers.map((p) => p.id);
	}

	async analyze(input: VisionInput): Promise<VisionResult> {
		const v = validateImageInput(input);
		if (!v.ok) {
			return {
				provider: "mock",
				text: `invalid: ${v.errors.join(", ")}`,
				labels: ["error"],
				confidence: 0,
				processingTimeMs: 0,
				timestamp: Date.now(),
			};
		}
		// Try each provider in order; first one wins
		for (const p of this.providers) {
			try {
				return await p.analyze(input);
			} catch {}
		}
		return {
			provider: "mock",
			text: "all providers failed",
			labels: ["fallback"],
			confidence: 0,
			processingTimeMs: 0,
			timestamp: Date.now(),
		};
	}
}

export function createVisionService(): VisionService {
	return new VisionService();
}

export const VISION_DISCLAIMER =
	"⚠️ 图像分析为辅助工具。医疗/发育评估请咨询医生。";
