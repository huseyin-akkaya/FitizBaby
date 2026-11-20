import ImportNutrition from '../components/ImportNutrition';
import ImportProducts from '../components/ImportProducts';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';

export default function Account() {
  const { user, loading, error } = useAuth();
  const favorites = useFavorites();
  if (loading) return <main className="p-10" role="status">Oturum kontrol ediliyor…</main>;
  if (!user) return error ? <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Hesabına ulaşılamadı</h1><p role="alert" className="mt-4">{error}</p><Link to="/login" className="mt-4 inline-block text-green-700 underline">Giriş sayfasına dön</Link></main> : <Navigate to="/login" replace />;
  return <main className="min-h-screen bg-zinc-50 px-4 py-10"><section className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
    <p className="text-sm font-semibold text-green-700">FITIZBABY HESABIN</p><h1 className="mt-2 text-3xl font-bold">Hoş geldin, {user.name}</h1><p className="mt-3 break-words text-zinc-600">{user.email}</p>
    <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
      <h2 className="text-lg font-bold">Hesaba bağlı favoriler</h2>
      <p className="mt-2 text-sm leading-6">Favorilerin veritabanında bu hesaba kaydedilir. Giriş yaptığın diğer tarayıcıdan da erişebilirsin. Özel ürünü başka cihazda görüntülemek için ürünün kendisini de aşağıdan hesabına aktar.</p>
      <p role="status" className="mt-3 text-sm">{favorites.loading ? 'Favoriler yükleniyor…' : `Hesabında ${favorites.favoriteIds.length} favori var.`}</p>
      <p className="mt-3 text-sm">Bu tarayıcıda {favorites.localCount} misafir favorisi bulunuyor. Paylaşılan bilgisayardaysan yalnızca sana ait kayıtları aktar. Aktarım mevcut hesap favorilerinle birleştirir; tekrar yapılması kopya oluşturmaz ve tarayıcı kaydını silmez.</p>
      <button type="button" disabled={favorites.loading || favorites.busy || !favorites.localCount} onClick={favorites.importLocalFavorites} className="mt-4 rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{favorites.busy ? 'Kaydediliyor…' : 'Tarayıcı favorilerini hesabıma aktar'}</button>
      {favorites.error && <p role="alert" className="mt-3 text-sm text-red-700">{favorites.error} <button type="button" onClick={favorites.retry} className="underline">Yeniden dene</button></p>}
      {favorites.notice && <p role="status" className="mt-3 text-sm text-green-900">{favorites.notice}</p>}
    </section>
    <ImportProducts /><ImportNutrition />
    <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Hesabına aktarılmamış misafir kayıtları bu tarayıcıda kalır. Giriş yapınca profil, plan ve günlük kayıtlar ayrı hesap alanından okunur; değişikliklerini ilgili sayfadaki kaydet düğmesiyle hesabına gönder. Bu yerel kayıtlar aynı tarayıcıyı kullanan kişilerce görülebilir.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Link to="/nutrition-plan" className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white">Beslenme planım</Link><Link to="/products" className="rounded-xl border border-zinc-200 px-4 py-3 font-semibold">Ürünleri keşfet</Link></div>
  </section></main>;
}
