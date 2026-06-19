import { describe, expect, it } from "vitest";
import {
	FamilyMediatorAgent,
	createFamilyMediatorAgent,
	getFamilyGuidance,
	matchFamilyIssue,
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

describe("Knowledge: family issue matching", () => {
	it("matches couple conflict", () => {
		const issue = matchFamilyIssue("我们夫妻育儿理念不一致");
		expect(issue?.id).toBe("couple_conflict");
	});

	it("matches grandparent interference", () => {
		const issue = matchFamilyIssue("爷爷奶奶总是惯着孩子");
		expect(issue?.id).toBe("grandparent_interference");
	});

	it("matches sibling rivalry", () => {
		const issue = matchFamilyIssue("老大和弟弟老是抢玩具");
		expect(issue?.id).toBe("sibling_rivalry");
	});

	it("matches divorce", () => {
		const issue = matchFamilyIssue("我们要离婚了孩子怎么办");
		expect(issue?.id).toBe("divorce");
	});

	it("matches single parent", () => {
		const issue = matchFamilyIssue("单亲家庭如何育儿");
		expect(issue?.id).toBe("single_parent");
	});

	it("matches blended family", () => {
		const issue = matchFamilyIssue("重组家庭如何适应");
		expect(issue?.id).toBe("blended_family");
	});

	it("matches in-law conflict", () => {
		const issue = matchFamilyIssue("婆媳关系");
		expect(issue?.id).toBe("in_law_conflict");
	});

	it("matches communication", () => {
		const issue = matchFamilyIssue("家庭沟通技巧");
		expect(issue?.id).toBe("communication");
	});

	it("returns null for unrelated text", () => {
		const issue = matchFamilyIssue("今天天气真好");
		expect(issue).toBeNull();
	});
});

describe("Knowledge: getFamilyGuidance", () => {
	it("returns guidance by id", () => {
		const g = getFamilyGuidance("couple_conflict");
		expect(g).not.toBeNull();
		expect(g?.id).toBe("couple_conflict");
	});

	it("returns null for unknown id", () => {
		expect(getFamilyGuidance("unknown" as never)).toBeNull();
	});
});

describe("FamilyMediatorAgent", () => {
	const agent = new FamilyMediatorAgent();

	describe("metadata", () => {
		it("has correct id and name", () => {
			expect(agent.id).toBe("family-mediator");
			expect(agent.name).toBe("家庭关系调解员");
		});

		it("handles family topic", () => {
			expect(agent.topics).toContain("family");
		});
	});

	describe("couple conflict", () => {
		it("returns couple conflict guidance", async () => {
			const reply = await agent.respond("我们夫妻育儿理念不一致", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("夫妻冲突");
			expect(reply.content).toContain("应对策略");
		});
	});

	describe("grandparent conflict", () => {
		it("returns grandparent guidance", async () => {
			const reply = await agent.respond("爷爷奶奶总是惯着孩子", makeChild(365 * 2, "c", "Kid", "toddler"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("隔代");
		});
	});

	describe("sibling rivalry", () => {
		it("returns sibling rivalry guidance", async () => {
			const reply = await agent.respond("老大和弟弟抢东西", makeChild(365 * 4, "c", "Kid", "preschool"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("同胞");
		});
	});

	describe("divorce", () => {
		it("returns divorce guidance", async () => {
			const reply = await agent.respond("我们要离婚了", makeChild(365 * 5, "c", "Kid", "school_age"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("离婚");
		});
	});

	describe("communication", () => {
		it("returns communication principles", async () => {
			const reply = await agent.respond("家庭沟通技巧", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("家庭会议");
		});
	});

	describe("unmatched family intent", () => {
		it("asks for more info when no specific issue detected", async () => {
			const reply = await agent.respond("家庭出了点问题", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("请描述");
			expect(reply.confidence).toBeLessThan(0.6);
		});
	});

	describe("general queries", () => {
		it("introduces itself for vague questions", async () => {
			const reply = await agent.respond("你好", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("家庭关系调解员");
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});

	describe("factory and edge cases", () => {
		it("createFamilyMediatorAgent returns a working agent", async () => {
			const a = createFamilyMediatorAgent();
			expect(a.id).toBe("family-mediator");
			const reply = await a.respond("婆媳关系", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("family-mediator");
		});

		it("computes stage when child.stage is undefined", async () => {
			const childWithoutStage = {
				id: "c1",
				name: "Test",
				birthDate: "2024-06-19",
				stage: undefined as unknown as "toddler",
			};
			const reply = await agent.respond("婆媳关系", childWithoutStage, {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("family-mediator");
		});
	});
});
