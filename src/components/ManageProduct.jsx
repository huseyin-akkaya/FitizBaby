import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddProductForm from './AddProductForm';
import { useProductCatalog } from '../hooks/useProducts';
export default function ManageProduct({ product }) {
  const catalog = useProductCatalog();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (!product.accountOwned) return product.userProvided ? <p className="mt-4 text-sm text-zinc-500">Düzenleme ve silme için ürünü Hesabım ekranından kendi hesabına aktarabilirsin.</p> : null;
  async function remove() {
    try { setError(''); await catalog.deleteProduct(product.id, product.revision); navigate('/products', { replace: true }); }
    catch (failure) { setError(failure.message); }
  }
  return <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4" aria-label="Ürün yönetimi">
    <p className="mb-3 text-sm text-zinc-600">Bu ürün hesabına aittir. Hazır katalogdaki ürünleri değiştirmez. Günlük takip henüz güncel katalog değerlerini kullanır; besin değerlerini düzenlersen eski öğün toplamları da değişebilir.</p>
    <div className="flex flex-wrap gap-3"><button type="button" disabled={catalog.busy} onClick={() => { setEditing(true); setConfirming(false); setNotice(''); }} className="rounded-xl border border-green-200 px-4 py-2 font-semibold text-green-800">Ürünü düzenle</button><button type="button" disabled={catalog.busy} onClick={() => { setConfirming(true); setEditing(false); setNotice(''); }} className="rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-700">Ürünü sil</button></div>
    {notice && <p role="status" className="mt-3 text-sm text-green-800">{notice}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {confirming && <div className="mt-4 rounded-xl bg-red-50 p-4"><p className="text-sm">Bu ürün hesabından ve hesap favorilerinden kaldırılacak. Günlük kayıtlarındaki miktarlar ve tarayıcıdaki eski kopya korunur; ürün bulunamadığında besin toplamlarına katılmaz. Tekrar aktarım silinen ürünü geri getirmez.</p><div className="mt-3 flex gap-3"><button type="button" disabled={catalog.busy} onClick={remove} className="rounded-lg bg-red-700 px-3 py-2 text-sm text-white">Evet, hesabımdan sil</button><button type="button" disabled={catalog.busy} onClick={() => setConfirming(false)} className="rounded-lg border px-3 py-2 text-sm">Vazgeç</button></div></div>}
    {editing && <div className="mt-4"><AddProductForm key={product.id} editingProduct={product} onCancel={() => setEditing(false)} onAdded={() => { setEditing(false); setNotice('Ürün güncellendi.'); }} /></div>}
  </section>;
}
