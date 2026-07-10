import { describe, expect, it } from "vitest";
import {
	buildUtterance,
	DEFAULT_VOICES,
	detectTtsLang,
	pickVoiceForLang,
	QueueTtsAdapter,
	sanitizeForTts,
	summarizeForSpeech,
} from "../src/index.js";

describe("sanitizeForTts", () => {
	it("removes markdown links", () => {
		expect(sanitizeForTts("[click](https://example.com)")).toBe("click");
	});

	it("removes bold markers", () => {
		expect(sanitizeForTts("**important**")).toBe("important");
		expect(sanitizeForTts("__also__")).toBe("also");
	});

	it("removes italic markers", () => {
		expect(sanitizeForTts("*emph*")).toBe("emph");
		expect(sanitizeForTts("_also_")).toBe("also");
	});

	it("removes headers", () => {
		expect(sanitizeForTts("# Title\n## Subtitle")).toBe("Title Subtitle");
	});

	it("removes bullet markers", () => {
		expect(sanitizeForTts("- a\n* b\n+ c")).toBe("a b c");
	});

	it("removes numbered list markers", () => {
		expect(sanitizeForTts("1. first\n2. second")).toBe("first second");
	});

	it("removes code fences", () => {
		expect(sanitizeForTts("```js\nconst x = 1;\n```")).toBe("");
	});

	it("removes inline code backticks", () => {
		expect(sanitizeForTts("use `npm` to install")).toBe(
			"use npm to install",
		);
	});

	it("collapses whitespace", () => {
		expect(sanitizeForTts("a\n\n  b\tc")).toBe("a b c");
	});

	it("passes through plain text", () => {
		expect(sanitizeForTts("hello world")).toBe("hello world");
	});

	it("trims leading/trailing whitespace", () => {
		expect(sanitizeForTts("  hello  ")).toBe("hello");
	});
});

describe("detectTtsLang", () => {
	it("Chinese → zh-CN", () => {
		expect(detectTtsLang("母乳喂养六到八次每天")).toBe("zh-CN");
	});

	it("English → en-US", () => {
		expect(detectTtsLang("breastfeed six to eight times daily")).toBe(
			"en-US",
		);
	});

	it("mostly Chinese with one English word → zh-CN", () => {
		// 5 CJK vs ~17 latin — should be en-US by ≥50% rule
		expect(detectTtsLang("这是一段中文 with some English")).toBe("en-US");
	});

	it("mostly English → en-US", () => {
		expect(detectTtsLang("This is English text 内容")).toBe("en-US");
	});

	it("empty → en-US", () => {
		expect(detectTtsLang("")).toBe("en-US");
	});
});

describe("pickVoiceForLang", () => {
	it("returns exact match", () => {
		const v = pickVoiceForLang(DEFAULT_VOICES, "zh-CN");
		expect(v?.lang).toBe("zh-CN");
	});

	it("returns prefix match for zh", () => {
		const v = pickVoiceForLang(DEFAULT_VOICES, "zh-TW");
		expect(v?.lang).toBe("zh-CN");
	});

	it("returns null for unknown lang", () => {
		expect(pickVoiceForLang(DEFAULT_VOICES, "ja-JP")).toBeNull();
	});

	it("returns null for empty list", () => {
		expect(pickVoiceForLang([], "zh-CN")).toBeNull();
	});
});

