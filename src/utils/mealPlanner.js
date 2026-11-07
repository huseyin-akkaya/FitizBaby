import { products } from "../data/catalogStore";
import { mealRecipes, mealSlotTemplates, recipeIngredients } from "../data/mealRecipes";

export const STORAGE_KEY = "fitizbaby-nutrition-plan-v1";

export const ACTIVITY_LEVELS = [
  { value: "inactive", label: "Hareketsiz", factor: 1.2, detail: "Günlük temel hareketler · 1,2" },
  { value: "low", label: "Az hareketli", factor: 1.375, detail: "Hafif egzersiz · 1,375" },
  { value: "active", label: "Aktif", factor: 1.55, detail: "Orta düzey egzersiz · 1,55" },
  { value: "veryActive", label: "Çok aktif", factor: 1.725, detail: "Yoğun egzersiz · 1,725" },
];

export const emptyProfile = { age: "", sex: "female", height: "", weight: "", activity: "low", goal: "maintain", bmi: "" };

export function calculateTargets(profile) {
  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  const activity = profile.activity === "veryActive" ? "veryActive" : profile.activity === "active" ? "active" : profile.activity === "inactive" ? "inactive" : "low";
  // Mifflin–St Jeor adult resting-energy estimate (kg, cm, years).
  const bmr = 10 * weight + 6.25 * height - 5 * age + (profile.sex === 'male' ? 5 : -161);
  const factor = ACTIVITY_LEVELS.find(level => level.value === activity)?.factor ?? 1.375;
  const maintenance = bmr * factor;
  const adjustment = { lose: -300, maintain: 0, gain: 200 }[profile.goal] ?? 0;
  const calories = Math.round((maintenance + adjustment) / 10) * 10;
  // Neutral starting split: 20% protein, 50% carbohydrate, 30% fat.
  // Users can edit grams; these are a starting distribution, not a prescription.
  const protein = Math.round(calories * 0.2 / 4);
  const carbs = Math.round(calories * 0.5 / 4);
  const fat = Math.round(calories * 0.3 / 9);
  return { calories, protein, carbs, fat, bmr: Math.round(bmr), factor, maintenance: Math.round(maintenance) };
}

export function recipeNutrition(recipe, portionScale = 1) {
  return recipe.ingredients.reduce((total, ingredient) => {
    const food = recipeIngredients[ingredient.ingredientId];
    if (!food) return total;
    const multiplier = ingredient.amount * portionScale / 100;
    total.calories += food.calories * multiplier;
    total.protein += food.protein * multiplier;
    total.carbs += food.carbs * multiplier;
    total.fat += food.fat * multiplier;
    return total;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function recipeIngredientLabels(recipe, portionScale = 1) {
  return recipe.ingredients.map(({ ingredientId, amount }) => {
    const food = recipeIngredients[ingredientId];
    if (!food) return null;
    const scaledAmount = Number((amount * portionScale).toFixed(0));
    return `${food.name} · ${scaledAmount} g`;
  }).filter(Boolean);
}

export function getCatalogSuggestions(recipe) {
  return (recipe.catalogSuggestions ?? []).map((id) => products.find((product) => product.id === id)).filter(Boolean);
}

export function createMealPlan(calories, macros, mealCount, previousPlan = []) {
  const slots = mealSlotTemplates[mealCount] ?? mealSlotTemplates[3];
  const distribution = mealCount === 3 ? [0.3, 0.35, 0.35]
    : mealCount === 4 ? [0.25, 0.3, 0.15, 0.3]
      : [0.23, 0.1, 0.29, 0.1, 0.28];
  const usedIds = new Set(previousPlan.map((item) => item.recipeId));

  return slots.map((slot, index) => {
    const candidates = mealRecipes.filter((recipe) => recipe.category === slot.category);
    const target = {
      calories: calories * distribution[index],
      protein: macros.protein * distribution[index],
      carbs: macros.carbs * distribution[index],
      fat: macros.fat * distribution[index],
    };
    const unselected = candidates.filter((recipe) => !usedIds.has(recipe.id));
    const choices = unselected.length ? unselected : candidates;
    const scored = choices.map((recipe) => {
      const base = recipeNutrition(recipe);
      const portionScale = base.calories > 0 ? Math.max(0.5, Math.min(2, target.calories / base.calories)) : 1;
      const nutrition = recipeNutrition(recipe, portionScale);
      const score = ["calories", "protein", "carbs", "fat"].reduce((sum, key) => {
        const scale = Math.max(target[key], key === "calories" ? 100 : 10);
        return sum + ((nutrition[key] - target[key]) / scale) ** 2;
      }, 0);
      return { recipe, nutrition, portionScale, score };
    }).sort((a, b) => a.score - b.score);
    const selected = scored[0];
    if (selected) usedIds.add(selected.recipe.id);
    return { slotId: slot.id, label: slot.label, category: slot.category, recipeId: selected?.recipe.id ?? "", portionScale: selected?.portionScale ?? 1, nutrition: selected?.nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0 } };
  });
}

export function getRecipe(recipeId) {
  return mealRecipes.find((recipe) => recipe.id === recipeId);
}

export function getAlternativeRecipes(category, currentId, calories, macros, share = 0.25) {
  const target = { calories: calories * share, protein: macros.protein * share, carbs: macros.carbs * share, fat: macros.fat * share };
  return mealRecipes.filter((recipe) => recipe.category === category && recipe.id !== currentId).sort((a, b) => {
    const cost = (recipe) => {
      const base = recipeNutrition(recipe);
      const scale = base.calories > 0 ? Math.max(0.5, Math.min(2, target.calories / base.calories)) : 1;
      const nutrition = recipeNutrition(recipe, scale);
      return ["calories", "protein", "carbs", "fat"].reduce((sum, key) => sum + ((nutrition[key] - target[key]) / Math.max(target[key], 10)) ** 2, 0);
    };
    return cost(a) - cost(b);
  });
}

export function getPortionScale(recipe, targetCalories) {
  const base = recipeNutrition(recipe);
  return base.calories > 0 ? Math.max(0.5, Math.min(2, targetCalories / base.calories)) : 1;
}
