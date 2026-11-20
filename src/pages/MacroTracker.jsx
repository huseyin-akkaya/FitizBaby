import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { products } from "../data/catalogStore";
import { useProducts } from "../hooks/useProducts";
import { getProductCategoryNames } from "../data/productCategories";

const TARGETS_STORAGE_KEY = "fitizbaby.daily-macro-targets.v1";
const mealTypes = [
  { key: "breakfast", label: "Sabah" },
  { key: "lunch", label: "Öğle" },
  { key: "dinner", label: "Akşam" },
  { key: "snacks", label: "Aperatif" },
];
const nutrients = [
  { key: "calories", label: "Kalori", unit: "kcal", color: "bg-amber-500", max: 10000, step: 1 },
  { key: "protein", label: "Protein", unit: "g", color: "bg-green-500", max: 1000, step: 0.1 },
  { key: "carbs", label: "Karbonhidrat", unit: "g", color: "bg-orange-400", max: 1000, step: 0.1 },
  { key: "fat", label: "Yağ", unit: "g", color: "bg-sky-500", max: 1000, step: 0.1 },
];
const numberFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
const emptyTargets = () => Object.fromEntries(nutrients.map(({ key }) => [key, ""]));
const emptyMeals = () => Object.fromEntries(mealTypes.map(({ key }) => [key, []]));

function localDayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readTargets() {
  try {
    const saved = JSON.parse(localStorage.getItem(TARGETS_STORAGE_KEY) ?? "null");
    return Object.fromEntries(nutrients.map(({ key }) => [key, saved?.[key] == null ? "" : String(saved[key])]));
  } catch {
    return emptyTargets();
  }
}

function readMeals(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return Object.fromEntries(mealTypes.map(({ key }) => [key, Array.isArray(saved?.[key])
      ? saved[key].filter((entry) => entry && ['string', 'number'].includes(typeof entry.productId))
        .map((entry) => {
          const product = products.find((item) => String(item.id) === String(entry.productId));
          const serving = parseServing(product?.serving);
          if (entry.mode === "custom" || entry.mode === "package") {
            return {
              productId: entry.productId,
              mode: entry.mode,
              amount: entry.amount == null ? "" : String(entry.amount),
              packageSize: entry.packageSize == null ? String(product?.packageSize ?? "") : String(entry.packageSize),
              packageCount: entry.packageCount == null ? 1 : String(entry.packageCount),
            };
          }

          // Keep older saved logs: their quantity was a count of the catalog serving.
          const oldQuantity = Number(entry.quantity);
          if (!Number.isFinite(oldQuantity) || oldQuantity <= 0) return null;
          return {
            productId: entry.productId,
            mode: "custom",
            amount: String(serving ? serving.amount * oldQuantity : oldQuantity * 100),
            packageSize: String(product?.packageSize ?? ""),
            packageCount: 1,
          };
        }).filter(Boolean)
      : []]));
  } catch {
    return emptyMeals();
  }
}

function parseServing(serving) {
  const match = String(serving ?? "").match(/([\d.,]+)\s*(g|ml)\b/i);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? { amount, unit: match[2].toLowerCase() } : null;
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
    const product = products.find((item) => String(item.id) === String(entry.productId));
    if (!product) return;
    const multiplier = getNutritionMultiplier(entry, product);
    if (multiplier <= 0) return;
    nutrients.forEach(({ key }) => {
      if (typeof product[key] === "number" && Number.isFinite(product[key])) totals[key].value += product[key] * multiplier;
      else totals[key].missing += 1;
    });
  });
  return totals;
}

function formatQuantity(value) {
  return numberFormat.format(value);
}

