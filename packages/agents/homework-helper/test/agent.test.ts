import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import {
	buildSocraticSession,
	createHomeworkHelperAgent,
	detectDifficulty,
	detectHomeworkSubject,
	detectProblemTopic,
	formatHintChain,
	generateProbeQuestion,
	generateSocraticQuestion,
	getHintChain,
	getHomeworkSubjects,
	gradeStudentAnswer,
	HOMEWORK_SUBJECTS,
	type HomeworkSubject,
} from "../src/index.js";

function makeChild(): ChildProfile {
	return {
		id: "c",
		name: "Kid",
		birthDate: "2014-06-19",
		stage: "school_age",
	};
}

describe("HOMEWORK_SUBJECTS", () => {
	it("exposes 5 canonical subjects", () => {
		expect(HOMEWORK_SUBJECTS).toEqual([
			"math",
			"chinese",
			"english",
			"science",
			"social_studies",
		]);
	});

	it("getHomeworkSubjects returns a copy", () => {
		const list = getHomeworkSubjects();
		expect(list).toEqual(HOMEWORK_SUBJECTS);
		list.push("art" as never);
		expect(HOMEWORK_SUBJECTS).toHaveLength(5);
	});
});

describe("detectHomeworkSubject", () => {
	it.each<[string, HomeworkSubject]>([
		["数学题不会做", "math"],
		["应用题：小明有3个苹果", "math"],
		["3 + 5 等于多少", "math"],
		["语文课文朗读", "chinese"],
		["作文怎么开头", "chinese"],
		["英语单词背不下来", "english"],
		["English grammar question", "english"],
		["物理实验怎么做", "science"],
		["历史朝代表", "social_studies"],
		["中国地理地图", "social_studies"],
	])("detects %s → %s", (text, expected) => {
		expect(detectHomeworkSubject(text)).toBe(expected);
	});

	it("returns null for unrecognized input", () => {
		expect(detectHomeworkSubject("今天天气真好")).toBeNull();
	});
});

describe("detectProblemTopic", () => {
	it("math → arithmetic on calc keyword", () => {
		expect(detectProblemTopic("100 + 200", "math")).toBe("arithmetic");
	});

	it("math → word_problem on 应用题", () => {
		expect(detectProblemTopic("应用题：小明有3个苹果", "math")).toBe(
			"word_problem",
		);
	});

	it("math → geometry on 几何", () => {
		expect(detectProblemTopic("三角形面积", "math")).toBe("geometry");
	});

	it("math → algebra on 方程", () => {
		expect(detectProblemTopic("解方程 x + 1 = 2", "math")).toBe("algebra");
	});

	it("english → grammar on 语法", () => {
		expect(detectProblemTopic("时态语法", "english")).toBe("grammar");
	});

	it("english → vocabulary on 单词", () => {
		expect(detectProblemTopic("单词背不下来", "english")).toBe(
			"vocabulary",
		);
	});

	it("returns 'general' for subject not in TOPIC_BANKS (cast)", () => {
		expect(
			detectProblemTopic("随便问问", "nonexistent" as HomeworkSubject),
		).toBe("general");
	});
});

describe("detectDifficulty", () => {
	it("easy on 简单", () => {
		expect(detectDifficulty("简单题")).toBe("easy");
	});

	it("medium on 中等", () => {
		expect(detectDifficulty("中等难度")).toBe("medium");
	});

	it("hard on 难", () => {
		expect(detectDifficulty("这道题很难")).toBe("hard");
	});

	it("defaults to medium", () => {
		expect(detectDifficulty("random text")).toBe("medium");
	});
});

describe("generateSocraticQuestion", () => {
	it("returns non-empty for valid (subject, topic)", () => {
		const q = generateSocraticQuestion("math", "arithmetic");
		expect(q.length).toBeGreaterThan(0);
	});

	it("returns a fallback question for unknown subject (cast)", () => {
		const q = generateSocraticQuestion(
			"nonexistent" as HomeworkSubject,
			"general",
		);
		expect(q).toContain("题目");
	});

	it("returns a question for general topic", () => {
		const q = generateSocraticQuestion("math", "general");
		expect(q.length).toBeGreaterThan(0);
	});
});

