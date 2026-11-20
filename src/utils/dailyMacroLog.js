import { captureNutrition, entryProduct } from './mealSnapshots';
import { personalStorage } from '../data/personalStorage';
import { products } from "../data/catalogStore";

export const DAILY_MACRO_TARGETS_KEY = "fitizbaby.daily-macro-targets.v1";
export const dailyMacroLogKey = (dayKey) => `fitizbaby.daily-macro-log.${dayKey}.v1`;

const mealTypes = [
  { key: "breakfast", label: "Sabah" },
  { key: "lunch", label: "Öğle" },
  { key: "dinner", label: "Akşam" },
  { key: "snacks", label: "Aperatif" },
];
const nutrients = [
  { key: "calories", label: "kalori", unit: "kcal" },
  { key: "protein", label: "protein", unit: "g" },
  { key: "carbs", label: "karbonhidrat", unit: "g" },
  { key: "fat", label: "yağ", unit: "g" },
];

export function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseServing(serving) {
  const match = String(serving ?? "").match(/([\d.,]+)\s*(g|ml)\b/i);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? { amount, unit: match[2].toLowerCase() } : null;
}

function normalizeMealEntry(entry) {
  const product = entryProduct(entry, products);

  const serving = parseServing(product?.serving);
  if (entry.mode === "custom" || entry.mode === "package") {
    return {
      snapshot: entry.snapshot === undefined ? captureNutrition(product, 'catalog-at-import') : entry.snapshot,
      productId: entry.productId,
      mode: entry.mode,
      amount: entry.amount == null ? "" : String(entry.amount),
      packageSize: entry.packageSize == null ? String(product?.packageSize ?? "") : String(entry.packageSize),
      packageCount: entry.packageCount == null ? 1 : String(entry.packageCount),
    };
  }
  const oldQuantity = Number(entry.quantity);
  if (!Number.isFinite(oldQuantity) || oldQuantity <= 0) return null;
  return {
    snapshot: entry.snapshot === undefined ? captureNutrition(product, 'catalog-at-import') : entry.snapshot,
      productId: entry.productId,
    mode: "custom",
    amount: String(serving ? serving.amount * oldQuantity : oldQuantity * 100),
    packageSize: String(product?.packageSize ?? ""),
    packageCount: 1,
  };
}

function getConsumedAmount(entry) {
  if (entry.mode === "package") return (Number(entry.packageSize) || 0) * (Number(entry.packageCount) || 0);
  return Number(entry.amount) || 0;
}

function getNutritionMultiplier(entry, product) {
  const serving = parseServing(product?.serving);
  return serving ? getConsumedAmount(entry) / serving.amount : 0;
}

function summarizeEntries(entries) {
  const totals = Object.fromEntries(nutrients.map(({ key }) => [key, { value: 0, missing: 0 }]));
  entries.forEach((entry) => {
    const product = entryProduct(entry, products);
    if (!product) { if(getConsumedAmount(entry)>0) nutrients.forEach(({key})=>{totals[key].missing+=1;}); return; }
    const multiplier = getNutritionMultiplier(entry, product);
    if (multiplier <= 0) return;
    nutrients.forEach(({ key }) => {
      if (typeof product[key] === "number" && Number.isFinite(product[key])) totals[key].value += product[key] * multiplier;
      else totals[key].missing += 1;
    });
  });
  return totals;
}

function readJson(key) {
  try {
    return JSON.parse(personalStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

export function readDailyMacroContext(date = new Date()) {
  const dayKey = localDayKey(date);
  const savedTargets = readJson(DAILY_MACRO_TARGETS_KEY);
  const savedMeals = readJson(dailyMacroLogKey(dayKey));
  const targets = Object.fromEntries(nutrients.map(({ key }) => {
    const raw = savedTargets?.[key];
    if (raw == null || raw === "") return [key, null];
    const value = Number(raw);
    return [key, Number.isFinite(value) ? value : null];
  }));
  const meals = Object.fromEntries(mealTypes.map(({ key, label }) => {
    const entries = Array.isArray(savedMeals?.[key])
      ? savedMeals[key].map(normalizeMealEntry).filter(Boolean)
      : [];
    return [key, { label, entries }];
  }));
  const entries = Object.values(meals).flatMap((meal) => meal.entries);
  const consumed = summarizeEntries(entries);
  const hasAnyTarget = nutrients.some(({ key }) => targets[key] != null);
  const hasLogRecord = savedMeals != null;
  const remaining = Object.fromEntries(nutrients.map(({ key }) => {
    if (targets[key] == null) return [key, { status: "no-target" }];
    if (consumed[key].missing > 0) {
      return [key, {
        status: "incomplete",
        target: targets[key],
        consumed: consumed[key].value,
        missing: consumed[key].missing,
      }];
    }
    return [key, {
      status: "ok",
      target: targets[key],
      consumed: consumed[key].value,
      remaining: targets[key] - consumed[key].value,
    }];
  }));

  return {
    dayKey,
    targets,
    consumed,
    remaining,
    entryCount: entries.length,
    hasAnyTarget,
    hasLogRecord,
    meals,
  };
}
