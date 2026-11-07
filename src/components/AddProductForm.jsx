import { useRef, useState } from 'react';
import { addProduct, validateProduct } from '../data/catalogStore';
import { categoryDefinitions } from '../data/productCategories';

const initial = { name: '', brand: '', category: 'Kahvaltılık', serving: '100 g', calories: '', protein: '', carbs: '', sugar: '', fat: '', saturatedFat: '', fiber: '', salt: '', ingredientsText: '', allergensText: '', tracesText: '', sourceUrl: '', image: '' };
const nutrients = [['calories', 'Kalori (kcal)'], ['protein', 'Protein (g)'], ['carbs', 'Karbonhidrat (g)'], ['sugar', 'Şeker (g)'], ['fat', 'Yağ (g)'], ['saturatedFat', 'Doymuş yağ (g)'], ['fiber', 'Lif (g)'], ['salt', 'Tuz (g)']];
const fieldStyle = 'mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100';

export default function AddProductForm({ onAdded, onCancel }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState('');
  const [readingImage, setReadingImage] = useState(false);
  const imageVersion = useRef(0);
  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  async function readImage(event) {
    const version = ++imageVersion.current;
    const file = event.target.files?.[0];
    update('image', '');
    if (!file) { setReadingImage(false); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 600 * 1024) {
      setError('PNG, JPEG veya WebP formatında, en fazla 600 KB bir görsel seç.');
      event.target.value = ''; setReadingImage(false); return;
    }
    setError(''); setReadingImage(true);
    try {
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      await new Promise((resolve, reject) => { const preview = new Image(); preview.onload = resolve; preview.onerror = reject; preview.src = data; });
      if (version === imageVersion.current) update('image', data);
    } catch { setError('Görsel okunamadı; başka bir dosya seç.'); }
    finally { if (version === imageVersion.current) setReadingImage(false); }
  }
  function submit(event) {
    event.preventDefault();
    const validation = validateProduct(draft);
    if (validation) { setError(validation); return; }
    try { const id = addProduct(draft); onAdded(id); }
    catch (failure) { setError(failure.message); }
  }
  return <section id="add-product" className="mb-7 rounded-2xl border border-green-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="add-product-heading">
    <div className="flex items-start justify-between gap-4"><div><h2 id="add-product-heading" className="text-xl font-bold text-zinc-900">Yeni ürün ekle</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Ambalajdaki 100 g veya 100 ml değerlerini gir. Bilmediğin besin alanlarını boş bırak. Ürün bu tarayıcıda saklanır; herkese açık kataloğa gönderilmez.</p></div><button type="button" onClick={onCancel} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">Kapat</button></div>
    <form onSubmit={submit} noValidate className="mt-5 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-zinc-700">Ürün adı *<input autoFocus maxLength={120} value={draft.name} onChange={e => update('name', e.target.value)} className={fieldStyle} /></label>
        <label className="text-sm font-medium text-zinc-700">Marka *<input maxLength={120} value={draft.brand} onChange={e => update('brand', e.target.value)} className={fieldStyle} /></label>
        <label className="text-sm font-medium text-zinc-700">Kategori *<select value={draft.category} onChange={e => update('category', e.target.value)} className={fieldStyle}>{categoryDefinitions.map(category => <option key={category.name}>{category.name}</option>)}</select></label>
        <label className="text-sm font-medium text-zinc-700">Etiket referansı *<select value={draft.serving} onChange={e => update('serving', e.target.value)} className={fieldStyle}><option>100 g</option><option>100 ml</option></select></label>
      </div>
      <fieldset><legend className="text-sm font-semibold text-zinc-900">Besin değerleri · seçilen referans için</legend><div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">{nutrients.map(([key, label]) => <label key={key} className="text-sm text-zinc-700">{label}<input type="number" min="0" max={key === 'calories' ? 1000 : 100} step="any" placeholder="Bilinmiyor" value={draft[key]} onChange={e => update(key, e.target.value)} className={fieldStyle} /></label>)}</div></fieldset>
      <label className="block text-sm font-medium text-zinc-700">İçindekiler *<textarea rows={4} maxLength={10000} value={draft.ingredientsText} onChange={e => update('ingredientsText', e.target.value)} placeholder="Her bileşeni ayrı satıra, ambalajdaki sırayla yaz." className={fieldStyle} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-zinc-700">İçerdiği alerjenler<textarea rows={2} maxLength={2000} value={draft.allergensText} onChange={e => update('allergensText', e.target.value)} placeholder="Her alerjen ayrı satıra. Bilinmiyorsa boş bırak." className={fieldStyle} /></label><label className="text-sm font-medium text-zinc-700">Eser miktarda içerebilir<textarea rows={2} maxLength={2000} value={draft.tracesText} onChange={e => update('tracesText', e.target.value)} placeholder="Ambalajda varsa her alerjeni ayrı satıra yaz." className={fieldStyle} /></label></div>
      <label className="block text-sm font-medium text-zinc-700">Üretici veya etiket kaynağı bağlantısı<input type="url" maxLength={2000} value={draft.sourceUrl} onChange={e => update('sourceUrl', e.target.value)} placeholder="https://…" className={fieldStyle} /><span className="mt-1 block text-xs font-normal text-zinc-500">Bağlantıyı eklemek bilgiyi otomatik olarak doğrulamaz.</span></label>
      <label className="block text-sm font-medium text-zinc-700">Ürün görseli<input type="file" accept="image/png,image/jpeg,image/webp" onChange={readImage} className={fieldStyle} /><span className="mt-1 block text-xs font-normal text-zinc-500">İsteğe bağlı · PNG/JPEG/WebP · en fazla 600 KB</span></label>
      {draft.image && <img src={draft.image} alt="Seçilen ürün görselinin önizlemesi" className="h-24 w-24 rounded-xl border border-zinc-200 object-contain" />}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={readingImage} className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">{readingImage ? 'Görsel hazırlanıyor…' : 'Ürünü kaydet'}</button><button type="button" onClick={onCancel} className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700">Vazgeç</button></div>
    </form>
  </section>;
}