describe("generateProbeQuestion", () => {
	it("returns a probe with the requested purpose", () => {
		const p = generateProbeQuestion("math", "word_problem", "decompose");
		expect(p).not.toBeNull();
		expect(p?.purpose).toBe("decompose");
	});

	it("falls back to first probe when purpose not in bank", () => {
		const p = generateProbeQuestion("math", "algebra", "extend");
		expect(p).not.toBeNull();
	});

	it("returns null for invalid subject", () => {
		const p = generateProbeQuestion(
			"nonexistent" as HomeworkSubject,
			"general",
			"check",
		);
		expect(p).toBeNull();
	});

	it("returns null for invalid subject even with default purpose", () => {
		const p = generateProbeQuestion(
			"nonexistent" as HomeworkSubject,
			"general",
		);
		expect(p).toBeNull();
	});

	it("returns null when probes array is empty (fallback branch)", () => {
		// exercise the ?? null fallback via the english/translation topic
		// which has empty probes array.
		const p = generateProbeQuestion(
			"english",
			"translation" as Parameters<typeof generateProbeQuestion>[1],
		);
		expect(p).toBeNull();
	});
});

describe("getHintChain", () => {
	it("returns 3-level chain for valid (subject, topic)", () => {
		const chain = getHintChain("math", "arithmetic");
		expect(chain).toHaveLength(3);
		expect(chain[0]?.level).toBe(1);
		expect(chain[2]?.level).toBe(3);
	});

	it("returns fallback chain for unknown subject (cast)", () => {
		const chain = getHintChain("nonexistent" as HomeworkSubject, "general");
		expect(chain).toHaveLength(3);
	});

	it("returns fallback chain for unknown topic", () => {
		const chain = getHintChain("math", "unknown_topic" as never);
		expect(chain).toHaveLength(3);
	});
});

describe("formatHintChain", () => {
	it("renders 3-level hints", () => {
		const chain = getHintChain("math", "arithmetic");
		const out = formatHintChain(chain);
		expect(out).toContain("第 1 级");
		expect(out).toContain("第 2 级");
		expect(out).toContain("第 3 级");
	});

	it("handles empty chain", () => {
		expect(formatHintChain([])).toContain("暂无");
	});
});

describe("gradeStudentAnswer", () => {
	it("empty answer → incorrect", () => {
		const r = gradeStudentAnswer("", "math", "arithmetic");
		expect(r.level).toBe("incorrect");
		expect(r.score).toBe(0);
	});

	it("'?' only → unclear", () => {
		const r = gradeStudentAnswer("?", "math", "arithmetic");
		expect(r.level).toBe("unclear");
	});

	it("'不知道' → unclear", () => {
		const r = gradeStudentAnswer("不知道", "math", "arithmetic");
		expect(r.level).toBe("unclear");
	});

	it("single word → partial", () => {
		const r = gradeStudentAnswer("对", "math", "arithmetic");
		expect(r.level).toBe("partial");
	});

	it("conclusion word + length → correct", () => {
		const r = gradeStudentAnswer(
			"因为 3 + 5 等于 8，所以答案是 8",
			"math",
			"arithmetic",
		);
		expect(r.level).toBe("correct");
		expect(r.score).toBeGreaterThan(0.8);
	});

	it("returns nextProbe", () => {
		const r = gradeStudentAnswer("", "math", "arithmetic");
		expect(r.nextProbe).not.toBeNull();
	});

	it("works for english subject", () => {
		const r = gradeStudentAnswer(
			"it is therefore correct",
			"english",
			"grammar",
		);
		expect(r.level).toBe("correct");
	});

	it("works for chinese subject", () => {
		const r = gradeStudentAnswer("所以答案是 8", "chinese", "writing");
		expect(r.level).toBe("correct");
	});

	it("single CJK char answer → partial with low score", () => {
		const r = gradeStudentAnswer("好", "chinese", "writing");
		expect(r.level).toBe("partial");
		expect(r.score).toBeLessThan(0.5);
	});

	it("two latin words without conclusion → partial mid score", () => {
		const r = gradeStudentAnswer("hello world", "english", "vocabulary");
		expect(r.level).toBe("partial");
		expect(r.score).toBeGreaterThanOrEqual(0.5);
		expect(r.score).toBeLessThan(0.9);
	});

	it("multi CJK chars without conclusion → partial mid score", () => {
		const r = gradeStudentAnswer(
			"读完了",
			"chinese",
			"reading_comprehension",
		);
		expect(r.level).toBe("partial");
		expect(r.score).toBeGreaterThanOrEqual(0.5);
		expect(r.score).toBeLessThan(0.9);
	});
});

