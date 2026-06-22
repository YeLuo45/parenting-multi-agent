/**
 * Nutritionist knowledge base — feeding, solid food introduction, allergies, recipes.
 */

import type { ChildStage } from "@parenting/memory";

/** Common food allergens to track. */
export const COMMON_ALLERGENS = [
	"牛奶",
	"鸡蛋",
	"花生",
	"坚果",
	"大豆",
	"小麦",
	"鱼",
	"贝类",
] as const;

export type Allergen = (typeof COMMON_ALLERGENS)[number];

/** Solid food introduction timeline (months). */
export interface FoodIntroduction {
	food: string;
	recommendedAgeMonths: number;
	category: "蔬菜" | "水果" | "蛋白" | "谷物" | "乳制品";
	notes?: string;
}

export const FOOD_INTRODUCTION_SCHEDULE: FoodIntroduction[] = [
	{ food: "米糊", recommendedAgeMonths: 6, category: "谷物" },
	{
		food: "蔬菜泥（胡萝卜、南瓜、土豆）",
		recommendedAgeMonths: 6,
		category: "蔬菜",
		notes: "先蔬菜后水果",
	},
	{
		food: "水果泥（苹果泥、香蕉泥）",
		recommendedAgeMonths: 6,
		category: "水果",
	},
	{
		food: "蛋黄（先少量）",
		recommendedAgeMonths: 7,
		category: "蛋白",
		notes: "观察过敏",
	},
	{ food: "肉泥（猪肉、鸡肉）", recommendedAgeMonths: 7, category: "蛋白" },
	{
		food: "鱼肉（无骨）",
		recommendedAgeMonths: 8,
		category: "蛋白",
		notes: "避免高汞鱼",
	},
	{ food: "豆腐", recommendedAgeMonths: 8, category: "蛋白" },
	{ food: "酸奶（无糖）", recommendedAgeMonths: 8, category: "乳制品" },
	{ food: "全蛋", recommendedAgeMonths: 9, category: "蛋白" },
	{ food: "面条（软烂）", recommendedAgeMonths: 9, category: "谷物" },
	{ food: "米饭（软）", recommendedAgeMonths: 10, category: "谷物" },
	{ food: "软豆腐/豆制品", recommendedAgeMonths: 10, category: "蛋白" },
	{ food: "小块软水果", recommendedAgeMonths: 12, category: "水果" },
	{ food: "全脂牛奶", recommendedAgeMonths: 12, category: "乳制品" },
	{
		food: "蜂蜜",
		recommendedAgeMonths: 12,
		category: "蔬菜",
		notes: "1 岁前禁食（肉毒杆菌）",
	},
	{
		food: "坚果碎（粉）",
		recommendedAgeMonths: 12,
		category: "蛋白",
		notes: "整颗易呛咳",
	},
	{ food: "鸡蛋（蛋白全）", recommendedAgeMonths: 12, category: "蛋白" },
	{ food: "虾蟹", recommendedAgeMonths: 18, category: "蛋白" },
];

/** Get foods due for given age. */
export function getFoodsForAge(ageMonths: number): FoodIntroduction[] {
	return FOOD_INTRODUCTION_SCHEDULE.filter(
		(f) => f.recommendedAgeMonths <= ageMonths,
	);
}

/** Get next food to introduce. */
export function getNextFood(ageMonths: number): FoodIntroduction | null {
	const upcoming = FOOD_INTRODUCTION_SCHEDULE.filter(
		(f) => f.recommendedAgeMonths > ageMonths,
	);
	upcoming.sort((a, b) => a.recommendedAgeMonths - b.recommendedAgeMonths);
	return upcoming[0] ?? null;
}

/** Daily nutrition requirements by age. */
export interface NutritionNeeds {
	ageMonths: number;
	caloriesPerDay: number;
	proteinGramsPerDay: number;
	formulaOzPerDay?: number; // for infants
	notes?: string;
}

export const NUTRITION_NEEDS: NutritionNeeds[] = [
	{
		ageMonths: 0,
		caloriesPerDay: 500,
		proteinGramsPerDay: 10,
		formulaOzPerDay: 24,
		notes: "纯母乳/配方奶",
	},
	{
		ageMonths: 3,
		caloriesPerDay: 600,
		proteinGramsPerDay: 12,
		formulaOzPerDay: 28,
	},
	{
		ageMonths: 6,
		caloriesPerDay: 750,
		proteinGramsPerDay: 14,
		formulaOzPerDay: 24,
		notes: "开始辅食",
	},
	{
		ageMonths: 9,
		caloriesPerDay: 900,
		proteinGramsPerDay: 18,
		formulaOzPerDay: 16,
	},
	{
		ageMonths: 12,
		caloriesPerDay: 1000,
		proteinGramsPerDay: 20,
		notes: "转全脂牛奶",
	},
	{ ageMonths: 24, caloriesPerDay: 1100, proteinGramsPerDay: 25 },
	{ ageMonths: 36, caloriesPerDay: 1300, proteinGramsPerDay: 30 },
	{ ageMonths: 60, caloriesPerDay: 1500, proteinGramsPerDay: 35 },
];

/** Get nutrition needs for given age (nearest). */
export function getNutritionNeeds(ageMonths: number): NutritionNeeds {
	let nearest = NUTRITION_NEEDS[0];
	for (const need of NUTRITION_NEEDS) {
		if (need.ageMonths <= ageMonths) nearest = need;
	}
	return nearest;
}

