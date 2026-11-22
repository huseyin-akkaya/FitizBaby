import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import { getProductCategories, getProductCategoryNames, productBelongsToCategory } from "../data/productCategories";
import { COMPARE_STORAGE_KEY, getComparisonResult, readComparedIds } from "../utils/comparison";

const nutrientRows = [
  ["Kalori", "calories", "kcal", "low"], ["Protein", "protein", "g", "high"],
  ["Karbonhidrat", "carbs", "g", null], ["Şeker", "sugar", "g", "low"],
  ["Yağ", "fat", "g", "low"], ["Doymuş yağ", "saturatedFat", "g", "low"],
  ["Trans yağ", "transFat", "g", "low"], ["Lif", "fiber", "g", "high"], ["Tuz", "salt", "g", "low"],
];
const additivePattern = /tatlandırıcı|koruyucu|stabilizör|emülgatör|renklendirici|aroma verici|topaklanmayı önleyici|asitlik düzenleyici|antioksidan|lezzet artırıcı/i;
const sweetenerPattern = /tatlandırıcı|sukraloz|steviol|aspartam|asesülfam|sorbitol|maltitol|eritritol/i;
const palmPattern = /palm yağı|palmiye yağı/i;

function Compare() {
  const products = useProducts();
  const [selectedIds, setSelectedIds] = useState(readComparedIds);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tümü");
  const selected = useMemo(() => selectedIds.map((id) => products.find((product) => String(product.id) === String(id))).filter(Boolean), [products, selectedIds]);
  const categories = useMemo(() => ["Tümü", ...getProductCategories(products)], [products]);
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr");
    return products.filter((product) => !selectedIds.some((id) => String(id) === String(product.id))
      && productBelongsToCategory(product, category)
      && `${product.name} ${product.brand} ${getProductCategoryNames(product).join(" ")}`.toLocaleLowerCase("tr").includes(normalized));
  }, [products, query, category, selectedIds]);
  const result = useMemo(() => getComparisonResult(selected), [selected]);
  const sameServing = selected.length > 1 && selected.every((product) => product.serving === selected[0].serving);
  const mixedCategories = new Set(selected.map((product) => product.category)).size > 1;

  useEffect(() => {
    try { localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(selectedIds)); } catch { /* Storage unavailable. */ }
  }, [selectedIds]);

  const addProduct = (id) => {
    setSelectedIds((current) => current.length >= 4 || current.some((item) => String(item) === String(id)) ? current : [...current, id]);
  };
  const removeProduct = (id) => setSelectedIds((current) => current.filter((item) => String(item) !== String(id)));
  const cleanList = (items) => items?.length ? items.join(", ") : "Kaynakta belirtilmemiş";
  const signal = (product, pattern) => {
    if (!product.ingredients?.length || !product.ingredientSource?.url) return "Bilgi mevcut değil";
    return product.ingredients.some((item) => pattern.test(item)) ? "İçerik listesinde belirtilmiş" : "Listelenmemiş";
  };

  return <main className="min-h-screen bg-zinc-50/70">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-8"><p className="mb-2 text-sm font-semibold text-green-700">BİRLİKTE DEĞERLENDİR</p><h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Ürün <em>karşılaştırma</em></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">2–4 ürünü besin değerleri ve kaynaklı içerik bilgileriyle yan yana incele. Değerler ürün kaydındaki referans ölçüye göredir.</p></header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="choose-title">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="choose-title" className="text-lg font-bold text-zinc-900">Ürünlerini seç</h2><p className="mt-1 text-sm text-zinc-500">En az 2, en fazla 4 ürün. {selected.length}/4 seçili</p></div><Link to="/products" className="text-sm font-semibold text-green-700 hover:text-green-800">Ürün kataloğuna git →</Link></div>
        <div className="mt-4 flex flex-wrap gap-2">{selected.map((product) => <span key={product.id} className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 py-1.5 pl-2 pr-1.5 text-sm text-green-900"><img src={product.image} alt="" className="h-7 w-7 rounded-full bg-white object-contain" />{product.name}<button type="button" onClick={() => removeProduct(product.id)} aria-label={`${product.name} karşılaştırmadan çıkar`} className="flex h-6 w-6 items-center justify-center rounded-full text-green-800 hover:bg-green-100">×</button></span>)}{selected.length === 0 && <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">Karşılaştırmaya başlamak için aşağıdan ürün ekle.</p>}</div>
        {selected.length < 4 && <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><label><span className="sr-only">Ürün ara</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün veya marka ara..." className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" /></label><label><span className="sr-only">Kategori seç</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 outline-none focus:border-green-500">{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div>}
        {selected.length < 4 && <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.length ? filteredProducts.map((product) => <button key={product.id} type="button" onClick={() => addProduct(product.id)} className="flex min-w-0 items-center gap-3 rounded-xl border border-zinc-200 p-3 text-left transition hover:border-green-300 hover:bg-green-50/50"><img src={product.image} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-zinc-50 object-contain p-1" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-zinc-900">{product.name}</span><span className="block text-xs text-zinc-500">{product.brand} · {product.category}</span></span><span className="text-lg font-medium text-green-700">+</span></button>) : <p className="py-4 text-sm text-zinc-500">Bu filtreyle eklenebilecek ürün yok.</p>}</div>}
        {selected.length === 4 && <p className="mt-4 text-sm text-zinc-500">Dört ürün seçildi. Başka bir ürün eklemek için önce birini kaldır.</p>}
      </section>

      {selected.some(product => product.userProvided) && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Karşılaştırmada kullanıcı tarafından eklenen ürün var. Bu ürünün etiket verileri bağımsız doğrulanmadı; sonuç girilen bilgilere dayanır.</p>}
      {mixedCategories && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><strong>Kategori uyarısı:</strong> Farklı kategorilerdeki ürünleri karşılaştırıyorsun. Besin ve içerik bilgileri yan yana gösterilir; sonuç kendi başına kişisel beslenme hedefine göre seçim anlamına gelmez.</div>}
      {selected.length === 1 && <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center"><h2 className="font-semibold text-zinc-900">Karşılaştırmak için bir ürün daha ekle</h2><p className="mt-1 text-sm text-zinc-500">Arama alanından ikinci ürünü seçtiğinde tablolar ve sonuç burada görünür.</p></div>}
      {selected.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center"><h2 className="font-semibold text-zinc-900">Karşılaştırma henüz başlamadı</h2><p className="mt-1 text-sm text-zinc-500">Ürün ara veya ürün kataloğundan karşılaştırma listene ürün ekle.</p></div>}

      {selected.length >= 2 && <div className="mt-6 space-y-6">
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm" aria-labelledby="nutrition-heading"><div className="border-b border-zinc-100 p-5 sm:p-6"><h2 id="nutrition-heading" className="text-xl font-bold text-zinc-950">Besin değerleri</h2><p className="mt-1 text-sm text-zinc-500">Karşılaştırma, ürün kayıtlarında aynı referans ölçü tanımlandığında yapılır.</p></div>
          {!sameServing && <p className="mx-5 mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900 sm:mx-6">Referans ölçüleri farklı ({selected.map((product) => `${product.name}: ${product.serving || "belirtilmemiş"}`).join(" · ")}). Besin değerleri gösteriliyor; doğrudan sıralama ve bu değerlere dayalı puanlama yapılmıyor.</p>}
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-sm"><thead><tr className="bg-zinc-50 text-left"><th className="sticky left-0 bg-zinc-50 px-5 py-3 font-semibold text-zinc-600">Besin öğesi</th>{selected.map((product) => <th key={product.id} className="min-w-36 px-4 py-3 font-semibold text-zinc-800"><span>{product.name}</span><span className="mt-1 block text-xs font-normal text-zinc-500">{product.serving || "Referans ölçü yok"}</span></th>)}</tr></thead><tbody>{nutrientRows.filter(([, key]) => selected.some((product) => product[key] != null)).map(([label, key, unit, direction]) => { const vals = selected.map((product) => product[key]); const best = sameServing && direction && vals.every((item) => typeof item === "number") ? (direction === "high" ? Math.max(...vals) : Math.min(...vals)) : null; return <tr key={key} className="border-t border-zinc-100"><th className="sticky left-0 bg-white px-5 py-3 text-left font-medium text-zinc-700">{label}{!direction && <span className="ml-2 text-[10px] font-normal text-zinc-400">hedefe göre değişir</span>}</th>{selected.map((product) => <td key={product.id} className={`px-4 py-3 ${best != null && product[key] === best ? "bg-green-50 font-semibold text-green-800" : "text-zinc-700"}`}>{product[key] == null ? "Bilgi yok" : `${product[key]} ${unit}`}</td>)}</tr>; })}</tbody></table></div>
          <p className="border-t border-zinc-100 px-5 py-3 text-xs leading-5 text-zinc-400">Yeşil vurgular yalnızca aynı referans ölçüde karşılaştırılabilen kriterlerde öne çıkan değeri gösterir. Karbonhidrat nötr bırakılır.</p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm" aria-labelledby="ingredients-heading"><div className="border-b border-zinc-100 p-5 sm:p-6"><h2 id="ingredients-heading" className="text-xl font-bold text-zinc-950">İçerik karşılaştırması</h2><p className="mt-1 text-sm text-zinc-500">Kaynakta bulunan ürün etiketi bilgileri; eksik bilgiler için çıkarım yapılmaz.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-sm"><thead><tr className="bg-zinc-50 text-left"><th className="sticky left-0 bg-zinc-50 px-5 py-3 font-semibold text-zinc-600">Bilgi</th>{selected.map((product) => <th key={product.id} className="min-w-48 px-4 py-3 font-semibold text-zinc-800">{product.name}</th>)}</tr></thead><tbody>
            <tr className="border-t border-zinc-100"><th className="sticky left-0 bg-white px-5 py-3 text-left align-top font-medium text-zinc-700">İçerik listesi</th>{selected.map((product) => <td key={product.id} className="px-4 py-3 align-top leading-6 text-zinc-600">{product.ingredients?.length ? <><ol className="list-inside list-decimal space-y-1">{product.ingredients.map((item, index) => <li key={`${product.id}-${index}`}>{item}</li>)}</ol>{product.ingredientSource?.url && <a className="mt-2 inline-block text-xs font-semibold text-green-700 underline" href={product.ingredientSource.url} target="_blank" rel="noreferrer">Kaynak: {product.ingredientSource.label}</a>}</> : "Bilgi mevcut değil"}</td>)}</tr>
            <tr className="border-t border-zinc-100"><th className="sticky left-0 bg-white px-5 py-3 text-left align-top font-medium text-zinc-700">Alerjenler</th>{selected.map((product) => <td key={product.id} className="px-4 py-3 align-top leading-6 text-zinc-600">{product.allergenInfo ? <><p><strong>İçerir:</strong> {cleanList(product.allergenInfo.contains)}</p><p><strong>Eser miktar:</strong> {product.allergenInfo.mayContain === null ? "Kaynakta belirtilmemiş" : cleanList(product.allergenInfo.mayContain)}</p></> : "Bilgi mevcut değil"}</td>)}</tr>
            {[["Tatlandırıcı", sweetenerPattern], ["Katkı bilgisi", additivePattern], ["Palm yağı", palmPattern]].map(([label, pattern]) => <tr key={label} className="border-t border-zinc-100"><th className="sticky left-0 bg-white px-5 py-3 text-left font-medium text-zinc-700">{label}</th>{selected.map((product) => <td key={`${label}-${product.id}`} className="px-4 py-3 text-zinc-600">{signal(product, pattern)}</td>)}</tr>)}
          </tbody></table></div>
          <p className="border-t border-zinc-100 px-5 py-3 text-xs leading-5 text-zinc-400">Tatlandırıcı ve katkı satırları yalnızca kaynaklı içerik listesinde terim bulunmasına bakar; listelenmemesi kesin yokluk beyanı değildir. Alerjen veya katkı bilgisi, kişisel hassasiyetler bilinmeden puanlanmaz.</p>
        </section>

        <section className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="result-heading"><p className="text-sm font-semibold text-green-700">KARŞILAŞTIRMA SONUCU</p><h2 id="result-heading" className="mt-1 text-xl font-bold text-zinc-950">{result.winner ? `Öne çıkan ürün: ${result.winner.name}` : result.tiedProducts.length ? "Sonuç: Berabere" : "Yeterli karşılaştırılabilir veri yok"}</h2>
          {result.winner ? <><p className="mt-2 text-sm leading-6 text-zinc-600">Bu sonuç, mevcut katalog bilgilerine göre tanımlı kriterlerde en yüksek puanı alan ürünü gösterir.</p><ul className="mt-4 space-y-2">{result.reasons[result.winner.id].length ? result.reasons[result.winner.id].map((reason) => <li key={reason} className="flex gap-2 text-sm text-zinc-700"><span className="font-bold text-green-700">✓</span>{reason}</li>) : <li className="text-sm text-zinc-500">Kazananı ayıran bir kriter bulunamadı.</li>}</ul></> : result.tiedProducts.length ? <p className="mt-2 text-sm leading-6 text-zinc-600">{result.tiedProducts.map((product) => product.name).join(", ")} aynı toplam puanı aldı. Bu karşılaştırmada tek bir kazanan yok.</p> : <p className="mt-2 text-sm leading-6 text-zinc-600">Aynı ölçüde besin değeri veya karşılaştırılabilir içerik listesi puanlama için yeterli değil; ürünleri inceleyip kendi tercihini yapabilirsin.</p>}
          <div className="mt-5 rounded-xl bg-zinc-50 p-4"><h3 className="text-sm font-semibold text-zinc-800">Kazananı belirleyen kriterler</h3><p className="mt-1 text-sm leading-6 text-zinc-600">Aynı referans ölçüde protein yüksek; şeker, kalori ve yağ düşük olduğunda 1 puan verilir. Karbonhidrat, alerjen ve katkı bilgileri genel skora katılmaz. Puanlar eşitse berabere gösterilir.</p>{result.applicable.length > 0 && <p className="mt-2 text-xs text-zinc-500">Bu karşılaştırmada kullanılanlar: {result.applicable.join(", ")}.</p>}</div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{selected.map((product) => <div key={product.id} className={`rounded-xl border p-3 ${result.winner?.id === product.id ? "border-green-200 bg-green-50" : "border-zinc-200 bg-white"}`}><p className="truncate text-sm font-semibold text-zinc-900">{product.name}</p><p className="mt-1 text-xs text-zinc-500">Puan: {result.scores[product.id]}</p><p className="mt-2 text-xs leading-5 text-zinc-600">{result.reasons[product.id].length ? result.reasons[product.id].join(" · ") : "Öne çıkan kriter yok"}</p></div>)}</div>
        </section>
        <p className="text-xs leading-5 text-zinc-400">Bu puanlama şeffaf katalog karşılaştırmasıdır; sağlık önerisi veya kişisel beslenme değerlendirmesi değildir. Ürün etiketleri zamanla değişebilir. {sameServing ? `Besin referansı: ${selected[0].serving}.` : "Besin değerleri aynı referans ölçüde olmadığı için skora katılmadı."}</p>
      </div>}
    </div>
  </main>;
}

export default Compare;
