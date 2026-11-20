import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Account() {
  const { user, loading, error } = useAuth();
  if (loading) return <main className="p-10" role="status">Oturum kontrol ediliyor…</main>;
  if (!user) return error ? <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Hesabına ulaşılamadı</h1><p role="alert" className="mt-4">{error}</p><Link to="/login" className="mt-4 inline-block text-green-700 underline">Giriş sayfasına dön</Link></main> : <Navigate to="/login" replace />;
  return <main className="min-h-screen bg-zinc-50 px-4 py-10"><section className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold text-green-700">FITIZBABY HESABIN</p><h1 className="mt-2 text-3xl font-bold">Hoş geldin, {user.name}</h1><p className="mt-3 break-words text-zinc-600">{user.email}</p><p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Hesap ve oturum sistemi bağlı. Ürünler, favoriler ve beslenme kayıtları bu aşamada hâlâ bu tarayıcıda saklanır; henüz hesabına veya diğer cihazlara aktarılmaz.</p><div className="mt-6 flex flex-wrap gap-3"><Link to="/nutrition-plan" className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white">Beslenme planım</Link><Link to="/products" className="rounded-xl border border-zinc-200 px-4 py-3 font-semibold">Ürünleri keşfet</Link></div></section></main>;
}