function MealSection({ meal, entries, totals, onAdd, onChangeEntry, onChangeMode, onRemove }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("tr");
  const matches = normalizedQuery ? products.filter((product) =>
    `${product.name} ${product.brand} ${getProductCategoryNames(product).join(" ")}`
      .toLocaleLowerCase("tr").includes(normalizedQuery)
  ).slice(0, 7) : [];
  const hasEntries = entries.length > 0;

  return <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby={`meal-${meal.key}`}>
    <div className="flex items-start justify-between gap-3"><div><h2 id={`meal-${meal.key}`} className="text-lg font-bold text-zinc-900">{meal.label}</h2><p className="mt-1 text-xs text-zinc-500">Miktarı gram/ml veya paket olarak belirle.</p></div><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">{entries.length} ürün</span></div>

    <div className="relative mt-4"><label htmlFor={`meal-search-${meal.key}`} className="sr-only">{meal.label} öğününe ürün ekle</label><input id={`meal-search-${meal.key}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Katalogdan ürün ara…" autoComplete="off" className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-green-500 focus:ring-4 focus:ring-green-50" />
      {normalizedQuery && <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl">{matches.length ? matches.map((product) => <button key={product.id} type="button" onClick={() => { onAdd(meal.key, product.id); setQuery(""); }} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"><img src={product.image} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-zinc-50 object-contain p-1" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-zinc-900">{product.name}</span><span className="block truncate text-xs text-zinc-500">{product.brand} · {product.category} · {product.serving}</span></span><span className="text-xs font-semibold text-green-700">Ekle +</span></button>) : <p className="px-3 py-4 text-sm text-zinc-500">Bu isimle kayıtlı ürün bulamadım.</p>}</div>}
    </div>

    <div className="mt-4 space-y-2.5">{entries.map((entry) => {
      const product = products.find((item) => String(item.id) === String(entry.productId));
      if (!product) return <p key={entry.productId} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Bu ürün etkin katalogda bulunmuyor. Öğün kaydı korunuyor; toplam hesaplamasına katılmıyor.</p>;
      const serving = parseServing(product?.serving);
      const unit = serving?.unit ?? "g";
      const consumedAmount = getConsumedAmount(entry);
      const packageMode = entry.mode === "package";
      return <article key={product.id} className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
        <div className="flex items-center gap-3"><img src={product.image} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain p-1" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-zinc-900">{product.name}</p><p className="mt-0.5 text-xs text-zinc-500">{product.brand} · besin değerleri {product.serving} başına</p></div><button type="button" onClick={() => onRemove(meal.key, product.id)} aria-label={`${product.name} ürününü ${meal.label} öğününden kaldır`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600">×</button></div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white p-1" aria-label={`${product.name} miktar seçeneği`}>
          <button type="button" aria-pressed={!packageMode} onClick={() => onChangeMode(meal.key, product.id, "custom")} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${!packageMode ? "bg-green-700 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100"}`}>İstediğim miktar</button>
          <button type="button" aria-pressed={packageMode} onClick={() => onChangeMode(meal.key, product.id, "package")} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${packageMode ? "bg-green-700 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100"}`}>Paket</button>
        </div>
        {packageMode ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs font-medium text-zinc-600">Paketteki net miktar ({unit})</span><input type="number" min="0" max="100000" step="1" value={entry.packageSize} onChange={(event) => onChangeEntry(meal.key, product.id, "packageSize", event.target.value)} placeholder="Ambalajdaki miktar" className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500" /><span className="mt-1 block text-[10px] leading-4 text-zinc-400">{product.packageSize ? `Katalog bilgisi ${formatQuantity(product.packageSize)} ${unit}; farklı ambalaj kullanıyorsan düzenle.` : `Ambalaj üzerinde yazan net ${unit} miktarını gir.`}</span></label>
          <label className="block"><span className="mb-1 block text-xs font-medium text-zinc-600">Tüketilen paket adedi</span><input type="number" min="0" max="100" step="0.25" value={entry.packageCount} onChange={(event) => onChangeEntry(meal.key, product.id, "packageCount", event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500" /><span className="mt-1 block text-[10px] text-zinc-400">Yarım paket için 0,5 girebilirsin.</span></label>
        </div> : <label className="mt-3 block"><span className="mb-1 block text-xs font-medium text-zinc-600">Tüketilen miktar ({unit})</span><input type="number" min="0" max="100000" step="1" value={entry.amount} onChange={(event) => onChangeEntry(meal.key, product.id, "amount", event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500" /></label>}
        <p className="mt-2 text-[11px] text-zinc-500">Hesaplanan miktar: <strong className="text-zinc-700">{formatQuantity(consumedAmount)} {unit}</strong>{typeof product.calories === "number" && consumedAmount > 0 ? ` · yaklaşık ${formatQuantity(product.calories * getNutritionMultiplier(entry, product))} kcal` : ""}</p>
      </article>;
    })}</div>

    {!hasEntries && <p className="mt-4 rounded-xl border border-dashed border-zinc-200 px-3 py-5 text-center text-sm text-zinc-400">Bu öğüne henüz ürün eklenmedi.</p>}

    {hasEntries && <div className="mt-4 grid grid-cols-4 divide-x divide-zinc-100 rounded-xl bg-zinc-50 py-3 text-center">{nutrients.map(({ key, label, unit }) => <div key={key} className="px-1"><p className="text-xs font-bold text-zinc-900">{totals[key].missing ? `≥ ${formatQuantity(totals[key].value)}` : formatQuantity(totals[key].value)}</p><p className="mt-0.5 text-[10px] text-zinc-500">{label}{unit === "g" ? " (g)" : ""}</p></div>)}</div>}
  </section>;
}

function MacroTracker() {
  useProducts();
  const [dayKey] = useState(localDayKey);
  const dailyStorageKey = `fitizbaby.daily-macro-log.${dayKey}.v1`;
  const [targets, setTargets] = useState(readTargets);
  const [meals, setMeals] = useState(() => readMeals(dailyStorageKey));
  const mealsRef = useRef(meals);
  const [storageWarning, setStorageWarning] = useState("");
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("tr-TR", { dateStyle: "full" }).format(new Date(`${dayKey}T12:00:00`)), [dayKey]);
  const productTotals = summarizeEntries(Object.values(meals).flat());
  const mealTotals = Object.fromEntries(mealTypes.map(({ key }) => [key, summarizeEntries(meals[key])]));

  const saveToStorage = (storageKey, value) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
      setStorageWarning("");
    } catch {
      setStorageWarning("Tarayıcı kayıt alanına erişilemiyor; bu sayfa açıkken yaptığın girişler kullanılabilir ancak kaydedilemeyebilir.");
    }
  };

  const updateMeals = (updater) => {
    const nextMeals = updater(mealsRef.current);
    mealsRef.current = nextMeals;
    setMeals(nextMeals);
    saveToStorage(dailyStorageKey, nextMeals);
  };

  const updateTarget = (key, value) => {
    const nutrient = nutrients.find((item) => item.key === key);
    if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > nutrient.max)) return;
    const nextTargets = { ...targets, [key]: value };
    setTargets(nextTargets);
    saveToStorage(TARGETS_STORAGE_KEY, nextTargets);
  };

  const addProduct = (mealKey, productId) => updateMeals((current) => {
    const product = products.find((item) => String(item.id) === String(productId));
    if (!product) return current;
    const existing = current[mealKey].find((entry) => String(entry.productId) === String(productId));
    const nextEntries = existing
      ? current[mealKey].map((entry) => {
        if (String(entry.productId) !== String(productId)) return entry;
        if (entry.mode === "package") return { ...entry, packageCount: Math.min(100, Number(entry.packageCount || 0) + 1) };
        const serving = parseServing(product?.serving);
        return { ...entry, amount: String(Math.min(100000, (Number(entry.amount) || 0) + (serving?.amount ?? 100))) };
      })
      : [...current[mealKey], { productId, mode: "custom", amount: "100", packageSize: String(product?.packageSize ?? ""), packageCount: 1 }];
    return { ...current, [mealKey]: nextEntries };
  });
  const changeEntry = (mealKey, productId, field, rawValue) => {
    if (rawValue !== "") {
      const value = Number(rawValue);
      const max = field === "packageCount" ? 100 : 100000;
      if (!Number.isFinite(value) || value < 0 || value > max) return;
    }
    updateMeals((current) => ({ ...current, [mealKey]: current[mealKey].map((entry) => String(entry.productId) === String(productId) ? { ...entry, [field]: rawValue } : entry) }));
  };
  const changeMode = (mealKey, productId, mode) => updateMeals((current) => ({ ...current, [mealKey]: current[mealKey].map((entry) => String(entry.productId) === String(productId) ? { ...entry, mode } : entry) }));
  const removeProduct = (mealKey, productId) => updateMeals((current) => ({ ...current, [mealKey]: current[mealKey].filter((entry) => String(entry.productId) !== String(productId)) }));

  const overTargetSuggestions = nutrients.flatMap((nutrient) => {
    const targetInput = targets[nutrient.key];
    if (targetInput === "" || productTotals[nutrient.key].missing > 0) return [];
    const target = Number(targetInput);
    const excess = productTotals[nutrient.key].value - target;
    if (excess <= 0) return [];
    const contributor = Object.entries(meals).flatMap(([mealKey, entries]) => entries.map((entry) => {
      const product = products.find((item) => String(item.id) === String(entry.productId));
      const serving = parseServing(product?.serving);
      const consumedAmount = getConsumedAmount(entry);
      const amountPerUnit = serving && typeof product?.[nutrient.key] === "number" ? product[nutrient.key] / serving.amount : 0;
      return { mealKey, entry, product, consumedAmount, amountPerUnit };
    })).filter(({ product, consumedAmount, amountPerUnit }) => typeof product?.[nutrient.key] === "number" && product[nutrient.key] > 0 && consumedAmount > 0 && amountPerUnit > 0)
      .sort((a, b) => (b.product[nutrient.key] * getNutritionMultiplier(b.entry, b.product)) - (a.product[nutrient.key] * getNutritionMultiplier(a.entry, a.product)));
    if (!contributor.length) return [];
    const top = contributor[0];
    const amountToAdjust = Math.min(top.consumedAmount, Math.max(0.1, Math.ceil((excess / top.amountPerUnit) * 10) / 10));
    return [{ nutrient, product: top.product, mealKey: top.mealKey, amountToAdjust, unit: parseServing(top.product.serving)?.unit ?? "g", amountChange: top.amountPerUnit * amountToAdjust, caloriesChange: typeof top.product.calories === "number" ? (top.product.calories / parseServing(top.product.serving).amount) * amountToAdjust : null }];
  });

  return <main className="min-h-screen bg-zinc-50/70 px-4 py-8 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link to="/" className="text-sm font-semibold text-green-800 hover:text-green-900">← Ana sayfa</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Günlük beslenme kaydı</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Günlük Makro Takibi</h1><p className="mt-2 text-sm text-zinc-500">{dateLabel} · Hedeflerini isteğe bağlı gir; yediğin katalog ürünlerini öğünlere ekle.</p></div><div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs leading-5 text-zinc-500 shadow-sm">Hesap gerekmez. Kayıtların bu tarayıcıda saklanır.</div></header>

      <div className="grid items-start gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="targets-heading"><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">01 · İsteğe bağlı</p><h2 id="targets-heading" className="mt-1 text-xl font-bold text-zinc-900">Günlük hedeflerin</h2><p className="mt-1 text-sm leading-5 text-zinc-500">Kalori, protein, karbonhidrat ve yağ hedeflerini kendin girebilirsin. Boş bıraktığın hedefler için yalnızca tüketim toplamı gösterilir.</p></div><div className="grid grid-cols-2 gap-3">{nutrients.map(({ key, label, unit, max, step }) => <label key={key} className="block"><span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-zinc-700"><span>{label}</span><span className="text-xs text-zinc-400">{unit} / gün</span></span><input type="number" min="0" max={max} step={step} value={targets[key]} onChange={(event) => updateTarget(key, event.target.value)} placeholder="İsteğe bağlı" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-50" /></label>)}</div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Hedef bilgisi girmezsen herhangi bir hedef varsayılmaz. Beslenme ihtiyaçları kişiye göre değişir; bu ekran genel takip içindir.</p></section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="daily-totals-heading"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">02 · Günlük toplam</p><h2 id="daily-totals-heading" className="mt-1 text-xl font-bold text-zinc-900">Tüketim ve hedef durumu</h2></div><span className="text-xs text-zinc-400">Eklediğin miktarların toplamı</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{nutrients.map((nutrient) => {
          const total = productTotals[nutrient.key];
          const target = targets[nutrient.key] === "" ? null : Number(targets[nutrient.key]);
          const difference = target == null ? null : target - total.value;
          const progress = target && total.missing === 0 ? Math.min(100, (total.value / target) * 100) : 0;
          const totalLabel = total.missing ? `≥ ${formatQuantity(total.value)}` : formatQuantity(total.value);
          return <article key={nutrient.key} className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-medium text-zinc-500">{nutrient.label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">{totalLabel}<span className="ml-1 text-sm font-medium text-zinc-500">{nutrient.unit}</span></p></div>{target == null ? <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-zinc-400">Hedef yok</span> : total.missing ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">Veri eksik</span> : <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${difference < 0 ? "bg-rose-100 text-rose-700" : difference === 0 ? "bg-green-100 text-green-800" : "bg-white text-zinc-600"}`}>{difference < 0 ? `${formatQuantity(Math.abs(difference))} ${nutrient.unit} fazla` : difference === 0 ? "Hedefe ulaştı" : `${formatQuantity(difference)} ${nutrient.unit} kaldı`}</span>}</div>{target != null && <><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full transition-all ${difference < 0 ? "bg-rose-400" : nutrient.color}`} style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[11px] text-zinc-500">Hedef: {formatQuantity(target)} {nutrient.unit}{total.missing ? " · karşılaştırma için ürün verisi eksik" : ""}</p></>}{total.missing > 0 && <p className="mt-2 text-[10px] leading-4 text-amber-700">{total.missing} ürün kaydında bu besin değeri bulunmuyor; gösterilen toplam eksik olabilir.</p>}</article>;
        })}</div>{!Object.values(targets).some((value) => value !== "") && <p className="mt-4 text-xs leading-5 text-zinc-400">Hedef alanlarını doldurduğunda burada ne kadar kaldığını veya hedefi ne kadar aştığını görebilirsin.</p>}</section>
      </div>

      {overTargetSuggestions.length > 0 && <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6" aria-labelledby="suggestions-heading"><p className="text-xs font-semibold uppercase tracking-wider text-amber-800">03 · Kayıtlarına göre</p><h2 id="suggestions-heading" className="mt-1 text-lg font-bold text-amber-950">Hedefe yaklaşma fikirleri</h2><p className="mt-1 text-sm text-amber-900">Aşağıdaki fikirler yalnızca girdiğin hedef ve ürün kayıtlarının yaklaşık değerlerine dayanır.</p><ul className="mt-4 space-y-3">{overTargetSuggestions.map(({ nutrient, product, mealKey, amountToAdjust, unit, amountChange, caloriesChange }) => <li key={nutrient.key} className="rounded-xl bg-white/80 p-3.5 text-sm leading-6 text-zinc-700"><strong>{nutrient.label} hedefini {formatQuantity(Math.abs(productTotals[nutrient.key].value - Number(targets[nutrient.key])))} {nutrient.unit} aştın.</strong> {product.name} ürününü {mealTypes.find((meal) => meal.key === mealKey)?.label.toLocaleLowerCase("tr")} kaydında yaklaşık {formatQuantity(amountToAdjust)} {unit} azaltmayı değerlendirebilirsin. Bu değişiklik kayda göre yaklaşık {formatQuantity(amountChange)} {nutrient.unit}{caloriesChange != null ? ` ve ${formatQuantity(caloriesChange)} kcal` : ""} azaltır.</li>)}</ul><p className="mt-3 text-xs leading-5 text-amber-900">Bu otomatik öneriler tıbbi veya kişiye özel diyet tavsiyesi değildir. Bir ürünü tamamen çıkarmadan önce porsiyon ve diğer besin değerlerini birlikte değerlendir.</p></section>}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">{mealTypes.map((meal) => <MealSection key={meal.key} meal={meal} entries={meals[meal.key]} totals={mealTotals[meal.key]} onAdd={addProduct} onChangeEntry={changeEntry} onChangeMode={changeMode} onRemove={removeProduct} />)}</div>

      <footer className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 text-xs leading-5 text-zinc-500">Besin değerleri katalogdaki g/ml referans miktarına göre gramajla orantılı hesaplanır. Paket miktarı kaynakta biliniyorsa başlangıç değeri gösterilir; ambalajın farklıysa etiketteki net miktarı gir. Eksik besin değerleri sıfır kabul edilmez. Günlük hedefler ve kayıtlar hesabına yüklenmez, bu tarayıcıda tutulur.</footer>
      {storageWarning && <p role="status" className="mt-3 text-sm text-amber-800">{storageWarning}</p>}
    </div>
  </main>;
}

export default MacroTracker;
