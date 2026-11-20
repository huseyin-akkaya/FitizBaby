import { useProductCatalog } from '../hooks/useProducts';
export default function ProductStorageStatus() {
  const catalog = useProductCatalog();
  return <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
    <p role="status">{catalog.busy ? 'Ürün işlemi sürüyor…' : catalog.account ? 'Özel ürünler yalnızca bu hesaba kaydedilir. Tarayıcıdaki eski ürünler Hesabım ekranından ayrıca aktarılabilir.' : 'Eklediğin ürünler yalnızca bu tarayıcıda saklanır. Hesaba aktarılana kadar diğer cihazlara taşınmaz.'}</p>
    {catalog.error && <p role="alert" className="mt-2 text-red-700">{catalog.error} {catalog.account && <button type="button" disabled={catalog.busy} onClick={catalog.retry} className="underline">Listeyi yenile</button>}</p>}
  </div>;
}
