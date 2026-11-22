import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import RangeSlider from "../components/RangeSlider";
import AddProductForm from "../components/AddProductForm";
import ProductStorageStatus from "../components/ProductStorageStatus";
import { useProductCatalog } from "../hooks/useProducts";
import { useProducts } from "../hooks/useProducts";
import { getProductCategories, getProductCategoryNames, productBelongsToCategory } from "../data/productCategories";
import { useFavorites } from "../hooks/useFavorites";
import FavoritesStatus from "../components/FavoritesStatus";
import { readComparedIds, saveComparedIds } from "../utils/comparison";

const initialFilters = { brands: [], minCalories: "", maxCalories: "", minProtein: "", maxProtein: "" };
const Heart = ({ filled = false }) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>;

function Products() {
  const products = useProducts();
  const catalog = useProductCatalog();
  const categories = ["Tümü", ...getProductCategories(products)];
  const [addingProduct, setAddingProduct] = useState(false);
  const [success, setSuccess] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const selectedCategory = categories.includes(categoryParam) ? categoryParam : "Tümü";
  const searchQuery = searchParams.get("search") ?? "";
  const [filters, setFilters] = useState(initialFilters);
  const [brandSearch, setBrandSearch] = useState("");
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [sortOption, setSortOption] = useState("default");
  const [view, setView] = useState("grid");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favoriteIds, toggleFavorite, loading: favoritesLoading, busy: favoritesBusy } = useFavorites();
  const [compareIds, setCompareIds] = useState(readComparedIds);
  useEffect(() => saveComparedIds(compareIds), [compareIds]);
  const addToCompare = (id) => setCompareIds((current) => current.some((item) => String(item) === String(id) || current.length >= 4) ? current : [...current, id]);

  const brands = [...new Set(products.map((product) => product.brand))];
  const shownBrands = brands.filter((brand) => brand.toLocaleLowerCase("tr").includes(brandSearch.toLocaleLowerCase("tr")));
  const visibleBrands = showAllBrands ? shownBrands : shownBrands.slice(0, 6);

  const results = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("tr");
    const filtered = products.filter((product) => {
      const matchesSearch = `${product.name} ${product.brand} ${getProductCategoryNames(product).join(" ")}`.toLocaleLowerCase("tr").includes(query);
      return matchesSearch && productBelongsToCategory(product, selectedCategory)
        && (!filters.brands.length || filters.brands.includes(product.brand))
        && (filters.minCalories === "" || (product.calories != null && product.calories >= Number(filters.minCalories)))
        && (filters.maxCalories === "" || (product.calories != null && product.calories <= Number(filters.maxCalories)))
        && (filters.minProtein === "" || (product.protein != null && product.protein >= Number(filters.minProtein)))
        && (filters.maxProtein === "" || (product.protein != null && product.protein <= Number(filters.maxProtein)))
        && (!favoritesOnly || favoriteIds.includes(product.id));
    });
    const compareNumber = (a,b,key,direction=1) => a[key] == null ? b[key] == null ? 0 : 1 : b[key] == null ? -1 : (a[key]-b[key])*direction;
    const sorters = {
      "protein-high": (a,b) => compareNumber(a,b,"protein",-1),
      "sugar-low": (a, b) => {
        if (a.sugar == null) return b.sugar == null ? 0 : 1;
        if (b.sugar == null) return -1;
        return a.sugar - b.sugar;
      },
      "calories-low": (a,b) => compareNumber(a,b,"calories"),
      "calories-high": (a,b) => compareNumber(a,b,"calories",-1),
      "name-asc": (a, b) => a.name.localeCompare(b.name, "tr"),
    };
    return sorters[sortOption] ? filtered.sort(sorters[sortOption]) : filtered;
  }, [products, filters, searchQuery, selectedCategory, sortOption, favoritesOnly, favoriteIds]);

  const setFilter = (key, value) => {
    if (key === "category" || key === "search") {
      const nextParams = new URLSearchParams(searchParams);
      if (key === "category") {
        if (value === "Tümü") nextParams.delete("category");
        else nextParams.set("category", value);
      } else if (value.trim()) {
        nextParams.set("search", value);
      } else {
        nextParams.delete("search");
      }
      setSearchParams(nextParams, { replace: key === "search" });
      return;
    }

    setFilters((current) => ({ ...current, [key]: value }));
  };
  const toggleBrand = (brand) => setFilters((current) => ({ ...current, brands: current.brands.includes(brand) ? current.brands.filter((item) => item !== brand) : [...current.brands, brand] }));
  const clearFilters = () => {
    setFilters(initialFilters);
    setBrandSearch("");
    setSortOption("default");
    setFavoritesOnly(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("category");
    nextParams.delete("search");
    setSearchParams(nextParams);
  };
  const hasFilters = searchQuery || selectedCategory !== "Tümü" || filters.brands.length || filters.minCalories || filters.maxCalories || filters.minProtein || filters.maxProtein || favoritesOnly;

  const rangeField = (label, minKey, maxKey, max, step, unit) => <section className="mt-6 border-t border-zinc-100 pt-5">
    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-zinc-900">{label}</h3><span className="text-xs text-zinc-400">{unit}</span></div>
    <div className="grid grid-cols-2 gap-2">
      <input aria-label={`En az ${label}`} type="number" min="0" max={max} value={filters[minKey]} placeholder="En az" onChange={(event) => setFilter(minKey, event.target.value)} className="min-w-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-green-500" />
      <input aria-label={`En çok ${label}`} type="number" min="0" max={max} value={filters[maxKey]} placeholder="En çok" onChange={(event) => setFilter(maxKey, event.target.value)} className="min-w-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-green-500" />
    </div>
    <RangeSlider label="Minimum" value={filters[minKey]} defaultValue={0} max={max} step={step} onChange={(value) => setFilter(minKey, value)} />
    <RangeSlider label="Maksimum" value={filters[maxKey]} defaultValue={max} max={max} step={step} onChange={(value) => setFilter(maxKey, value)} />
  </section>;

  return <main className="min-h-screen bg-zinc-50/70">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-sm font-semibold text-green-700">{selectedCategory === "Tümü" ? "BESLENME ÜRÜNLERİ" : "KATEGORİYE GÖRE KEŞFET"}</p><h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">{selectedCategory === "Tümü" ? <>Ürünleri <em>keşfet</em></> : selectedCategory}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Besin değerlerini incele, hedeflerine uygun seçenekleri kolayca bul.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={!catalog.ready || catalog.busy} onClick={() => { setAddingProduct(true); setSuccess(""); }} aria-expanded={addingProduct} aria-controls="add-product" className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700">+ Ürün ekle</button><button type="button" onClick={() => setFavoritesOnly((value) => !value)} className={`inline-flex w-fit items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${favoritesOnly ? "border-rose-200 bg-rose-50 text-rose-600" : "border-zinc-200 bg-white text-zinc-700 hover:border-rose-200 hover:text-rose-600"}`}><Heart filled={favoritesOnly} /> Favorilerim <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">{favoriteIds.length}</span></button></div>
      </div>

      <ProductStorageStatus /><FavoritesStatus />
      {success && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-900">{success}</p>}
      {addingProduct && <AddProductForm onCancel={() => setAddingProduct(false)} onAdded={() => { setAddingProduct(false); clearFilters(); setSuccess(catalog.account ? 'Ürün hesabına kaydedildi. Detayını açabilir, düzenleyebilir ve karşılaştırabilirsin.' : 'Ürün bu tarayıcıya kaydedildi. Hesabım ekranından ayrıca aktarabilirsin.'); }} />}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-base font-bold text-zinc-900">Filtreler</h2>{hasFilters && <button onClick={clearFilters} className="text-xs font-semibold text-green-700 hover:text-green-800">Temizle</button>}</div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-800">Kategori</h3>
          <div className="space-y-1">{categories.map((category) => <button key={category} onClick={() => setFilter("category", category)} aria-pressed={selectedCategory === category} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selectedCategory === category ? "bg-green-50 font-semibold text-green-800" : "text-zinc-600 hover:bg-zinc-50"}`}><span>{category}</span><span className="text-xs text-zinc-400">{category === "Tümü" ? products.length : products.filter((product) => productBelongsToCategory(product, category)).length}</span></button>)}</div>
          <section className="mt-6 border-t border-zinc-100 pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-zinc-900">Marka</h3>{filters.brands.length > 0 && <button onClick={() => setFilter("brands", [])} className="text-xs text-green-700">Seçimi kaldır</button>}</div><input value={brandSearch} onChange={(event) => setBrandSearch(event.target.value)} placeholder="Marka ara" aria-label="Marka ara" className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-green-500" /><div className="space-y-1">{visibleBrands.map((brand) => <label key={brand} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-600 hover:bg-zinc-50"><span className="flex items-center gap-2"><input type="checkbox" checked={filters.brands.includes(brand)} onChange={() => toggleBrand(brand)} className="h-4 w-4 accent-green-600" />{brand}</span><span className="text-xs text-zinc-400">{products.filter((product) => product.brand === brand).length}</span></label>)}</div>{shownBrands.length > 6 && <button onClick={() => setShowAllBrands((value) => !value)} className="mt-2 w-full text-center text-xs font-semibold text-green-700">{showAllBrands ? "Daha az göster" : "Tüm markaları göster"}</button>}</section>
          {rangeField("Kalori", "minCalories", "maxCalories", 1000, 10, "kcal / 100 g")}
          {rangeField("Protein", "minProtein", "maxProtein", 100, 1, "g / 100 g")}
          <p className="mt-5 text-xs leading-5 text-zinc-400">Üretici ve satıcı etiket kaynakları ürün detayındadır. Doğrulanamayan değerler — ile gösterilir; filtre ve puanlamaya dahil edilmez.</p>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex sm:items-center sm:gap-3">
            <label className="relative block min-w-0 flex-1"><span className="sr-only">Ürün, marka veya kategori ara</span><svg viewBox="0 0 24 24" className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input value={searchQuery} onChange={(event) => setFilter("search", event.target.value)} placeholder="Ürün, marka veya kategori ara..." className="w-full rounded-xl bg-zinc-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-green-100" /></label>
            <div className="mt-3 flex items-center gap-2 sm:mt-0"><label className="sr-only" htmlFor="product-sort">Sıralama</label><select id="product-sort" value={sortOption} onChange={(event) => setSortOption(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-700 outline-none focus:border-green-500 sm:flex-none"><option value="default">Önerilen</option><option value="protein-high">Protein: yüksekten düşüğe</option><option value="sugar-low">Şeker: düşükten yükseğe</option><option value="calories-low">Kalori: düşükten yükseğe</option><option value="calories-high">Kalori: yüksekten düşüğe</option><option value="name-asc">İsim: A–Z</option></select><div className="flex shrink-0 rounded-xl border border-zinc-200 p-1"><button aria-label="Grid görünümü" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={`rounded-lg p-2 ${view === "grid" ? "bg-green-50 text-green-700" : "text-zinc-400"}`}><svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor"><path d="M2 2h6v6H2zm10 0h6v6h-6zM2 12h6v6H2zm10 0h6v6h-6z"/></svg></button><button aria-label="Liste görünümü" aria-pressed={view === "list"} onClick={() => setView("list")} className={`rounded-lg p-2 ${view === "list" ? "bg-green-50 text-green-700" : "text-zinc-400"}`}><svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor"><path d="M2 3h3v3H2zm5 0h11v3H7zM2 9h3v3H2zm5 0h11v3H7zm-5 6h3v3H2zm5 0h11v3H7z"/></svg></button></div></div>
          </div>
          <div className="mb-4 flex items-center justify-between"><p className="text-sm text-zinc-500"><span className="font-semibold text-zinc-900">{results.length}</span> ürün bulundu</p><p className="text-xs text-zinc-400">Değerler kartta belirtilen 100 g veya 100 ml için</p></div>
          {results.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></div><h2 className="font-semibold text-zinc-900">Uygun ürün bulamadık</h2><p className="mt-1 text-sm text-zinc-500">Filtrelerini değiştirip yeniden deneyebilirsin.</p><button onClick={clearFilters} className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Filtreleri temizle</button></div> : <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>{results.map((product) => <article key={product.id} className={`group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${view === "list" ? "flex" : ""}`}>
            <div className={`relative overflow-hidden bg-gradient-to-br ${product.accent} ${view === "list" ? "h-36 w-36 shrink-0 sm:h-44 sm:w-52" : "h-48"}`}><Link to={`/products/${product.id}`} aria-label={`${product.name} detayını görüntüle`} className="flex h-full w-full items-center justify-center p-4"><img src={product.image} alt={product.imageAlt ?? product.name} loading="lazy" className="h-full w-full object-contain transition duration-300 group-hover:scale-105" /></Link><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm">{product.category}</span><button type="button" aria-label={favoriteIds.includes(product.id) ? `${product.name} favorilerden çıkar` : `${product.name} favorilere ekle`} aria-pressed={favoriteIds.includes(product.id)} disabled={favoritesLoading || favoritesBusy} onClick={() => toggleFavorite(product.id)} className={`absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow-sm transition hover:scale-105 ${favoriteIds.includes(product.id) ? "text-rose-500" : "text-zinc-500 hover:text-rose-500"}`}><Heart filled={favoriteIds.includes(product.id)} /></button></div>
            <div className="flex min-w-0 flex-1 flex-col p-4"><p className="text-xs font-medium text-zinc-500">{product.brand} · {product.serving}{product.userProvided ? " · Kullanıcı ürünü" : ""}</p><Link to={`/products/${product.id}`} className="mt-1 text-base font-bold text-zinc-900 hover:text-green-700">{product.name}</Link><div className="mt-4 grid grid-cols-5 divide-x divide-zinc-100 rounded-xl bg-zinc-50 py-3 text-center"><div><p className="text-sm font-bold text-zinc-900">{product.calories ?? "—"}</p><p className="text-[10px] text-zinc-500">kcal</p></div><div><p className="text-sm font-bold text-zinc-900">{product.protein == null ? "—" : `${product.protein}g`}</p><p className="text-[10px] text-zinc-500">protein</p></div><div><p className="text-sm font-bold text-zinc-900">{product.carbs == null ? "—" : `${product.carbs}g`}</p><p className="text-[10px] text-zinc-500">karb.</p></div><div><p className="text-sm font-bold text-zinc-900">{product.fat == null ? "—" : `${product.fat}g`}</p><p className="text-[10px] text-zinc-500">yağ</p></div><div><p className="text-sm font-bold text-zinc-900">{product.sugar == null ? "—" : `${product.sugar}g`}</p><p className="text-[10px] text-zinc-500">şeker</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Link to={`/products/${product.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 px-3 py-2.5 text-sm font-semibold text-green-800 transition hover:border-green-600 hover:bg-green-600 hover:text-white">Ürün detayları <span aria-hidden="true">→</span></Link><button type="button" onClick={() => addToCompare(product.id)} disabled={compareIds.some((id) => String(id) === String(product.id)) || compareIds.length >= 4} title={compareIds.length >= 4 && !compareIds.some((id) => String(id) === String(product.id)) ? "En fazla 4 ürün karşılaştırılabilir" : undefined} className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-green-300 hover:text-green-800 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400">{compareIds.some((id) => String(id) === String(product.id)) ? "Karşılaştırmada" : "Karşılaştırmaya ekle"}</button></div></div>
          </article>)}</div>}
        </section>
      </div>
    </div>
  </main>;
}

export default Products;
