import { describe, expect, it } from "vitest";
import {
	EducatorAgent,
	getEduStage,
	detectLearningStyle,
	detectInterests,
	suggestActivities,
} from "../src/index.js";
import type { ChildProfile } from "@parenting/memory";

const TODAY = new Date("2026-06-19T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const makeChild = (ageDays: number, id = "c1", name = "TestChild", stage?: ChildProfile["stage"]): ChildProfile => ({
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
			const reply = await agent.respond("8岁孩子学什么", makeChild(365 * 8, "c", "Kid", "school_age"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("小学");
			expect(reply.content).toContain("语文");
		});

		it("returns preschool stage for 4-year-old", async () => {
			const reply = await agent.respond("4岁孩子应该学什么", makeChild(365 * 4, "c", "Kid", "preschool"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("学前");
		});

		it("returns college stage for 20-year-old", async () => {
			const reply = await agent.respond("大学阶段怎么规划", makeChild(365 * 20, "c", "Kid", "young_adult"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("大学");
		});
	});

	describe("learning style queries", () => {
		it("detects and returns visual style", async () => {
			const reply = await agent.respond("孩子喜欢看图记东西", makeChild(365 * 8, "c", "Kid", "school_age"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("视觉");
		});

		it("asks for more info when style unclear", async () => {
			const reply = await agent.respond("孩子学习风格", makeChild(365 * 8, "c", "Kid", "school_age"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});

	describe("interest queries", () => {
		it("returns STEM activities for programming interest", async () => {
			const reply = await agent.respond("孩子对编程感兴趣", makeChild(365 * 8, "c", "Kid", "school_age"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("理工科");
		});

		it("returns arts activities for painting interest", async () => {
			const reply = await agent.respond("孩子喜欢画画", makeChild(365 * 5, "c", "Kid", "preschool"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("艺术");
		});
	});

	describe("activity queries", () => {
		it("suggests activities for 5-year-old", async () => {
			const reply = await agent.respond("5岁孩子玩什么好", makeChild(365 * 5, "c", "Kid", "preschool"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("活动");
		});
	});

	describe("subject queries", () => {
		it("returns elementary subjects for 8-year-old math question", async () => {
			const reply = await agent.respond("8岁孩子数学怎么学", makeChild(365 * 8, "c", "Kid", "school_age"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("语文");
		});

		it("returns preschool-appropriate message for 3-year-old subject question", async () => {
			const reply = await agent.respond("3岁孩子数学怎么学", makeChild(365 * 3, "c", "Kid", "preschool"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/学龄前|游戏/);
		});
	});

	describe("general queries", () => {
		it("introduces itself for vague questions", async () => {
			const reply = await agent.respond("你好", makeChild(365 * 5, "c", "Kid", "preschool"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("教育规划师");
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});
});
