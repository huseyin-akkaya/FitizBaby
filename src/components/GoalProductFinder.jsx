import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { products } from "../data/products";
import { getProductCategories, productBelongsToCategory } from "../data/productCategories";

const goals = [
  { key: "protein", label: "Protein yüksek", direction: "high", unit: "g" },
  { key: "sugar", label: "Şeker düşük", direction: "low", unit: "g" },
  { key: "calories", label: "Kalori düşük", direction: "low", unit: "kcal" },
  { key: "saturatedFat", label: "Doymuş yağ düşük", direction: "low", unit: "g" },
  { key: "fiber", label: "Lif yüksek", direction: "high", unit: "g" },
  { key: "salt", label: "Tuz düşük", direction: "low", unit: "g" },
];

const numberFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

function GoalProductFinder({ onClose }) {
  const categories = useMemo(() => ["Tümü", ...getProductCategories(products)], []);
  const [selectedCategory, setSelectedCategory] = useState("Protein Kaynakları");
  const [goalKey, setGoalKey] = useState("protein");
  const scopedProducts = products.filter((product) => productBelongsToCategory(product, selectedCategory));
  const availableGoals = goals.filter((goal) => scopedProducts.some((product) => typeof product[goal.key] === "number"));
  const activeGoal = availableGoals.find((goal) => goal.key === goalKey) ?? availableGoals[0];

  const resultGroups = (() => {
    if (!activeGoal) return [];
    const grouped = new Map();
    scopedProducts.forEach((product) => {
      if (typeof product[activeGoal.key] !== "number") return;
      const groupCategory = selectedCategory === "Tümü" ? product.category : selectedCategory;
      const key = `${groupCategory}::${product.serving}`;
      if (!grouped.has(key)) grouped.set(key, { key, category: groupCategory, serving: product.serving, products: [] });
      grouped.get(key).products.push(product);
    });
    return [...grouped.values()]
      .map((group) => ({
        ...group,
        products: group.products.sort((a, b) => activeGoal.direction === "high"
          ? b[activeGoal.key] - a[activeGoal.key]
          : a[activeGoal.key] - b[activeGoal.key]),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, "tr") || a.serving.localeCompare(b.serving, "tr"));
  })();

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-zinc-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="goal-finder-title" className="my-auto max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-100 bg-white px-5 py-5 sm:px-7">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Katalogdan keşfet</p><h2 id="goal-finder-title" className="mt-1 text-xl font-bold text-zinc-950 sm:text-2xl">Hedefine uygun ürünleri bul</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Bir ürün kategorisi ve besin önceliği seç. Ürünleri kendi kategorileri ve referans ölçüleri içinde sıralayalım.</p></div>
        <button type="button" onClick={onClose} aria-label="Hedefe göre ürün seçimini kapat" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-2xl leading-none text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">×</button>
      </header>

      <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <label className="block"><span className="mb-2 block text-sm font-semibold text-zinc-800">Kategori</span><select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <fieldset><legend className="mb-2 text-sm font-semibold text-zinc-800">Besin önceliğin</legend><div className="flex flex-wrap gap-2">{availableGoals.map((goal) => <button key={goal.key} type="button" onClick={() => setGoalKey(goal.key)} aria-pressed={activeGoal?.key === goal.key} className={`rounded-full border px-3 py-2 text-xs font-semibold transition sm:text-sm ${activeGoal?.key === goal.key ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 hover:text-violet-800"}`}>{goal.label}</button>)}</div>{availableGoals.length === 0 && <p className="mt-2 text-sm text-zinc-500">Bu kategoride hedef seçmek için yeterli besin verisi yok.</p>}</fieldset>
        </div>

        {activeGoal && <div aria-live="polite" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-zinc-900">{selectedCategory === "Tümü" ? "Kategorilere göre önerilen ürünler" : `${selectedCategory} ürünleri`}</h3><p className="text-xs text-zinc-500">{activeGoal.label} · her ürün grubunda ilk 3</p></div>
          {resultGroups.length ? resultGroups.map((group) => <section key={group.key} className="rounded-2xl border border-zinc-200 p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-2"><h4 className="text-sm font-bold text-zinc-800">{group.category}</h4><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500">{group.serving} başına</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.products.slice(0, 3).map((product, index) => <article key={product.id} className={`overflow-hidden rounded-xl border ${index === 0 ? "border-violet-200 bg-violet-50/50" : "border-zinc-100 bg-white"}`}><Link to={`/products/${product.id}`} onClick={onClose} className="flex h-full items-center gap-3 p-3 transition hover:bg-violet-50"><img src={product.image} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain p-1" /><span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-[11px] text-zinc-500">{product.brand}</span>{index === 0 && <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-800">ÖNE ÇIKAN</span>}</span><span className="mt-0.5 block truncate text-sm font-semibold text-zinc-900">{product.name}</span><span className="mt-1 block text-xs font-bold text-violet-800">{numberFormat.format(product[activeGoal.key])} {activeGoal.unit}</span></span></Link></article>)}</div></section>) : <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">Bu hedef ve kategori için kaynaklı ürün değeri bulunamadı.</p>}
          <p className="rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">Sıralama yalnızca kaydı bulunan besin değerini kullanır. Farklı kategoriler veya referans ölçüler birbirleriyle sıralanmaz. Ürün verileri örnek amaçlıdır; satın almadan önce ambalajdaki güncel etiketi kontrol et.</p>
        </div>}
      </div>
    </section>
  </div>;
}

export default GoalProductFinder;
