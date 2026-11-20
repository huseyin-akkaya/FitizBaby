import { useFavorites } from '../hooks/useFavorites';
export default function FavoritesStatus() {
  const { account, loading, busy, error, retry } = useFavorites();
  return <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
    <p role="status">{loading ? 'Favoriler kontrol ediliyor…' : busy ? 'Favori kaydediliyor…' : account ? 'Favoriler bu hesaba kaydedilir. Eklediğin özel ürünlerin içeriği şimdilik yalnızca bu tarayıcıdadır.' : 'Misafir favorileri yalnızca bu tarayıcıda saklanır.'}</p>
    {error && <p role="alert" className="mt-2 text-red-700">{error} {account && <button type="button" onClick={retry} className="underline">Yeniden dene</button>}</p>}
  </div>;
}
