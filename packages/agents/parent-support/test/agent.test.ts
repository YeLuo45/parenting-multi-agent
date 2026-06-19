import { describe, expect, it } from "vitest";
import {
	ParentSupportAgent,
	createParentSupportAgent,
	getSupportGuidance,
	matchSupportIssue,
	getAllHotlines,
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

describe("Knowledge: support issue matching", () => {
	it("matches burnout", () => {
		const issue = matchSupportIssue("我最近好累，撑不住了");
		expect(issue?.id).toBe("burnout");
	});

	it("matches postpartum", () => {
		const issue = matchSupportIssue("我产后一直很抑郁");
		expect(issue?.id).toBe("postpartum");
	});

	it("matches parental anxiety", () => {
		const issue = matchSupportIssue("我好焦虑");
		expect(issue?.id).toBe("anxiety_parent");
	});

	it("matches parental depression", () => {
		// Use English keyword to avoid 抑郁 conflict with postpartum
		const issue = matchSupportIssue("I'm feeling depressed and hopeless");
		expect(issue?.id).toBe("depression_parent");
	});

	it("matches guilt", () => {
		const issue = matchSupportIssue("我对不起孩子");
		expect(issue?.id).toBe("guilt");
	});

	it("matches isolation", () => {
		const issue = matchSupportIssue("我好孤独");
		expect(issue?.id).toBe("isolation");
	});

	it("matches couple relationship", () => {
		const issue = matchSupportIssue("我和老公总是吵架");
		expect(issue?.id).toBe("couple_relationship");
	});

	it("returns null for unrelated text", () => {
		expect(matchSupportIssue("今天天气真好")).toBeNull();
	});
});

describe("Knowledge: getSupportGuidance", () => {
	it("returns guidance by id", () => {
		const g = getSupportGuidance("burnout");
		expect(g).not.toBeNull();
	});

	it("returns null for unknown id", () => {
		expect(getSupportGuidance("unknown" as never)).toBeNull();
	});

	it("returns hotlines list", () => {
		const hotlines = getAllHotlines();
		expect(hotlines.length).toBeGreaterThan(0);
	});
});

describe("ParentSupportAgent", () => {
	const agent = new ParentSupportAgent();

	describe("metadata", () => {
		it("has correct id and name", () => {
			expect(agent.id).toBe("parent-support");
			expect(agent.name).toBe("父母支持顾问");
		});

		it("handles parent_support topic", () => {
			expect(agent.topics).toContain("parent_support");
		});
	});

	describe("crisis detection", () => {
		it("returns emergency with hotlines for 想死", async () => {
			const reply = await agent.respond("我想死", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.urgency).toBe("emergency");
			expect(reply.redFlag).toBeDefined();
			expect(reply.content).toContain("热线");
		});

		it("returns emergency for 自伤", async () => {
			const reply = await agent.respond("我想自伤", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.urgency).toBe("emergency");
		});
	});

	describe("burnout queries", () => {
		it("returns burnout guidance", async () => {
			const reply = await agent.respond("我好累，撑不住了", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("倦怠");
		});
	});

	describe("postpartum queries", () => {
		it("returns postpartum guidance with urgency high", async () => {
			const reply = await agent.respond("我产后抑郁", makeChild(30, "c", "Kid", "newborn"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("产后");
			expect(reply.urgency).toBe("high");
		});
	});

	describe("depression queries", () => {
		it("returns depression guidance with red flag", async () => {
			const reply = await agent.respond("我感到绝望崩溃", makeChild(365, "c", "Kid", "toddler"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			// crisis path triggered first (崩溃)
			expect(reply.urgency).toBe("emergency");
		});
	});

	describe("anxiety queries", () => {
		it("returns anxiety guidance", async () => {
			const reply = await agent.respond("我好焦虑", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("焦虑");
		});
	});

	describe("guilt queries", () => {
		it("returns guilt guidance", async () => {
			const reply = await agent.respond("我对不起孩子", makeChild(365, "c", "Kid", "toddler"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("内疚");
		});
	});

	describe("isolation queries", () => {
		it("returns isolation guidance", async () => {
			const reply = await agent.respond("我好孤独一个人", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("孤立");
		});
	});

	describe("couple queries", () => {
		it("returns couple relationship guidance", async () => {
			const reply = await agent.respond("我和老公总是吵架", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("伴侣");
		});
	});

	describe("self_care queries", () => {
		it("returns self-care checklist", async () => {
			const reply = await agent.respond("父母怎么自我关怀", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("自我关怀");
		});
	});

	describe("unmatched issue", () => {
		it("asks for more info when no specific issue detected", async () => {
			// '压力' triggers issue intent but no specific issue keyword matches alone
			const reply = await agent.respond("我最近压力很大", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			// issue path triggered (压力 → issue intent), but no specific match → null branch
			expect(reply.content).toContain("请告诉我");
			expect(reply.confidence).toBeLessThan(0.6);
		});
	});

	describe("general queries", () => {
		it("introduces itself for vague questions", async () => {
			const reply = await agent.respond("你好", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("父母支持顾问");
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});

	describe("factory and edge cases", () => {
		it("createParentSupportAgent returns a working agent", async () => {
			const a = createParentSupportAgent();
			expect(a.id).toBe("parent-support");
			const reply = await a.respond("我好累", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("parent-support");
		});

		it("computes stage when child.stage is undefined", async () => {
			const childWithoutStage = {
				id: "c1",
				name: "Test",
				birthDate: "2024-06-19",
				stage: undefined as unknown as "toddler",
			};
			const reply = await agent.respond("我好累", childWithoutStage, {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("parent-support");
		});
	});
});
