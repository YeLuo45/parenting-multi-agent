/**
 * NutritionistAgent — feeding, solid food introduction, allergies, recipes.
 *
 * Phase 2: rule-based + keyword matching. No LLM call.
 */

import { computeStage, type ChildProfile } from "@parenting/memory";
import type { Agent, AgentContext, AgentReply } from "@parenting/orchestrator";

import {
	COMMON_ALLERGENS,
	FOOD_INTRODUCTION_SCHEDULE,
	NUTRITION_NEEDS,
	PICKY_EATING_GUIDANCE,
	RECIPES,
	detectAllergens,
	getFoodsForAge,
	getNextFood,
	getNutritionNeeds,
	getPickyEatingGuidance,
	getRecipesForAge,
	findRecipesWithAllergen,
	type Allergen,
	type FoodIntroduction,
	type NutritionNeeds,
	type PickyEatingGuidance,
	type Recipe,
} from "./knowledge.js";

export const NUTRITIONIST_DISCLAIMER =
	"⚠️ 本回复仅供参考，不构成营养或医疗建议。宝宝过敏或营养问题请咨询儿科医生或注册营养师。";

function ageInMonths(birthDate: string, asOf: Date = new Date()): number {
	const birth = new Date(birthDate);
	return (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function detectIntent(
	question: string,
): "intro" | "allergy" | "recipe" | "picky" | "nutrition" | "general" {
	const q = question.toLowerCase();
	if (/(辅食|米糊|食物|加什么|添加|泥|introduc|food|吃辅)/i.test(q)) return "intro";
	if (/(过敏|过敏|allergy|allergic|不耐受|起疹子|湿疹|腹泻|过敏源)/i.test(q)) return "allergy";
	if (/(食谱|做法|怎么做|怎么煮|recipe|cook|meal|辅食做法)/i.test(q)) return "recipe";
	if (/(挑食|偏食|不好好吃|不吃|picky|fussy|拒绝吃饭|不爱吃)/i.test(q)) return "picky";
	if (/(营养|热量|蛋白质|奶粉|配方奶|母乳|nutrition|calorie|protein|formula|breastfeed|奶量)/i.test(q))
		return "nutrition";
	return "general";
}

function formatIntro(past: FoodIntroduction[], next: FoodIntroduction | null, ageMonths: number): string {
	const pastLines = past.map(
		(f) => `- ${f.food}（${f.category}，${f.recommendedAgeMonths} 月龄）${f.notes ? ` — ${f.notes}` : ""}`,
	);
	const lines = [`宝宝 ${Math.floor(ageMonths)} 月龄，可以尝试的食物：`];
	if (pastLines.length > 0) lines.push("", ...pastLines);
	if (next) {
		lines.push("", `🔜 下一步推荐：${next.food}（${next.category}），建议 ${next.recommendedAgeMonths} 月龄开始`);
	} else {
		lines.push("", "🎉 已完成所有阶段辅食添加计划");
	}
	return lines.join("\n");
}

function formatAllergens(allergens: Allergen[], ageMonths: number, avoidRecipes: Recipe[]): string {
	const lines = [
		`⚠️ 检测到提及的过敏原：${allergens.join("、")}`,
		"",
		"通用建议：",
		"- 8 大常见过敏原：牛奶、鸡蛋、花生、坚果、大豆、小麦、鱼、贝类",
		"- 每次只添加一种新食物，观察 3-5 天",
		"- 严重过敏反应（呼吸困难/面部肿胀）需立即就医",
		"- 轻微过敏（皮疹/腹泻）应停止该食物并咨询医生",
	];
	if (avoidRecipes.length > 0) {
		lines.push("", `🚫 避免以下含 ${allergens.join("/")} 的食谱：${avoidRecipes.map((r) => r.name).join("、")}`);
	}
	return lines.join("\n");
}

function formatRecipes(recipes: Recipe[]): string {
	if (recipes.length === 0) return "当前月龄暂无推荐食谱，可咨询儿科医生。";
	const lines = [`🍽️ 推荐食谱（${recipes.length} 道）：`];
	for (const r of recipes.slice(0, 5)) {
		lines.push("", `【${r.name}】（${r.minAgeMonths}+ 月龄）`);
		lines.push(`食材：${r.ingredients.join("、")}`);
		lines.push(`步骤：${r.steps.join(" → ")}`);
		if (r.allergens.length > 0) {
			lines.push(`含过敏原：${r.allergens.join("、")}`);
		}
	}
	return lines.join("\n");
}

function formatNutritionNeeds(needs: NutritionNeeds, ageMonths: number): string {
	const lines = [`📊 ${Math.floor(ageMonths)} 月龄宝宝每日营养需求：`];
	lines.push(`- 热量：${needs.caloriesPerDay} kcal`);
	lines.push(`- 蛋白质：${needs.proteinGramsPerDay} g`);
	if (needs.formulaOzPerDay) {
		lines.push(`- 奶量：${needs.formulaOzPerDay} oz（约 ${Math.round(needs.formulaOzPerDay * 30)} ml）`);
	}
	if (needs.notes) {
		lines.push("", `💡 ${needs.notes}`);
	}
	return lines.join("\n");
}

function formatPicky(guidance: PickyEatingGuidance): string {
	const lines = [
		`🍽️ ${guidance.ageRange}挑食：`,
		"",
		...guidance.advice.map((a) => `- ${a}`),
	];
	return lines.join("\n");
}

export class NutritionistAgent implements Agent {
	readonly id = "nutritionist";
	readonly name = "营养师";
	readonly topics = ["nutrition"] as const;
	readonly stages = [
		"newborn",
		"infant",
		"toddler",
		"preschool",
		"school_age",
		"tween",
		"teen",
		"young_adult",
	] as const;

	async respond(question: string, child: ChildProfile, _context: AgentContext): Promise<AgentReply> {
		const months = ageInMonths(child.birthDate);
		const stage = child.stage ?? computeStage(child.birthDate);
		const intent = detectIntent(question);

		switch (intent) {
			case "intro": {
				const past = getFoodsForAge(months);
				const next = getNextFood(months);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatIntro(past, next, months)}\n\n${NUTRITIONIST_DISCLAIMER}`,
					confidence: 0.9,
					urgency: "info",
				};
			}
			case "allergy": {
				const allergens = detectAllergens(question);
				if (allergens.length === 0) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `请告诉我具体怀疑的过敏原（如：牛奶、鸡蛋、花生等），我帮您分析。\n\n${NUTRITIONIST_DISCLAIMER}`,
						confidence: 0.4,
						urgency: "info",
					};
				}
				const avoidRecipes = allergens.flatMap((a) => findRecipesWithAllergen(a));
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatAllergens(allergens, months, avoidRecipes)}\n\n${NUTRITIONIST_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "recipe": {
				const recipes = getRecipesForAge(months);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatRecipes(recipes)}\n\n${NUTRITIONIST_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "picky": {
				const guidance = getPickyEatingGuidance(stage);
				if (!guidance) {
					return {
						agentId: this.id,
						agentName: this.name,
						content: `挑食问题请咨询儿科医生。\n\n${NUTRITIONIST_DISCLAIMER}`,
						confidence: 0.5,
						urgency: "info",
					};
				}
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatPicky(guidance)}\n\n${NUTRITIONIST_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "nutrition": {
				const needs = getNutritionNeeds(months);
				return {
					agentId: this.id,
					agentName: this.name,
					content: `${formatNutritionNeeds(needs, months)}\n\n${NUTRITIONIST_DISCLAIMER}`,
					confidence: 0.85,
					urgency: "info",
				};
			}
			case "general":
			default:
				return {
					agentId: this.id,
					agentName: this.name,
					content: `我是营养师，可以帮你：\n- 辅食添加（6 月龄+）\n- 食物过敏管理\n- 营养需求（热量/蛋白质/奶量）\n- 食谱推荐\n- 挑食问题\n\n请告诉我宝宝月龄和具体问题。\n\n${NUTRITIONIST_DISCLAIMER}`,
					confidence: 0.4,
					urgency: "info",
				};
		}
	}
}

export function createNutritionistAgent(): NutritionistAgent {
	return new NutritionistAgent();
}

export {
	COMMON_ALLERGENS,
	FOOD_INTRODUCTION_SCHEDULE,
	NUTRITION_NEEDS,
	PICKY_EATING_GUIDANCE,
	RECIPES,
	detectAllergens,
	getFoodsForAge,
	getNextFood,
	getNutritionNeeds,
	getPickyEatingGuidance,
	getRecipesForAge,
	findRecipesWithAllergen,
	type Allergen,
	type FoodIntroduction,
	type NutritionNeeds,
	type PickyEatingGuidance,
	type Recipe,
} from "./knowledge.js";
