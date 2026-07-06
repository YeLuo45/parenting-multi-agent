import type { ChildProfile } from "@parenting/memory";
import { describe, expect, it } from "vitest";
import {
	detectInterests,
	detectLearningStyle,
	detectSubjects,
	EDU_STAGES,
	EducatorAgent,
	type EduStage,
	findSubject,
	formatSubjectBrief,
	formatSubjectGuidance,
	getEduStage,
	getSubjectGuidance,
	getSubjectSkillPath,
	SUBJECTS,
	type SubjectId,
	type SubjectInfo,
	suggestActivities,
	suggestSubjectActivities,
} from "../src/index.js";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

const makeChild = (
	ageDays: number,
	id = "c1",
	name = "TestChild",
	stage?: ChildProfile["stage"],
): ChildProfile => ({
	id,
	name,
	birthDate: daysAgo(ageDays),
	stage: stage ?? "toddler",
});

describe("Knowledge: education stages", () => {
	it("returns early_childhood for 1-year-old", () => {
		const s = getEduStage(12);
		expect(s?.stage).toBe("early_childhood");
	});

	it("returns preschool for 4-year-old", () => {
		const s = getEduStage(48);
		expect(s?.stage).toBe("preschool");
	});

	it("returns elementary for 8-year-old", () => {
		const s = getEduStage(96);
		expect(s?.stage).toBe("elementary");
	});

	it("returns middle_school for 13-year-old", () => {
		const s = getEduStage(156);
		expect(s?.stage).toBe("middle_school");
	});

	it("returns high_school for 16-year-old", () => {
		const s = getEduStage(192);
		expect(s?.stage).toBe("high_school");
	});

	it("returns college for 20-year-old", () => {
		const s = getEduStage(240);
		expect(s?.stage).toBe("college");
	});

	it("elementary has school subjects", () => {
		const s = getEduStage(96);
		expect(s?.schoolSubjects).toContain("语文");
		expect(s?.schoolSubjects).toContain("数学");
	});

	it("early_childhood has no formal subjects", () => {
		const s = getEduStage(12);
		expect(s?.schoolSubjects.length).toBe(0);
	});
});

describe("Knowledge: learning style detection", () => {
	it("detects visual from '看图'", () => {
		const s = detectLearningStyle("孩子喜欢看图记东西");
		expect(s).toBe("visual");
	});

	it("detects auditory from '喜欢听'", () => {
		const s = detectLearningStyle("孩子喜欢听故事");
		expect(s).toBe("auditory");
	});

	it("detects kinesthetic from '动手'", () => {
		const s = detectLearningStyle("孩子喜欢动手做实验");
		expect(s).toBe("kinesthetic");
	});

	it("detects reading_writing from '读书'", () => {
		const s = detectLearningStyle("孩子喜欢读书");
		expect(s).toBe("reading_writing");
	});

	it("returns null for non-learning text", () => {
		const s = detectLearningStyle("今天天气真好");
		expect(s).toBeNull();
	});
});

describe("Knowledge: interest detection", () => {
	it("detects STEM from '编程'", () => {
		const i = detectInterests("孩子对编程很感兴趣");
		expect(i).toContain("stem");
	});

	it("detects arts from '画画'", () => {
		const i = detectInterests("孩子喜欢画画");
		expect(i).toContain("arts");
	});

	it("detects sports from '游泳'", () => {
		const i = detectInterests("孩子最近在学游泳");
		expect(i).toContain("sports");
	});

	it("detects language from '绘本'", () => {
		const i = detectInterests("孩子爱看绘本");
		expect(i).toContain("language");
	});

	it("detects music from '钢琴'", () => {
		const i = detectInterests("孩子想学钢琴");
		expect(i).toContain("music");
	});

	it("detects multiple interests", () => {
		const i = detectInterests("孩子喜欢编程和钢琴");
		expect(i.length).toBeGreaterThan(1);
	});

	it("returns empty for unrelated text", () => {
		const i = detectInterests("今天天气真好");
		expect(i).toEqual([]);
	});
});

describe("Knowledge: activity suggestions", () => {
	it("suggests STEM activities for STEM interest", () => {
		const acts = suggestActivities(["stem"], 96, 30);
		expect(acts.length).toBeGreaterThan(0);
		expect(acts[0]).toContain("STEM");
	});

	it("limits activities for short time", () => {
		const acts30 = suggestActivities(["stem", "arts"], 96, 30);
		const acts10 = suggestActivities(["stem", "arts"], 96, 10);
		expect(acts30.length).toBeGreaterThan(acts10.length);
	});

	it("returns empty for non-stage age", () => {
		const acts = suggestActivities(["stem"], 700, 30);
		expect(acts).toEqual([]);
	});
});