describe("QueueTtsAdapter — basic", () => {
	it("starts idle with no pending", async () => {
		const a = new QueueTtsAdapter();
		expect(a.state).toBe("idle");
		expect(a.pending).toEqual([]);
	});

	it("speaks one utterance → idle after", async () => {
		const a = new QueueTtsAdapter();
		const u = buildUtterance("hello");
		await a.speak(u);
		expect(a.state).toBe("idle");
	});

	it("queues multiple utterances", async () => {
		const spoken: string[] = [];
		const a = new QueueTtsAdapter(DEFAULT_VOICES, (u) => {
			spoken.push(u.text);
		});
		await a.speak(buildUtterance("one"));
		await a.speak(buildUtterance("two"));
		expect(spoken).toEqual(["one", "two"]);
	});

	it("cancel clears queue and resets state", async () => {
		const a = new QueueTtsAdapter();
		a.unshiftUtterance(buildUtterance("x"));
		a.unshiftUtterance(buildUtterance("y"));
		expect(a.pending).toHaveLength(2);
		a.cancel();
		expect(a.pending).toEqual([]);
		expect(a.state).toBe("idle");
	});

	it("pause + resume leaves state at idle after resume finishes", async () => {
		let firstResolve: (() => void) | null = null;
		const a = new QueueTtsAdapter(DEFAULT_VOICES, () => {
			return new Promise<void>((r) => {
				firstResolve = () => r();
			});
		});
		const speakPromise = a.speak(buildUtterance("first"));
		// Allow microtask tick so drain begins
		await new Promise((r) => setTimeout(r, 0));
		a.pause();
		expect(a.state).toBe("paused");
		a.resume();
		// Resolve the first speak callback so drain can finish
		firstResolve?.();
		await speakPromise;
		expect(a.state).toBe("idle");
	});

	it("records Error throw with .message", async () => {
		const a = new QueueTtsAdapter(DEFAULT_VOICES, () => {
			throw new Error("TTS provider down");
		});
		await a.speak(buildUtterance("oops"));
		expect(a.state).toBe("error");
		expect(a.error).toBe("TTS provider down");
	});

	it("records non-Error throw as string", async () => {
		const a = new QueueTtsAdapter(DEFAULT_VOICES, () => {
			throw "plain string error";
		});
		await a.speak(buildUtterance("oops"));
		expect(a.state).toBe("error");
		expect(a.error).toBe("plain string error");
	});

	it("records null throw as 'null' string", async () => {
		const a = new QueueTtsAdapter(DEFAULT_VOICES, () => {
			throw null;
		});
		await a.speak(buildUtterance("oops"));
		expect(a.error).toBe("null");
	});

	it("lists voices", () => {
		const a = new QueueTtsAdapter();
		const voices = a.listVoices();
		expect(voices.length).toBeGreaterThan(0);
	});

	it("filters voices by lang prefix", () => {
		const a = new QueueTtsAdapter();
		const zh = a.getVoicesByLang("zh");
		expect(zh.length).toBeGreaterThan(0);
		for (const v of zh) expect(v.lang.startsWith("zh")).toBe(true);
	});

	it("no resume effect when not paused", () => {
		const a = new QueueTtsAdapter();
		a.resume();
		expect(a.state).toBe("idle");
	});

	it("pause when not speaking is no-op", () => {
		const a = new QueueTtsAdapter();
		a.pause();
		expect(a.state).toBe("idle");
	});
});

describe("QueueTtsAdapter — currentUtterance", () => {
	it("tracks current during speak", async () => {
		let captured: string | null = null;
		const a = new QueueTtsAdapter(DEFAULT_VOICES, (u) => {
			captured = u.text;
		});
		await a.speak(buildUtterance("hello"));
		expect(captured).toBe("hello");
		expect(a.currentUtterance).toBeNull();
	});
});

describe("buildUtterance", () => {
	it("uses default voice for Chinese", () => {
		const u = buildUtterance("测试中文");
		expect(u.voice?.lang).toBe("zh-CN");
	});

	it("uses English voice for English", () => {
		const u = buildUtterance("hello world");
		expect(u.voice?.lang).toBe("en-US");
	});

	it("sanitizes text", () => {
		const u = buildUtterance("**bold** text");
		expect(u.text).toBe("bold text");
	});

	it("respects custom rate/pitch/volume", () => {
		const u = buildUtterance("x", DEFAULT_VOICES, 1.5, 0.8, 0.5);
		expect(u.rate).toBe(1.5);
		expect(u.pitch).toBe(0.8);
		expect(u.volume).toBe(0.5);
	});

	it("falls back to first voice if no lang match", () => {
		const u = buildUtterance("hello", []);
		expect(u.voice).toBeUndefined();
	});
});

describe("summarizeForSpeech", () => {
	it("joins question + answer pairs", () => {
		const out = summarizeForSpeech([
			{ question: "Q1", answer: "A1" },
			{ question: "Q2", answer: "A2" },
		]);
		expect(out).toContain("Q1");
		expect(out).toContain("A1");
		expect(out).toContain("Q2");
	});

	it("respects limit", () => {
		const out = summarizeForSpeech(
			[
				{ question: "Q1", answer: "A1" },
				{ question: "Q2", answer: "A2" },
				{ question: "Q3", answer: "A3" },
			],
			1,
		);
		expect(out).toContain("Q1");
		expect(out).not.toContain("Q2");
		expect(out).not.toContain("Q3");
	});

	it("strips markdown from answers", () => {
		const out = summarizeForSpeech([
			{ question: "Q", answer: "**bold** answer" },
		]);
		expect(out).toContain("bold answer");
		expect(out).not.toContain("**");
	});

	it("returns empty string for empty input", () => {
		expect(summarizeForSpeech([])).toBe("");
	});
});

describe("DEFAULT_VOICES", () => {
	it("contains at least one zh-CN and one en-US", () => {
		expect(DEFAULT_VOICES.some((v) => v.lang === "zh-CN")).toBe(true);
		expect(DEFAULT_VOICES.some((v) => v.lang === "en-US")).toBe(true);
	});

	it("every voice has unique id", () => {
		const ids = DEFAULT_VOICES.map((v) => v.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
