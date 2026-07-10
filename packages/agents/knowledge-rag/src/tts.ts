/**
 * Voice / Text-to-Speech module.
 *
 * Direction I: Voice/TTS — text-to-speech wrapper with queue, pause/resume,
 * voice selection, and text sanitization for safe TTS rendering.
 */

export type TtsState = "idle" | "speaking" | "paused" | "error";

export interface TtsVoice {
	id: string;
	name: string;
	lang: string;
	localService: boolean;
	default?: boolean;
}

export interface TtsUtterance {
	id: string;
	text: string;
	voice?: TtsVoice;
	rate: number; // 0.1 - 10
	pitch: number; // 0 - 2
	volume: number; // 0 - 1
}

export interface TtsAdapter {
	speak(u: TtsUtterance): Promise<void>;
	cancel(): void;
	pause(): void;
	resume(): void;
	listVoices(): TtsVoice[];
	getVoicesByLang(lang: string): TtsVoice[];
}

/** Default voice list (used when no browser SpeechSynthesis is available). */
export const DEFAULT_VOICES: TtsVoice[] = [
	{
		id: "zh-CN-female-1",
		name: "普通话女声",
		lang: "zh-CN",
		localService: true,
		default: true,
	},
	{
		id: "zh-CN-male-1",
		name: "普通话男声",
		lang: "zh-CN",
		localService: true,
	},
	{
		id: "en-US-female-1",
		name: "English US Female",
		lang: "en-US",
		localService: true,
	},
	{
		id: "en-US-male-1",
		name: "English US Male",
		lang: "en-US",
		localService: true,
	},
];

/** Strip Markdown, SSML, and other unsafe-for-TTS formatting. */
export function sanitizeForTts(text: string): string {
	let out = text;
	// Remove Markdown links: [text](url) → text
	out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
	// Remove Markdown bold/italic markers: **, __, *, _
	out = out.replace(/(\*\*|__)(.*?)\1/g, "$2");
	out = out.replace(/(\*|_)(.*?)\1/g, "$2");
	// Remove headers: # Header → Header
	out = out.replace(/^#{1,6}\s*/gm, "");
	// Remove bullet markers at line start
	out = out.replace(/^[-*+]\s+/gm, "");
	// Remove numbered list markers
	out = out.replace(/^\d+\.\s+/gm, "");
	// Remove code fences
	out = out.replace(/```[\s\S]*?```/g, "");
	// Remove inline code backticks
	out = out.replace(/`([^`]+)`/g, "$1");
	// Collapse whitespace
	out = out.replace(/\s+/g, " ");
	return out.trim();
}

/** Detect whether text is primarily Chinese (used for voice selection). */
export function detectTtsLang(text: string): "zh-CN" | "en-US" {
	if (!text) return "en-US";
	const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
	const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
	if (cjkCount === 0) return "en-US";
	return cjkCount > latinCount ? "zh-CN" : "en-US";
}

/** Pick the best voice for a given language. */
export function pickVoiceForLang(
	voices: readonly TtsVoice[],
	lang: string,
): TtsVoice | null {
	const exact = voices.find((v) => v.lang === lang);
	if (exact) return exact;
	const prefix = voices.find((v) => v.lang.startsWith(lang.split("-")[0]!));
	return prefix ?? null;
}

/**
 * In-memory TTS adapter with queue, pause/resume, and finite state machine.
 * Used in tests + Node-side CLIs. The browser adapter wraps
 * SpeechSynthesis; this class is the portable fallback.
 */
export class QueueTtsAdapter implements TtsAdapter {
	private queue: TtsUtterance[] = [];
	private current: TtsUtterance | null = null;
	private _state: TtsState = "idle";
	private _error: string | null = null;
	private readonly voices: TtsVoice[];
	private readonly onSpeak?: (u: TtsUtterance) => Promise<void> | void;

	constructor(
		voices: readonly TtsVoice[] = DEFAULT_VOICES,
		onSpeak?: (u: TtsUtterance) => Promise<void> | void,
	) {
		this.voices = [...voices];
		this.onSpeak = onSpeak;
	}

	get state(): TtsState {
		return this._state;
	}

	get error(): string | null {
		return this._error;
	}

	get pending(): readonly TtsUtterance[] {
		return [...this.queue];
	}

	get currentUtterance(): TtsUtterance | null {
		return this.current;
	}

	listVoices(): TtsVoice[] {
		return [...this.voices];
	}

	getVoicesByLang(lang: string): TtsVoice[] {
		return this.voices.filter((v) =>
			v.lang.startsWith(lang.split("-")[0]!),
		);
	}

	async speak(u: TtsUtterance): Promise<void> {
		this.queue.push(u);
		this._error = null;
		await this.drain();
	}

	private async drain(): Promise<void> {
		while (this.queue.length > 0 && this._state !== "paused") {
			const u = this.queue.shift()!;
			this.current = u;
			this._state = "speaking";
			try {
				if (this.onSpeak) await this.onSpeak(u);
			} catch (e) {
				this._error = e instanceof Error ? e.message : String(e);
				this._state = "error";
				this.current = null;
				return;
			}
		}
		this.current = null;
		this._state = "idle";
	}

	cancel(): void {
		this.queue = [];
		this.current = null;
		this._state = "idle";
	}

	pause(): void {
		if (this._state === "speaking") this._state = "paused";
	}

	resume(): void {
		if (this._state === "paused") {
			this._state = "speaking";
			void this.drain();
		}
	}

	/** Test/inspection helper: insert at head of queue. */
	unshiftUtterance(u: TtsUtterance): void {
		this.queue.unshift(u);
	}
}

/** Strip the standard RAG wrapper and produce a clean spoken summary. */
export function summarizeForSpeech(
	entries: readonly { question: string; answer: string }[],
	limit = 2,
): string {
	const lines: string[] = [];
	for (const e of entries.slice(0, limit)) {
		const cleaned = sanitizeForTts(e.answer);
		lines.push(`${e.question}：${cleaned}`);
	}
	return lines.join(" ");
}

/** Build a TtsUtterance from raw text, picking a default voice if needed. */
export function buildUtterance(
	text: string,
	voices: readonly TtsVoice[] = DEFAULT_VOICES,
	rate = 1.0,
	pitch = 1.0,
	volume = 1.0,
): TtsUtterance {
	const lang = detectTtsLang(text);
	const voice = pickVoiceForLang(voices, lang) ?? voices[0] ?? null;
	return {
		id: `utt_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
		text: sanitizeForTts(text),
		voice: voice ?? undefined,
		rate,
		pitch,
		volume,
	};
}
