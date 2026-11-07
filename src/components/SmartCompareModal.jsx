import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import { getProductCategories, productBelongsToCategory } from "../data/productCategories";
import { saveComparedIds } from "../utils/comparison";

const criteria = [
  { key: "protein", label: "Daha yüksek protein", unit: "g", direction: "high" },
  { key: "sugar", label: "Daha düşük şeker", unit: "g", direction: "low" },
  { key: "calories", label: "Daha düşük kalori", unit: "kcal", direction: "low" },
  { key: "fat", label: "Daha düşük yağ", unit: "g", direction: "low" },
  { key: "saturatedFat", label: "Daha düşük doymuş yağ", unit: "g", direction: "low" },
  { key: "salt", label: "Daha düşük tuz", unit: "g", direction: "low" },
];

const numberFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

function SmartCompareModal({ onClose }) {
  const products = useProducts();
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const groups = useMemo(() => {
    const grouped = new Map();
    getProductCategories(products).forEach((category) => {
      products.filter((product) => productBelongsToCategory(product, category)).forEach((product) => {
        const key = `${category}::${product.serving}`;
        if (!grouped.has(key)) grouped.set(key, { key, category, serving: product.serving, products: [] });
        grouped.get(key).products.push(product);
      });
    });
    return [...grouped.values()]
      .filter((group) => group.products.length > 1)
      .sort((a, b) => a.category.localeCompare(b.category, "tr") || a.serving.localeCompare(b.serving, "tr"));
  }, [products]);

  const [groupKey, setGroupKey] = useState(groups[0]?.key ?? "");
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [criterionKey, setCriterionKey] = useState("protein");
  const selectedGroup = groups.find((group) => group.key === groupKey);
  const groupProducts = selectedGroup?.products ?? [];
  const first = groupProducts.find((product) => String(product.id) === firstId);
  const second = groupProducts.find((product) => String(product.id) === secondId);

  const availableCriteria = criteria.filter((criterion) => {
    if (first && second) return typeof first[criterion.key] === "number" && typeof second[criterion.key] === "number";
    if (first) return typeof first[criterion.key] === "number" && groupProducts.some((product) => product.id !== first.id && typeof product[criterion.key] === "number");
    return groupProducts.some((product) => typeof product[criterion.key] === "number");
  });
  const criterion = availableCriteria.find((item) => item.key === criterionKey) ?? availableCriteria[0];
  const firstValue = first && criterion ? first[criterion.key] : null;
  const secondValue = second && criterion ? second[criterion.key] : null;
  const winner = firstValue == null || secondValue == null || firstValue === secondValue
    ? null
    : criterion?.direction === "high"
      ? firstValue > secondValue ? first : second
      : firstValue < secondValue ? first : second;
  const hasTie = firstValue != null && secondValue != null && firstValue === secondValue;

  const resetProducts = (nextGroupKey) => {
    setGroupKey(nextGroupKey);
    setFirstId("");
    setSecondId("");
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-zinc-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="smart-compare-title" className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-5 sm:px-7">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">Hızlı ürün kararı</p><h2 id="smart-compare-title" className="mt-1 text-xl font-bold text-zinc-950 sm:text-2xl">İki ürünü önceliğine göre karşılaştır</h2><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Bir ürün grubundan iki seçenek belirle; senin için önemli olan besin ölçütünü seç. Aynı referans ölçüdeki değerleri kıyaslayalım.</p></div>
        <button type="button" onClick={onClose} aria-label="Akıllı karşılaştırmayı kapat" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-2xl leading-none text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">×</button>
      </header>

      <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
        <label className="block"><span className="mb-2 block text-sm font-semibold text-zinc-800">Ürün grubu</span><select value={groupKey} onChange={(event) => resetProducts(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100">{groups.map((group) => <option key={group.key} value={group.key}>{group.category} · {group.serving}</option>)}</select><span className="mt-1.5 block text-xs text-zinc-400">Benzer ölçülerdeki ürünleri seçmek için kategori ve porsiyon referansı birlikte kullanılır.</span></label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-semibold text-zinc-800">1. ürün</span><select value={firstId} onChange={(event) => { setFirstId(event.target.value); if (event.target.value === secondId) setSecondId(""); }} className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"><option value="">Ürün seç</option>{groupProducts.map((product) => <option key={product.id} value={product.id}>{product.brand} · {product.name}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-zinc-800">2. ürün</span><select value={secondId} onChange={(event) => setSecondId(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"><option value="">Ürün seç</option>{groupProducts.filter((product) => String(product.id) !== firstId).map((product) => <option key={product.id} value={product.id}>{product.brand} · {product.name}</option>)}</select></label>
        </div>

        <fieldset><legend className="mb-2 text-sm font-semibold text-zinc-800">Bu seçimde önceliğin ne?</legend><div className="flex flex-wrap gap-2">{availableCriteria.map((item) => <button key={item.key} type="button" onClick={() => setCriterionKey(item.key)} aria-pressed={criterion?.key === item.key} className={`rounded-full border px-3 py-2 text-xs font-semibold transition sm:text-sm ${criterion?.key === item.key ? "border-green-600 bg-green-600 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-green-300 hover:text-green-800"}`}>{item.label}</button>)}</div>{availableCriteria.length === 0 && <p className="mt-2 text-sm text-zinc-500">Bu ürün grubu için karşılaştırılabilir ölçüt bilgisi bulunmuyor.</p>}</fieldset>

        {first && second && criterion && <section aria-live="polite" className="rounded-2xl border border-green-100 bg-green-50/70 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3">
            {[first, second].map((product) => <div key={product.id} className={`rounded-xl border bg-white p-3 ${winner?.id === product.id ? "border-green-400 ring-1 ring-green-200" : "border-zinc-100"}`}><div className="flex items-center gap-2"><img src={product.image} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-zinc-50 object-contain p-1" /><div className="min-w-0"><p className="text-[11px] text-zinc-500">{product.brand}</p><p className="truncate text-sm font-semibold text-zinc-900">{product.name}</p></div></div><p className="mt-3 text-xs text-zinc-500">{criterion.label}</p><p className="mt-0.5 text-lg font-bold text-zinc-900">{numberFormat.format(product[criterion.key])} {criterion.unit}</p><p className="text-[11px] text-zinc-400">/{product.serving}</p></div>)}
          </div>
          <div className="mt-4 rounded-xl bg-white/80 p-3.5">
            {winner ? <><p className="text-sm font-bold text-green-900">Bu ölçütte öne çıkan: {winner.brand} {winner.name}</p><p className="mt-1 text-sm leading-5 text-zinc-600">Seçtiğin kritere göre değeri daha {criterion.direction === "high" ? "yüksek" : "düşük"} ({numberFormat.format(winner[criterion.key])} {criterion.unit}/{winner.serving}).</p></> : hasTie ? <><p className="text-sm font-bold text-zinc-900">Bu ölçütte değerler eşit</p><p className="mt-1 text-sm text-zinc-600">Başka bir ölçüt seçerek bu iki ürünü farklı bir açıdan değerlendirebilirsin.</p></> : <><p className="text-sm font-bold text-zinc-900">Bu ölçüt için yeterli veri yok</p><p className="mt-1 text-sm text-zinc-600">Ürün kaynaklarında bu besin değeri eksik olduğu için güvenilir bir sıralama yapamıyoruz.</p></>}
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">Sonuç yalnızca seçtiğin iki ürünü ve ölçütü karşılaştırır; genel sağlık veya kişisel beslenme önerisi değildir.</p>
          <Link to="/compare" onClick={() => saveComparedIds([first.id, second.id])} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green-800 underline decoration-green-300 underline-offset-4 hover:text-green-950">Tüm ölçütleri, içerikleri ve genel katalog puanını incele <span aria-hidden="true">→</span></Link>
        </section>}
      </div>
    </section>
  </div>;
}

export default SmartCompareModal;