describe("buildSocraticSession", () => {
	it("returns full session for math word problem", () => {
		const s = buildSocraticSession(
			"应用题：小明有3个苹果，吃了1个，还剩几个",
		);
		expect(s.subject).toBe("math");
		expect(s.topic).toBe("word_problem");
		expect(s.starterQuestion.length).toBeGreaterThan(0);
		expect(s.hintChain).toHaveLength(3);
	});

	it("defaults to math when no subject detected", () => {
		const s = buildSocraticSession("12345");
		expect(s.subject).toBe("math");
	});

	it("includes probes for topics that have them", () => {
		const s = buildSocraticSession("应用题：小明3个苹果");
		expect(s.probes.length).toBeGreaterThan(0);
	});

	it("includes empty probes for topics without bank", () => {
		// Pick a topic not in bank for a subject
		const s = buildSocraticSession("科学：植物生长");
		expect(s.subject).toBe("science");
	});
});

describe("HomeworkHelperAgent", () => {
	const agent = createHomeworkHelperAgent();
	const ctx = {
		memory: null as unknown as import("@parenting/memory").MemoryLayer,
	};

	it("hint intent with no subject detected defaults to math fallback", async () => {
		const r = await agent.respond("第2级提示", makeChild(), ctx);
		expect(r.content).toContain("第 2 级");
		expect(r.content).toContain("math");
	});

	it("hint intent with 第1级 returns level 1", async () => {
		const r = await agent.respond("数学：第1级提示", makeChild(), ctx);
		expect(r.content).toContain("第 1 级");
	});

	it("hint intent defaults to level 1 when no number", async () => {
		const r = await agent.respond("数学：再提示", makeChild(), ctx);
		expect(r.content).toContain("第 1 级");
	});

	it("probe intent returns probes for a known problem", async () => {
		const r = await agent.respond(
			"数学应用题再来一个追问",
			makeChild(),
			ctx,
		);
		expect(r.content).toContain("追问");
	});

	it("problem intent returns session", async () => {
		const r = await agent.respond("数学题不会做：3+5=?", makeChild(), ctx);
		expect(r.content).toContain("苏格拉底");
	});

	it("session intent returns session", async () => {
		const r = await agent.respond("这道题的思路", makeChild(), ctx);
		expect(r.content).toContain("苏格拉底");
	});

	it("general intent returns intro", async () => {
		const r = await agent.respond("你好", makeChild(), ctx);
		expect(r.content).toContain("作业引导师");
		expect(r.confidence).toBeLessThan(0.6);
	});

	it("english problem returns English session", async () => {
		const r = await agent.respond(
			"英语题不会做：单词背不下来",
			makeChild(),
			ctx,
		);
		expect(r.content).toContain("english");
	});

	it("chinese problem returns Chinese session", async () => {
		const r = await agent.respond("语文作文怎么开头", makeChild(), ctx);
		expect(r.content).toContain("chinese");
	});
});

describe("createHomeworkHelperAgent factory", () => {
	it("returns an agent instance", () => {
		const a = createHomeworkHelperAgent();
		expect(a.id).toBe("homework-helper");
		expect(a.name).toBe("作业引导师");
	});
});
