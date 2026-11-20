import { getProductsSnapshot } from '../data/catalogStore';
import { products as catalog } from '../data/catalogStore';
export const COMPARE_STORAGE_KEY = "fitizbaby.compareProductIds";

const storageKey = () => { const scope = getProductsSnapshot().scope; return scope === 'guest' || scope === 'pending' ? COMPARE_STORAGE_KEY : COMPARE_STORAGE_KEY + '.account.' + scope; };

export const comparisonCriteria = [
  { key: "protein", label: "Protein", unit: "g", direction: "high", weight: 1 },
  { key: "sugar", label: "Şeker", unit: "g", direction: "low", weight: 1 },
  { key: "calories", label: "Kalori", unit: "kcal", direction: "low", weight: 1 },
  { key: "fat", label: "Yağ", unit: "g", direction: "low", weight: 1 },
];

export function readComparedIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey()) || "[]");
    return Array.isArray(parsed) ? [...new Set(parsed.filter(id => typeof id === "number" || typeof id === "string").map(id => catalog.find(product => String(product.id) === String(id))?.id).filter(id => id != null))].slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function saveComparedIds(ids) {
  try { localStorage.setItem(storageKey(), JSON.stringify(ids)); } catch { /* Storage unavailable. */ }
}

export function getComparisonResult(products) {
  const scores = Object.fromEntries(products.map((product) => [product.id, 0]));
  const reasons = Object.fromEntries(products.map((product) => [product.id, []]));
  const applicable = [];

  const sameReference = products.length > 1 && products.every((product) => product.serving === products[0].serving);
  for (const criterion of comparisonCriteria) {
    if (!sameReference) continue;
    const values = products.map((product) => product[criterion.key]);
    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) continue;
    const best = criterion.direction === "high" ? Math.max(...values) : Math.min(...values);
    const leaders = products.filter((product) => product[criterion.key] === best);
    const share = (criterion.weight || 1) / leaders.length;
    leaders.forEach((product) => {
      scores[product.id] += share;
      reasons[product.id].push(`${criterion.label}: ${best} ${criterion.unit} — ${leaders.length > 1 ? "eşit " : ""}en ${criterion.direction === "high" ? "yüksek" : "düşük"} değer`);
    });
    applicable.push(criterion.label);
  }

  const topScore = Math.max(0, ...Object.values(scores));
  const leaders = products.filter((product) => Math.abs(scores[product.id] - topScore) < 1e-9 && topScore > 0);
  return {
    winner: leaders.length === 1 ? leaders[0] : null,
    tiedProducts: leaders.length > 1 ? leaders : [],
    scores,
    reasons,
    applicable,
  };
}
