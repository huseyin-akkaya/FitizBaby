import { products as builtInProducts } from './products';

const KEY = 'fitizbaby-custom-products-v1';
const listeners = new Set();
const numericFields = ['calories', 'protein', 'carbs', 'sugar', 'fat', 'saturatedFat', 'fiber', 'salt'];
export const productFields = numericFields;

export function safeSourceUrl(value) {
  if (!value) return '';
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

export function validateProduct(input) {
  if (!input || typeof input !== 'object') return 'Ürün bilgileri geçersiz.';
  for (const key of ['name', 'brand', 'category']) {
    if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 120) return 'Ürün adı, marka ve kategori alanlarını doldur (en fazla 120 karakter).';
  }
  if (!['100 g', '100 ml'].includes(input.serving)) return 'Referans ölçüyü seç.';
  for (const key of numericFields) {
    const value = input[key];
    if (value === '' || value == null) continue;
    if (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > (key === 'calories' ? 1000 : 100)) return 'Kalori 0–1000; besin değerleri 0–100 aralığında olmalı. Bilinmeyen alanları boş bırak.';
  }
  if (input.sugar !== '' && input.sugar != null && input.carbs !== '' && input.carbs != null && Number(input.sugar) > Number(input.carbs)) return 'Şeker, toplam karbonhidrattan fazla olamaz.';
  if (input.saturatedFat !== '' && input.saturatedFat != null && input.fat !== '' && input.fat != null && Number(input.saturatedFat) > Number(input.fat)) return 'Doymuş yağ, toplam yağdan fazla olamaz.';
  if (input.serving === '100 g' && ['protein', 'carbs', 'fat'].reduce((total, key) => total + (Number(input[key]) || 0), 0) > 101) return '100 g üründe protein, karbonhidrat ve yağ toplamı 100 g sınırını aşıyor; etiket değerlerini kontrol et.';
  if (input.sourceUrl && !safeSourceUrl(input.sourceUrl)) return 'Kaynak bağlantısı http veya https ile başlamalı.';
  if (input.image && !safeSourceUrl(input.image) && !/^data:image\/(png|jpeg|webp);base64,/.test(input.image)) return 'Geçerli bir ürün görseli seç.';
  if (typeof input.ingredientsText !== 'string' || !input.ingredientsText.trim()) return 'Ambalajdaki içindekiler listesini gir.';
  return '';
}

function normalize(input, id) {
  const sourceUrl = safeSourceUrl(input.sourceUrl);
  const split = text => [...new Set((text || '').split('\n').map(value => value.trim()).filter(Boolean))];
  return {
    id, name: input.name.trim(), brand: input.brand.trim(), category: input.category.trim(), serving: input.serving,
    ...Object.fromEntries(numericFields.map(key => [key, input[key] === '' || input[key] == null ? null : Number(input[key])])),
    image: input.image || '/images/products/product-placeholder.svg', accent: 'from-emerald-50 to-lime-100',
    description: 'Kullanıcının ambalaj bilgilerine göre eklediği ürün.', userProvided: true,
    ingredients: split(input.ingredientsText),
    allergenInfo: { contains: split(input.allergensText), mayContain: input.tracesText?.trim() ? split(input.tracesText) : null, status: 'user-provided' },
    ingredientSource: { label: 'Kullanıcının belirttiği etiket kaynağı', url: sourceUrl, checkedAt: 'Kullanıcı beyanı; bağımsız doğrulanmadı' },
    nutritionSource: sourceUrl ? { label: 'Kullanıcının belirttiği etiket kaynağı', url: sourceUrl } : null,
    nutritionNote: 'Bu ürün kullanıcı tarafından eklendi. Kaynak bağlantısı bulunması bağımsız doğrulama yapıldığı anlamına gelmez.',
  };
}

function readCustomProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    const seen = new Set();
    return saved.filter(item => {
      if (!item || typeof item.id !== 'string' || !item.id.startsWith('custom-') || seen.has(item.id) || validateProduct(item)) return false;
      seen.add(item.id); return true;
    }).map(item => normalize(item, item.id));
  } catch { return []; }
}

export let products = [...builtInProducts, ...readCustomProducts()];
export const getProductsSnapshot = () => products;
export function subscribeProducts(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function publish() { products = [...builtInProducts, ...readCustomProducts()]; listeners.forEach(listener => listener()); }
if (typeof window !== 'undefined') window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) publish(); });

export function addProduct(input) {
  const error = validateProduct(input);
  if (error) throw new Error(error);
  const id = 'custom-' + crypto.randomUUID();
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(saved)) throw new Error();
  } catch { throw new Error('Kayıtlı ürün verisi okunamadı; mevcut kayıtlar korunarak işlem durduruldu.'); }
  try { localStorage.setItem(KEY, JSON.stringify([...saved, { ...input, id }])); }
  catch { throw new Error('Ürün kaydedilemedi. Tarayıcı depolaması kapalı veya dolu olabilir; daha küçük bir görsel deneyebilirsin.'); }
  publish();
  return id;
}
