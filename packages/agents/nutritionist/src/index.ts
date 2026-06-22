/**
 * @parenting/agent-nutritionist — feeding, solid food introduction, allergies, recipes.
 *
 * Phase 2: rule-based + keyword matching. No LLM call.
 */

export {
	createNutritionistAgent,
	NUTRITIONIST_DISCLAIMER,
	NutritionistAgent,
} from "./agent.js";

export {
	type Allergen,
	COMMON_ALLERGENS,
	detectAllergens,
	FOOD_INTRODUCTION_SCHEDULE,
	type FoodIntroduction,
	findRecipesWithAllergen,
	getFoodsForAge,
	getNextFood,
	getNutritionNeeds,
	getPickyEatingGuidance,
	getRecipesForAge,
	NUTRITION_NEEDS,
	type NutritionNeeds,
	PICKY_EATING_GUIDANCE,
	type PickyEatingGuidance,
	RECIPES,
	type Recipe,
} from "./knowledge.js";

export const NUTRITIONIST_VERSION = "0.1.0";