/** Recipes by category. */
export interface Recipe {
	name: string;
	category: FoodIntroduction["category"];
	minAgeMonths: number;
	ingredients: string[];
	steps: string[];
	allergens: Allergen[];
}

export const RECIPES: Recipe[] = [
	{
		name: "胡萝卜米糊",
		category: "谷物",
		minAgeMonths: 6,
		ingredients: ["婴儿米粉 10g", "胡萝卜 30g", "温水 60ml"],
		steps: ["胡萝卜蒸熟压成泥", "米粉加温水调匀", "混合胡萝卜泥即可"],
		allergens: [],
	},
	{
		name: "苹果泥",
		category: "水果",
		minAgeMonths: 6,
		ingredients: ["苹果 1/4 个"],
		steps: ["苹果去皮去核", "用勺刮成泥或用辅食机打泥"],
		allergens: [],
	},
	{
		name: "蛋黄土豆泥",
		category: "蛋白",
		minAgeMonths: 7,
		ingredients: ["土豆 50g", "蛋黄 1/4 个", "母乳或配方奶 20ml"],
		steps: ["土豆蒸熟压泥", "煮熟蛋黄压泥", "混合加奶调匀"],
		allergens: ["鸡蛋"],
	},
	{
		name: "鸡肉蔬菜粥",
		category: "蛋白",
		minAgeMonths: 8,
		ingredients: ["鸡胸肉 30g", "大米 20g", "胡萝卜 20g", "西兰花 20g"],
		steps: [
			"鸡肉切碎煮熟",
			"大米煮粥",
			"胡萝卜西兰花蒸熟切碎",
			"所有材料混合煮 5 分钟",
		],
		allergens: ["小麦"],
	},
	{
		name: "三文鱼土豆泥",
		category: "蛋白",
		minAgeMonths: 8,
		ingredients: ["三文鱼 30g", "土豆 50g", "柠檬 2 片"],
		steps: ["三文鱼蒸熟去刺", "土豆蒸熟压泥", "柠檬去籽挤汁调味", "混合"],
		allergens: ["鱼"],
	},
	{
		name: "番茄鸡蛋面",
		category: "谷物",
		minAgeMonths: 12,
		ingredients: ["细面 30g", "番茄 1/2 个", "鸡蛋 1 个", "葱花少许"],
		steps: [
			"番茄切碎炒出汁",
			"加水煮开下细面",
			"打散鸡蛋倒入",
			"出锅撒葱花",
		],
		allergens: ["鸡蛋", "小麦"],
	},
	{
		name: "酸奶水果杯",
		category: "乳制品",
		minAgeMonths: 12,
		ingredients: ["无糖酸奶 100g", "香蕉 1/2 根", "蓝莓 30g"],
		steps: ["香蕉切片", "杯中依次放酸奶、香蕉、蓝莓"],
		allergens: ["牛奶"],
	},
];

/** Get recipes appropriate for given age. */
export function getRecipesForAge(ageMonths: number): Recipe[] {
	return RECIPES.filter((r) => r.minAgeMonths <= ageMonths);
}

/** Find recipes containing a specific allergen (for avoidance). */
export function findRecipesWithAllergen(allergen: Allergen): Recipe[] {
	return RECIPES.filter((r) => r.allergens.includes(allergen));
}

/** Picky eating guidance by stage. */
export interface PickyEatingGuidance {
	stage: ChildStage;
	ageRange: string;
	normal: boolean;
	advice: string[];
}

export const PICKY_EATING_GUIDANCE: PickyEatingGuidance[] = [
	{
		stage: "toddler",
		ageRange: "1-3 岁",
		normal: true,
		advice: [
			"1-2 岁挑食是正常发展（自主性发展）",
			"提供多样化食物但不强迫吃",
			"父母示范吃（孩子模仿）",
			"固定用餐时间（20-30 分钟）",
			"不把食物作为奖励或惩罚",
		],
	},
	{
		stage: "preschool",
		ageRange: "3-6 岁",
		normal: true,
		advice: [
			"挑食可能持续但会改善",
			"让孩子参与买菜做饭",
			"接受 15-20 次尝试再判断是否真不喜欢",
			"避免在吃饭时批评",
			"提供 finger food 增加进食兴趣",
		],
	},
	{
		stage: "school_age",
		ageRange: "6-12 岁",
		normal: false,
		advice: [
			"挑食可能与社交/学校相关",
			"鼓励尝试新食物但不强求",
			"与学校营养午餐内容对齐",
			"考虑食物过敏/不耐受",
		],
	},
];

/** Get guidance for given stage. */
export function getPickyEatingGuidance(
	stage: ChildStage,
): PickyEatingGuidance | null {
	return PICKY_EATING_GUIDANCE.find((g) => g.stage === stage) ?? null;
}

/** Detect common allergens mentioned in text. */
export function detectAllergens(text: string): Allergen[] {
	const found: Allergen[] = [];
	for (const a of COMMON_ALLERGENS) {
		if (text.includes(a) && !found.includes(a)) found.push(a);
	}
	// English names
	const lower = text.toLowerCase();
	const enMap: Record<string, Allergen> = {
		milk: "牛奶",
		egg: "鸡蛋",
		peanut: "花生",
		"tree nut": "坚果",
		nut: "坚果",
		soy: "大豆",
		wheat: "小麦",
		fish: "鱼",
		shellfish: "贝类",
	};
	for (const [en, cn] of Object.entries(enMap)) {
		if (lower.includes(en) && !found.includes(cn)) found.push(cn);
	}
	return found;
}
