import { useProductCatalog } from '../hooks/useProducts';
export default function ImportProducts() {
  const catalog = useProductCatalog();
  return <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
    <h2 className="text-lg font-bold">Hesaba bağlı ürünler</h2>
    <p className="mt-2 text-sm leading-6">Giriş yaparak eklediğin ürünler bu hesaba kaydedilir. Ürün detayından kendi ürününü düzenleyip silebilirsin. Hazır katalog değişmez.</p>
    <p className="mt-3 text-sm">Bu tarayıcıda aktarılabilecek {catalog.localCount} ürün var. Paylaşılan bilgisayarda yalnızca sana ait kayıtları aktar. Aktarım ürünleri tek tek kaydeder; hata olursa önceki başarılı kayıtlar kalır. Tekrar aktarım kopya oluşturmaz, düzenlediğin ürünleri ezmez ve sildiğin ürünleri geri getirmez. Yerel kaynak silinmez.</p>
    {catalog.localSkipped > 0 && <p className="mt-2 text-sm text-amber-900">Geçersiz {catalog.localSkipped} yerel kayıt korunuyor; otomatik aktarılmayacak.</p>}
    <button type="button" disabled={!catalog.ready || catalog.busy || !catalog.localCount} onClick={catalog.importProducts} className="mt-4 rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{catalog.busy ? 'Kaydediliyor…' : 'Tarayıcı ürünlerini hesabıma aktar'}</button>
    {catalog.notice && <p role="status" className="mt-3 text-sm text-green-900">{catalog.notice}</p>}
    {catalog.error && <p role="alert" className="mt-3 text-sm text-red-700">{catalog.error} <button type="button" disabled={catalog.busy} onClick={catalog.retry} className="underline">Listeyi yenile</button></p>}
  </section>;
}