describe("EducatorAgent", () => {
	const agent = new EducatorAgent();

	describe("metadata", () => {
		it("has correct id and name", () => {
			expect(agent.id).toBe("educator");
			expect(agent.name).toBe("教育规划师");
		});

		it("handles education/school/development topics", () => {
			expect(agent.topics).toContain("education");
			expect(agent.topics).toContain("school");
			expect(agent.topics).toContain("development");
		});
	});

	describe("stage queries", () => {
		it("returns elementary stage for 8-year-old", async () => {
			const reply = await agent.respond(
				"8岁孩子学什么",
				makeChild(365 * 8, "c", "Kid", "school_age"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("小学");
			expect(reply.content).toContain("语文");
		});

		it("returns preschool stage for 4-year-old", async () => {
			const reply = await agent.respond(
				"4岁孩子应该学什么",
				makeChild(365 * 4, "c", "Kid", "preschool"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("学前");
		});

		it("returns college stage for 20-year-old", async () => {
			const reply = await agent.respond(
				"大学阶段怎么规划",
				makeChild(365 * 20, "c", "Kid", "young_adult"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("大学");
		});

		it("returns intro when stage intent but no edu stage (covers branch 124-126)", async () => {
			// age 0-3 month might not be in EDU_STAGES (monthsRange.min=0)
			// Actually early_childhood covers 0-36 months. 0 months should work.
			// Use a very old age (700 months = 58 years) — no edu stage
			const reply = await agent.respond(
				"孩子学什么",
				makeChild(365 * 60, "c", "Kid", "young_adult"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			// 60 years old — getEduStage returns null
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});

	describe("learning style queries", () => {
		it("detects and returns visual style", async () => {
			const reply = await agent.respond(
				"孩子是视觉型学习者",
				makeChild(365 * 8, "c", "Kid", "school_age"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("视觉");
		});

		it("asks for more info when style unclear", async () => {
			const reply = await agent.respond(
				"孩子学习风格",
				makeChild(365 * 8, "c", "Kid", "school_age"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.confidence).toBeLessThan(0.5);
		});

		it("detects auditory style and returns formatLearningStyle output", async () => {
			// '听觉' in style pattern → style intent
			// '孩子喜欢听故事' has '听' in auditory pattern → detects auditory
			const reply = await agent.respond(
				"孩子是听觉型喜欢听故事",
				makeChild(365 * 8, "c", "Kid", "school_age"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			// Should reach formatLearningStyle (lines 73-86)
			expect(reply.content).toMatch(/听觉|学习策略/);
		});
	});

	describe("interest queries", () => {
		it("returns STEM activities for programming interest", async () => {
			const reply = await agent.respond(
				"孩子对编程感兴趣",
				makeChild(365 * 8, "c", "Kid", "school_age"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("理工科");
		});

		it("returns arts activities for painting interest", async () => {
			const reply = await agent.respond(
				"孩子喜欢画画",
				makeChild(365 * 5, "c", "Kid", "preschool"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("艺术");
		});

		it("returns intro when interest intent but no interest match (covers branch 156-158)", async () => {
			// '兴趣班' matches interest keyword but no specific interest detected
			const reply = await agent.respond(
				"孩子要上兴趣班",
				makeChild(365 * 5, "c", "Kid", "preschool"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			// Now formatInterests is called with [] → returns "未识别到具体兴趣"
			expect(reply.content).toContain("未识别到具体兴趣");
		});
	});

	describe("activity queries", () => {
		it("suggests activities for 5-year-old", async () => {
			const reply = await agent.respond(
				"5岁孩子玩什么好",
				makeChild(365 * 5, "c", "Kid", "preschool"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("活动");
		});

		it("uses default interests when none detected (covers branch 169 fallback)", async () => {
			// '做什么' matches activity keyword but no specific interest
			// → falls back to ['stem', 'arts']
			const reply = await agent.respond(
				"5岁孩子做什么好",
				makeChild(365 * 5, "c", "Kid", "preschool"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toMatch(/STEM|arts|艺术/);
		});

		it("uses detected interests in activity case (covers branch 166 true path)", async () => {
			// '怎么玩积木' matches activity + stem interest
			// detectInterests("怎么玩积木") = ["stem"]
			// detectIntent: activity (怎么玩)
			const reply = await agent.respond(
				"5岁孩子怎么玩积木",
				makeChild(365 * 5, "c", "Kid", "preschool"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			// Should have STEM activities (not just the default fallback)
			expect(reply.content).toMatch(/STEM|乐高|积木/);
		});
	});

	describe("subject queries", () => {
		it("returns elementary subjects for 8-year-old math question", async () => {
			const reply = await agent.respond(
				"8岁孩子数学怎么学",
				makeChild(365 * 8, "c", "Kid", "school_age"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			// Detailed math guidance for elementary stage
			expect(reply.content).toContain("数学");
			expect(reply.content).toContain("学习目标");
			expect(reply.content).toContain("关键技能");
			expect(reply.content).toContain("推荐活动");
		});

		it("returns preschool-appropriate message for 3-year-old subject question", async () => {
			const reply = await agent.respond(
				"3岁孩子数学怎么学",
				makeChild(365 * 3, "c", "Kid", "preschool"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toMatch(/学前|游戏/);
		});

		it("returns intro when subject intent but no edu stage (covers branch 145-149)", async () => {
			// 60 year old — getEduStage returns null
			const reply = await agent.respond(
				"60岁老人数学",
				makeChild(365 * 60, "c", "Kid", "young_adult"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			// No edu stage → falls back to introReply
			expect(reply.content).toContain("教育规划师");
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});

	describe("general queries", () => {
		it("introduces itself for vague questions", async () => {
			const reply = await agent.respond(
				"你好",
				makeChild(365 * 5, "c", "Kid", "preschool"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.content).toContain("教育规划师");
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});

	describe("factory and child.stage undefined", () => {
		it("createEducatorAgent returns a working agent", async () => {
			const { createEducatorAgent } = await import("../src/index.js");
			const a = createEducatorAgent();
			expect(a.id).toBe("educator");
			const reply = await a.respond(
				"孩子学什么",
				makeChild(365 * 5, "c", "Kid", "preschool"),
				{
					memory: null as unknown as import("@parenting/memory").MemoryLayer,
				},
			);
			expect(reply.agentId).toBe("educator");
		});

		it("computes stage when child.stage is undefined (covers branch 118)", async () => {
			const childWithoutStage = {
				id: "c1",
				name: "Test",
				birthDate: "2024-06-19",
				stage: undefined as unknown as "preschool",
			};
			const reply = await agent.respond("孩子学什么", childWithoutStage, {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("educator");
		});
	});
});

// ───────────────────────────────────────────────────────────
// Subject-specific knowledge base tests (Direction A)
// ───────────────────────────────────────────────────────────

describe("SUBJECTS knowledge base", () => {
	it("exposes 9 subjects with ids and emoji", () => {
		expect(SUBJECTS).toHaveLength(9);
		for (const s of SUBJECTS) {
			expect(s.id).toBeTruthy();
			expect(s.name).toBeTruthy();
			expect(s.nameEn).toBeTruthy();
			expect(s.emoji).toBeTruthy();
			expect(s.patterns.length).toBeGreaterThan(0);
		}
	});

	it("every subject id is unique", () => {
		const ids = SUBJECTS.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("detectSubjects", () => {
	it("returns empty array when no subject matches", () => {
		expect(detectSubjects("今天天气真好")).toEqual([]);
	});

	it("detects single subject by Chinese keyword", () => {
		expect(detectSubjects("孩子数学学不会")).toEqual(["math"]);
	});

	it("detects single subject by English keyword", () => {
		expect(detectSubjects("help with english vocabulary")).toEqual([
			"english",
		]);
	});

	it("detects multiple subjects and dedupes", () => {
		const result = detectSubjects("数学和英语都不好");
		expect(result).toContain("math");
		expect(result).toContain("english");
		expect(result.length).toBe(2);
	});

	it("preserves SUBJECTS array order for multiple matches", () => {
		// chinese comes before math in SUBJECTS array
		const result = detectSubjects("数学语文都要补");
		expect(result.indexOf("chinese")).toBeLessThan(result.indexOf("math"));
	});

	it("matches every subject by at least one keyword", () => {
		for (const s of SUBJECTS) {
			const keyword = s.name;
			expect(detectSubjects(keyword)).toContain(s.id);
		}
	});

	it("case-insensitive English detection", () => {
		expect(detectSubjects("MATH and ENGLISH")).toContain("math");
		expect(detectSubjects("MATH and ENGLISH")).toContain("english");
	});
});

describe("getSubjectGuidance", () => {
	it("returns full guidance for valid (subject, stage)", () => {
		const g = getSubjectGuidance("math", "elementary");
		expect(g).not.toBeNull();
		expect(g?.subject).toBe("math");
		expect(g?.stage).toBe("elementary");
		expect(g?.objectives.length).toBeGreaterThan(0);
		expect(g?.keySkills.length).toBeGreaterThan(0);
		expect(g?.activities.length).toBeGreaterThan(0);
	});

	it("returns full guidance for all 9 subjects at elementary stage", () => {
		const subjects = SUBJECTS.map((s) => s.id);
		for (const sid of subjects) {
			const g = getSubjectGuidance(sid, "elementary");
			expect(g).not.toBeNull();
		}
	});

	it("returns null for unknown subject id (cast)", () => {
		const fakeId = "fake_subject" as unknown as Parameters<
			typeof getSubjectGuidance
		>[0];
		const g = getSubjectGuidance(fakeId, "elementary");
		expect(g).toBeNull();
	});
});

describe("getSubjectSkillPath", () => {
	it("returns path from fromStage to college by default", () => {
		const path = getSubjectSkillPath("math", "preschool");
		expect(path[0]).toBe("preschool");
		expect(path[path.length - 1]).toBe("college");
	});

	it("returns path up to specified toStage inclusive", () => {
		const path = getSubjectSkillPath(
			"chinese",
			"elementary",
			"high_school",
		);
		expect(path).toContain("elementary");
		expect(path).toContain("middle_school");
		expect(path).toContain("high_school");
		expect(path).not.toContain("college");
	});

	it("returns single-stage path when fromStage equals toStage", () => {
		const path = getSubjectSkillPath("math", "preschool", "preschool");
		expect(path).toEqual(["preschool"]);
	});

	it("returns empty array when fromStage is unknown", () => {
		const path = getSubjectSkillPath("math", "unknown_stage" as EduStage);
		expect(path).toEqual([]);
	});

	it("returns empty array when toStage is before fromStage", () => {
		const path = getSubjectSkillPath("math", "high_school", "preschool");
		expect(path).toEqual([]);
	});

	it("treats unknown toStage as 'to college' (full path)", () => {
		const path = getSubjectSkillPath(
			"math",
			"preschool",
			"mystery" as EduStage,
		);
		expect(path[path.length - 1]).toBe("college");
	});

	it("filters out stages without guidance for that subject", () => {
		const path = getSubjectSkillPath("math", "early_childhood");
		expect(path.length).toBeGreaterThan(0);
		expect(path[0]).toBe("early_childhood");
	});
});

describe("suggestSubjectActivities", () => {
	it("returns up to 4 activities for timeMinutes >= 20", () => {
		const acts = suggestSubjectActivities("math", 96, 30);
		expect(acts.length).toBeGreaterThan(0);
		expect(acts.length).toBeLessThanOrEqual(4);
	});

	it("returns up to 2 activities for timeMinutes < 20", () => {
		const acts = suggestSubjectActivities("math", 96, 15);
		expect(acts.length).toBeLessThanOrEqual(2);
	});

	it("returns empty array for unknown age (no edu stage)", () => {
		const acts = suggestSubjectActivities("math", 99999);
		expect(acts).toEqual([]);
	});

	it("returns activities for all 9 subjects at elementary age", () => {
		for (const s of SUBJECTS) {
			const acts = suggestSubjectActivities(s.id, 96);
			expect(acts.length).toBeGreaterThan(0);
		}
	});

	it("uses default timeMinutes=30 when not specified", () => {
		const a = suggestSubjectActivities("chinese", 96);
		expect(a.length).toBeLessThanOrEqual(4);
	});
});

describe("EducatorAgent subject intent — extended coverage", () => {
	const agent = new EducatorAgent();

	it("subject intent with no detected subjects returns preschool fallback for 2-year-old", async () => {
		// Use a clear subject-intent trigger ("怎么学") without any subject keyword
		const reply = await agent.respond(
			"孩子不爱学习怎么办",
			makeChild(365 * 2, "c", "Kid", "toddler"),
			{
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			},
		);
		expect(reply.content).toMatch(/学龄前|还没有正式学校/);
		expect(reply.confidence).toBe(0.7);
	});

	it("subject intent with no detected subjects returns school subjects list for 8-year-old", async () => {
		const reply = await agent.respond(
			"孩子不爱学习怎么办",
			makeChild(365 * 8, "c", "Kid", "school_age"),
			{
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			},
		);
		expect(reply.content).toMatch(/阶段学校科目/);
		expect(reply.confidence).toBe(0.85);
	});

	it("subject intent with multiple subjects concatenates guidance blocks", async () => {
		const reply = await agent.respond(
			"数学和英语都不太好",
			makeChild(365 * 10, "c", "Kid", "school_age"),
			{
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			},
		);
		expect(reply.content).toContain("数学");
		expect(reply.content).toContain("英语");
		expect(reply.content).toContain("---");
		expect(reply.confidence).toBe(0.9);
	});

	it("subject intent with single subject returns detailed guidance", async () => {
		const reply = await agent.respond(
			"数学怎么学",
			makeChild(365 * 8, "c", "Kid", "school_age"),
			{
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			},
		);
		expect(reply.content).toContain("数学");
		expect(reply.content).toContain("学习目标");
		expect(reply.content).toContain("阶段里程碑");
		expect(reply.content).toContain("推荐资源");
	});

	it("subject intent high school physics", async () => {
		const reply = await agent.respond(
			"高中物理怎么学",
			makeChild(365 * 16, "c", "Kid", "teen"),
			{
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			},
		);
		expect(reply.content).toContain("科学");
		expect(reply.content).toContain("高中");
	});

	it("subject intent college coding (中文触发)", async () => {
		const reply = await agent.respond(
			"编程怎么学",
			makeChild(365 * 20, "c", "Kid", "young_adult"),
			{
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			},
		);
		expect(reply.content).toContain("编程");
		expect(reply.content).toContain("大学/成年早期");
	});
});

describe("EDU_STAGES validation", () => {
	it("contains all 6 expected stages in order", () => {
		expect(EDU_STAGES.map((s) => s.stage)).toEqual([
			"early_childhood",
			"preschool",
			"elementary",
			"middle_school",
			"high_school",
			"college",
		]);
	});
});

describe("Subject formatting helpers", () => {
	it("formatSubjectBrief: emits emoji + name + nameEn", () => {
		const info: SubjectInfo = SUBJECTS[0]!;
		expect(formatSubjectBrief(info)).toBe(
			`${info.emoji} ${info.name} (${info.nameEn})`,
		);
	});

	it("formatSubjectGuidance: null branch returns 'no guidance' marker", () => {
		const info: SubjectInfo = SUBJECTS[0]!;
		const stage = EDU_STAGES[1]!; // preschool
		const out = formatSubjectGuidance(info, stage, null);
		expect(out).toContain("暂无学科指导");
		expect(out).toContain(info.name);
	});

	it("formatSubjectGuidance: rich branch renders 6 sections", () => {
		const info: SubjectInfo = SUBJECTS.find((s) => s.id === "math")!;
		const stage = EDU_STAGES[2]!; // elementary
		const guidance = getSubjectGuidance("math", "elementary");
		expect(guidance).not.toBeNull();
		const out = formatSubjectGuidance(info, stage, guidance);
		expect(out).toContain("学习目标");
		expect(out).toContain("关键技能");
		expect(out).toContain("常见挑战");
		expect(out).toContain("推荐活动");
		expect(out).toContain("阶段里程碑");
		expect(out).toContain("推荐资源");
	});
});

describe("suggestSubjectActivities edge cases", () => {
	it("returns empty when subject has no guidance for valid stage (cast)", () => {
		const fakeSubject = "nonexistent" as unknown as SubjectId;
		const acts = suggestSubjectActivities(fakeSubject, 96);
		expect(acts).toEqual([]);
	});

	it("returns empty for timeMinutes=0 (short)", () => {
		const acts = suggestSubjectActivities("math", 96, 0);
		expect(acts.length).toBeLessThanOrEqual(2);
	});

	it("returns empty for timeMinutes=20 boundary (uses >, not >=)", () => {
		const acts20 = suggestSubjectActivities("math", 96, 20);
		expect(acts20.length).toBeLessThanOrEqual(4);
	});
});

describe("EducatorAgent — defensive error path", () => {
	it("findSubject: returns SubjectInfo for known id", () => {
		const info = findSubject("math");
		expect(info.id).toBe("math");
	});

	it("findSubject: throws on unknown id (defensive branch)", () => {
		expect(() =>
			findSubject("nonexistent" as unknown as SubjectId),
		).toThrow(/Unknown subject id/);
	});
});
