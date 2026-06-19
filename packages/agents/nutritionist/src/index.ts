/**
 * @parenting/agent-nutritionist — feeding, solid food introduction, allergies, recipes.
 *
 * Phase 2: rule-based + keyword matching. No LLM call.
 */

export {
	NutritionistAgent,
	createNutritionistAgent,
	NUTRITIONIST_DISCLAIMER,
} from "./agent.js";

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

export const NUTRITIONIST_VERSION = "0.1.0";
