import { describe, expect, it } from "vitest";
import {
	CareerAgent,
	createCareerAgent,
	CAREER_TIPS,
	getTipsForStage,
	matchTopic,
} from "../src/index.js";
import type { ChildProfile } from "@parenting/memory";

const TODAY = new Date("2026-06-20T00:00:00Z");
const daysAgo = (n: number): string =>
	new Date(TODAY.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const makeChild = (ageDays: number, stage: ChildProfile["stage"]): ChildProfile => ({
	id: "test-child",
	name: "测试",
	birthDate: daysAgo(ageDays),
	stage,
});

describe("Knowledge: career tips", () => {
	it("returns tips for teen stage", () => {
		expect(getTipsForStage("teen").length).toBeGreaterThan(0);
	});
	it("returns tips for young_adult", () => {
		expect(getTipsForStage("young_adult").length).toBeGreaterThan(0);
	});
	it("returns empty for preschool", () => {
		expect(getTipsForStage("preschool")).toEqual([]);
	});
	it("filters by topic", () => {
		const tips = getTipsForStage("young_adult", "resume");
		expect(tips.length).toBe(1);
	});
	it("CAREER_TIPS has expected structure", () => {
		for (const tip of CAREER_TIPS) {
			expect(tip.topic).toBeTruthy();
			expect(tip.stage.length).toBeGreaterThan(0);
			expect(tip.advice.length).toBeGreaterThan(0);
		}
	});
});

describe("Knowledge: matchTopic", () => {
	it("matches exploration", () => expect(matchTopic("职业探索")).toBe("exploration"));
	it("matches internship", () => expect(matchTopic("实习机会")).toBe("internship"));
	it("matches resume", () => expect(matchTopic("简历写作")).toBe("resume"));
	it("matches interview", () => expect(matchTopic("面试准备")).toBe("interview"));
	it("matches networking", () => expect(matchTopic("LinkedIn人脉")).toBe("networking"));
	it("matches skills", () => expect(matchTopic("学什么技能")).toBe("skills"));
	it("matches first_job", () => expect(matchTopic("第一份工作")).toBe("first_job"));
	it("returns null for unrelated", () => expect(matchTopic("宝宝发烧")).toBeNull());
});

describe("CareerAgent — Agent interface", () => {
	it("has correct id and name", () => {
		const a = createCareerAgent();
		expect(a.id).toBe("career");
		expect(a.name).toBe("职业规划顾问");
	});
	it("has education topic", () => {
		expect(createCareerAgent().topics).toEqual(["education"]);
	});
	it("supports teen and young_adult", () => {
		const stages = createCareerAgent().stages;
		expect(stages).toContain("teen");
		expect(stages).toContain("young_adult");
	});
});

describe("CareerAgent — topic queries", () => {
	const agent = createCareerAgent();
	const ctx = { memory: undefined } as any;

	it("returns exploration tips", async () => {
		const r = await agent.respond("职业探索", makeChild(365 * 16, "teen"), ctx);
		expect(r.content).toMatch(/职业/);
		expect(r.confidence).toBe(0.85);
	});

	it("returns internship tips", async () => {
		const r = await agent.respond("实习机会", makeChild(365 * 20, "young_adult"), ctx);
		expect(r.content).toMatch(/实习/);
	});

	it("returns resume tips", async () => {
		const r = await agent.respond("简历写作", makeChild(365 * 22, "young_adult"), ctx);
		expect(r.content).toMatch(/简历|resume/);
	});

	it("returns interview tips", async () => {
		const r = await agent.respond("面试准备", makeChild(365 * 22, "young_adult"), ctx);
		expect(r.content).toMatch(/面试/);
	});

	it("returns networking tips", async () => {
		const r = await agent.respond("LinkedIn人脉", makeChild(365 * 22, "young_adult"), ctx);
		expect(r.content).toMatch(/人脉|linkedin/);
	});

	it("returns skills tips", async () => {
		const r = await agent.respond("学什么技能", makeChild(365 * 18, "teen"), ctx);
		expect(r.content).toMatch(/技能/);
	});

	it("returns first_job tips", async () => {
		const r = await agent.respond("第一份工作", makeChild(365 * 22, "young_adult"), ctx);
		expect(r.content).toMatch(/工作/);
	});
});

describe("CareerAgent — general fallback", () => {
	const agent = createCareerAgent();
	const ctx = { memory: undefined } as any;

	it("introduces itself for teen vague question", async () => {
		const r = await agent.respond("你好", makeChild(365 * 17, "teen"), ctx);
		expect(r.content).toContain("职业规划顾问");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns help when no tips for preschool", async () => {
		const r = await agent.respond("你好", makeChild(365 * 4, "preschool"), ctx);
		expect(r.content).toContain("职业规划顾问");
		expect(r.confidence).toBeLessThan(0.5);
	});

	it("returns help for unrelated with teen stage", async () => {
		const r = await agent.respond("xyz123", makeChild(365 * 16, "teen"), ctx);
		expect(r.content).toContain("职业规划顾问");
	});

	it("returns intro for preschool", async () => {
		const r = await agent.respond("anything", makeChild(365 * 4, "preschool"), ctx);
		expect(r.content).toContain("职业规划顾问");
	});
});

describe("CareerAgent — factory and stage undefined", () => {
	it("createCareerAgent returns working agent", async () => {
		const a = createCareerAgent();
		const r = await a.respond("实习", {
			id: "c1",
			name: "Test",
			birthDate: "2000-06-19",
			stage: "young_adult",
		}, { memory: undefined as any });
		expect(r.agentId).toBe("career");
	});

	it("computes stage when child.stage is undefined", async () => {
		const child = {
			id: "c1",
			name: "Test",
			birthDate: "2000-06-19",
			stage: undefined as unknown as "young_adult",
		};
		const r = await createCareerAgent().respond("实习", child, { memory: undefined as any });
		expect(r.agentId).toBe("career");
	});
});
