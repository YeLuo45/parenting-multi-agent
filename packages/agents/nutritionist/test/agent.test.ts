import { describe, expect, it } from "vitest";
import {
	NutritionistAgent,
	createNutritionistAgent,
	getFoodsForAge,
	getNextFood,
	getNutritionNeeds,
	getPickyEatingGuidance,
	getRecipesForAge,
	findRecipesWithAllergen,
	detectAllergens,
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

describe("Knowledge: food introduction", () => {
	it("returns foods due for 6-month-old (米糊, 蔬菜泥)", () => {
		const foods = getFoodsForAge(6);
		expect(foods.length).toBeGreaterThan(0);
		expect(foods.some((f) => f.food.includes("米糊"))).toBe(true);
	});

	it("returns more foods for older child", () => {
		const f6 = getFoodsForAge(6);
		const f12 = getFoodsForAge(12);
		expect(f12.length).toBeGreaterThan(f6.length);
	});

	it("next food for newborn is 米糊", () => {
		const next = getNextFood(0);
		expect(next?.food).toContain("米糊");
	});

	it("returns null for adult", () => {
		const next = getNextFood(240);
		expect(next).toBeNull();
	});
});

describe("Knowledge: nutrition needs", () => {
	it("returns 0-month needs (500 kcal, 24 oz formula)", () => {
		const n = getNutritionNeeds(0);
		expect(n.caloriesPerDay).toBe(500);
		expect(n.formulaOzPerDay).toBe(24);
	});

	it("returns 12-month needs (1000 kcal, no formula)", () => {
		const n = getNutritionNeeds(12);
		expect(n.caloriesPerDay).toBe(1000);
		expect(n.formulaOzPerDay).toBeUndefined();
	});

	it("returns 60-month needs (1500 kcal)", () => {
		const n = getNutritionNeeds(60);
		expect(n.caloriesPerDay).toBe(1500);
	});
});

describe("Knowledge: recipes", () => {
	it("returns recipes for 6-month-old", () => {
		const r = getRecipesForAge(6);
		expect(r.length).toBeGreaterThan(0);
	});

	it("returns no recipes for newborn", () => {
		const r = getRecipesForAge(0);
		expect(r.length).toBe(0);
	});

	it("finds recipes with 鸡蛋 allergen", () => {
		const r = findRecipesWithAllergen("鸡蛋");
		expect(r.length).toBeGreaterThan(0);
	});

	it("finds recipes with 牛奶 allergen", () => {
		const r = findRecipesWithAllergen("牛奶");
		expect(r.length).toBeGreaterThan(0);
	});
});

describe("Knowledge: picky eating guidance", () => {
	it("returns toddler guidance", () => {
		const g = getPickyEatingGuidance("toddler");
		expect(g).not.toBeNull();
		expect(g?.normal).toBe(true);
	});

	it("returns school_age guidance (not normal)", () => {
		const g = getPickyEatingGuidance("school_age");
		expect(g?.normal).toBe(false);
	});

	it("returns null for newborn stage", () => {
		const g = getPickyEatingGuidance("newborn");
		expect(g).toBeNull();
	});
});

describe("Knowledge: allergen detection", () => {
	it("detects 鸡蛋 in Chinese", () => {
		const a = detectAllergens("宝宝对鸡蛋过敏");
		expect(a).toContain("鸡蛋");
	});

	it("detects multiple allergens", () => {
		const a = detectAllergens("宝宝对牛奶和花生过敏");
		expect(a).toContain("牛奶");
		expect(a).toContain("花生");
	});

	it("detects English allergens", () => {
		const a = detectAllergens("Baby is allergic to milk and peanut");
		expect(a).toContain("牛奶");
		expect(a).toContain("花生");
	});

	it("returns empty for unrelated text", () => {
		const a = detectAllergens("今天天气真好");
		expect(a).toEqual([]);
	});
});

describe("NutritionistAgent", () => {
	const agent = new NutritionistAgent();

	describe("metadata", () => {
		it("has correct id and name", () => {
			expect(agent.id).toBe("nutritionist");
			expect(agent.name).toBe("营养师");
		});

		it("handles nutrition topic", () => {
			expect(agent.topics).toContain("nutrition");
		});

		it("handles all child stages", () => {
			expect(agent.stages.length).toBe(8);
		});
	});

	describe("food introduction queries", () => {
		it("returns food schedule for 7-month-old", async () => {
			const reply = await agent.respond("宝宝辅食", makeChild(210, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("米糊");
		});

		it("returns completion message for 24-month-old", async () => {
			const reply = await agent.respond("宝宝辅食", makeChild(365 * 2, "c", "Kid", "toddler"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/已完成|虾蟹/);
		});
	});

	describe("allergy queries", () => {
		it("returns advice for 鸡蛋 allergy", async () => {
			const reply = await agent.respond("宝宝对鸡蛋过敏怎么办", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("鸡蛋");
		});

		it("asks for more info when no allergen detected", async () => {
			const reply = await agent.respond("宝宝过敏了", makeChild(365, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.confidence).toBeLessThan(0.6);
		});
	});

	describe("recipe queries", () => {
		it("returns recipes for 8-month-old", async () => {
			const reply = await agent.respond("宝宝食谱", makeChild(240, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/胡萝卜|苹果|辅食/);
		});

		it("returns no recipes for newborn", async () => {
			const reply = await agent.respond("宝宝食谱", makeChild(15, "c", "Kid", "newborn"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("暂无");
		});
	});

	describe("picky eating queries", () => {
		it("returns guidance for 2-year-old picky eating", async () => {
			const reply = await agent.respond("孩子挑食怎么办", makeChild(365 * 2, "c", "Kid", "toddler"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("挑食");
		});

		it("returns guidance for newborn (no specific stage data)", async () => {
			const reply = await agent.respond("孩子挑食", makeChild(15, "c", "Kid", "newborn"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("儿科医生");
		});
	});

	describe("nutrition queries", () => {
		it("returns calorie info for 3-month-old", async () => {
			const reply = await agent.respond("宝宝每天需要多少奶量", makeChild(90, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toMatch(/\d+\s*kcal|\d+\s*oz/);
		});

		it("includes nutrition notes for newborn needs", async () => {
			const reply = await agent.respond("宝宝每天需要多少奶量", makeChild(15, "c", "Kid", "newborn"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("纯母乳/配方奶");
		});

		it("returns nutrition info for older child", async () => {
			const reply = await agent.respond("宝宝需要多少蛋白质", makeChild(365 * 4, "c", "Kid", "preschool"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("蛋白质");
		});
	});

	describe("general queries", () => {
		it("introduces itself for vague questions", async () => {
			const reply = await agent.respond("你好", makeChild(90, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.content).toContain("营养师");
			expect(reply.confidence).toBeLessThan(0.5);
		});
	});

	describe("factory and child.stage undefined", () => {
		it("createNutritionistAgent returns a working agent", async () => {
			const a = createNutritionistAgent();
			expect(a.id).toBe("nutritionist");
			const reply = await a.respond("宝宝辅食", makeChild(210, "c", "Kid", "infant"), {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("nutritionist");
		});

		it("computes stage when child.stage is undefined", async () => {
			const childWithoutStage = {
				id: "c1",
				name: "Test",
				birthDate: "2024-06-19",
				stage: undefined as unknown as "toddler",
			};
			const reply = await agent.respond("宝宝辅食", childWithoutStage, {
				memory: null as unknown as import("@parenting/memory").MemoryLayer,
			});
			expect(reply.agentId).toBe("nutritionist");
		});
	});
});
