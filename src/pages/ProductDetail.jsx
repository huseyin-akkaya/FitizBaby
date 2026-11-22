import ManageProduct from "../components/ManageProduct";
import ProductStorageStatus from "../components/ProductStorageStatus";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProductCatalog, useProducts } from "../hooks/useProducts";
import ProductHealth from "../components/ProductHealth";
import { useFavorites } from "../hooks/useFavorites";
import FavoritesStatus from "../components/FavoritesStatus";

const nutrients = [
  ["Kalori", "calories", "kcal"],
  ["Protein", "protein", "g"],
  ["Karbonhidrat", "carbs", "g"],
  ["Şeker", "sugar", "g"],
  ["Yağ", "fat", "g"],
  ["Doymuş yağ", "saturatedFat", "g"],
  ["Trans yağ", "transFat", "g"],
  ["Lif", "fiber", "g"],
  ["Tuz", "salt", "g"],
];

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const products = useProducts();
  const catalog = useProductCatalog();
  const product = products.find(item => String(item.id) === String(id));
  const { favoriteIds, toggleFavorite, loading: favoritesLoading, busy: favoritesBusy } = useFavorites();

  if (!product && !catalog.ready) return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Ürün bilgisi yüklenemedi</h1><div className="mt-4"><ProductStorageStatus /></div><Link to="/products" className="text-green-700 underline">Ürünlere dön</Link></main>;

  if (!product) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-zinc-50 px-4 py-16 text-center">
        <div>
          <p className="text-sm font-semibold text-green-700">ÜRÜN BULUNAMADI</p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">Bu ürün kataloğumuzda yok.</h1>
          <Link to="/products" className="mt-6 inline-flex rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700">Ürünlere dön</Link>
        </div>
      </main>
    );
  }

  const isFavorite = favoriteIds.includes(product.id);

  return (
    <main className="min-h-screen bg-zinc-50/70">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <button type="button" onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-green-700">
          <span aria-hidden="true">←</span> Geri dön
        </button>
        <ProductStorageStatus /><FavoritesStatus /><ManageProduct product={product} />
        <article className="grid overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm lg:grid-cols-2 lg:items-start">
          <div className={`flex min-h-80 items-center justify-center bg-gradient-to-br p-8 sm:min-h-[480px] sm:p-12 ${product.accent}`}>
            <img src={product.image} alt={product.imageAlt ?? product.name} className="h-72 w-72 max-w-full object-contain sm:h-96 sm:w-96" />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <p className="text-sm font-semibold text-green-700">{product.category}</p>
            <p className="mt-5 text-sm font-medium text-zinc-500">{product.brand}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl"><em>{product.name}</em></h1>
            <p className="mt-4 leading-7 text-zinc-600">{product.description}</p>

            <button type="button" disabled={favoritesLoading || favoritesBusy} onClick={() => toggleFavorite(product.id)} aria-pressed={isFavorite} className={`mt-6 inline-flex w-fit items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${isFavorite ? "border-rose-200 bg-rose-50 text-rose-600" : "border-zinc-200 text-zinc-700 hover:border-rose-200 hover:text-rose-600"}`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
              {isFavorite ? "Favorilerimde" : "Favorilere ekle"}
            </button>

            <section className="mt-8" aria-labelledby="nutrition-title">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 id="nutrition-title" className="text-lg font-bold text-zinc-900">Besin değerleri</h2>
                <p className="text-xs text-zinc-400">{product.serving} için</p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {nutrients.filter(([, field]) => product[field] != null).map(([label, field, unit]) => (
                  <div key={field} className="rounded-xl bg-zinc-50 p-4">
                    <dt className="text-xs text-zinc-500">{label}</dt>
                    <dd className="mt-1 text-lg font-bold text-zinc-900">{product[field]} <span className="text-sm font-medium text-zinc-500">{unit}</span></dd>
                  </div>
                ))}
              </dl>
              {product.nutritionNote && <p className="mt-3 text-sm text-amber-800">{product.nutritionNote}</p>}
              {product.nutritionSource ? (
                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  {product.userProvided ? "Kullanıcının belirttiği besin kaynağı: " : "Bu ürünün besin değerlerinin kaynağı: "}<a href={product.nutritionSource.url} target="_blank" rel="noreferrer" className="font-semibold text-green-700 underline underline-offset-2">{product.nutritionSource.label}</a> · Ürün ambalajındaki güncel değerleri kontrol edin.
                </p>
              ) : (
                <p className="mt-4 text-xs leading-5 text-zinc-400">Bu ürün için bağımsız doğrulanmış besin kaynağı yok. Gerçek tüketim bilgisi için ambalajı kontrol edin.</p>
              )}
            </section>
            <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6" aria-labelledby="ingredients-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="ingredients-title" className="text-lg font-bold text-zinc-900">İçindekiler</h2>
                  <p className="mt-1 text-xs text-zinc-500">Üretici veya ürün etiketi kaynağındaki sırayla</p>
                </div>
                {product.ingredientSource.url ? <a href={product.ingredientSource.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-green-700 underline decoration-green-200 underline-offset-4 hover:text-green-800">
                  Kaynak: {product.ingredientSource.label}
                </a> : <span className="text-xs text-zinc-500">Kaynak bağlantısı eklenmedi</span>}
              </div>
              <ol className="mt-4 space-y-2">
                {product.ingredients.map((ingredient, index) => (
                  <li key={ingredient} className="flex gap-3 text-sm leading-6 text-zinc-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-500">{index + 1}</span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-xl bg-amber-50 p-4" aria-labelledby="allergen-title">
                <h3 id="allergen-title" className="text-sm font-bold text-zinc-900">Alerjen ve eser miktar bilgisi</h3>
                {product.allergenInfo.contains.length > 0 ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-700"><span className="font-semibold">İçerir:</span> {product.allergenInfo.contains.join(", ")}</p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-zinc-700">Kaynak sayfada alerjen beyanı ayrıca yayımlanmamış.</p>
                )}
                {product.allergenInfo.mayContain === null ? (
                  <p className="mt-1 text-sm leading-6 text-zinc-600">Eser miktarda / çapraz temas bilgisi kaynakta belirtilmemiş.</p>
                ) : product.allergenInfo.mayContain.length > 0 ? (
                  <p className="mt-1 text-sm leading-6 text-zinc-700"><span className="font-semibold">Eser miktarda içerebilir:</span> {product.allergenInfo.mayContain.join(", ")}</p>
                ) : null}
              </div>
              {product.consumerBenefits?.length > 0 && (
                <section className="mt-6 rounded-2xl border border-green-200 bg-green-50/70 p-5 sm:p-6" aria-labelledby="consumer-benefits-title">
                  <h3 id="consumer-benefits-title" className="text-base font-bold text-zinc-900">İçerik açısından artıları</h3>
                  <ul className="mt-4 space-y-3">
                    {product.consumerBenefits.map((benefit) => (
                      <li key={benefit.title} className="rounded-xl bg-white/85 p-4">
                        <h4 className="text-sm font-bold text-zinc-900">{benefit.title}</h4>
                        <p className="mt-1 text-sm leading-6 text-zinc-700">{benefit.text}</p>
                        {benefit.source && <a href={benefit.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-green-700 underline underline-offset-2">Kaynak: {benefit.source.label}</a>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {product.consumerNotes?.length > 0 && (
                <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6" aria-labelledby="consumer-notes-title">
                  <h3 id="consumer-notes-title" className="text-base font-bold text-zinc-900">Dikkat edilmesi gerekenler</h3>
                  <ul className="mt-4 space-y-3">
                    {product.consumerNotes.map((note) => (
                      <li key={note.title} className="rounded-xl bg-white/85 p-4">
                        <h4 className="text-sm font-bold text-zinc-900">{note.title}</h4>
                        <p className="mt-1 text-sm leading-6 text-zinc-700">{note.text}</p>
                        {note.source && <a href={note.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-green-700 underline underline-offset-2">Kaynak: {note.source.label}</a>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <p className="mt-4 text-xs leading-5 text-zinc-500">İçerikler ürün çeşidine veya ambalaj yenilemesine göre değişebilir. Alerjiniz veya hassasiyetiniz varsa tüketmeden önce elinizdeki paketin etiketini kontrol edin.</p>
              <p className="mt-2 text-[11px] text-zinc-400">Kaynak son kontrol: {product.ingredientSource.checkedAt}</p>
            </section>
            <ProductHealth product={product} />
            <Link to="/products" className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700">Ürün kataloğuna dön <span aria-hidden="true">→</span></Link>
          </div>
        </article>
      </div>
    </main>
  );
}

export default ProductDetail;
