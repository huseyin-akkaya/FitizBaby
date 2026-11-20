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
  for (const [key, max] of [['ingredientsText', 10000], ['allergensText', 2000], ['tracesText', 2000], ['sourceUrl', 2000]]) { if (input[key] != null && (typeof input[key] !== 'string' || input[key].length > max)) return 'Metin alanı çok uzun veya geçersiz.'; }
  if (input.sourceUrl && !safeSourceUrl(input.sourceUrl)) return 'Kaynak bağlantısı http veya https ile başlamalı.';
  if (input.image && !safeSourceUrl(input.image) && !/^data:image\/(png|jpeg|webp);base64,/.test(input.image)) return 'Geçerli bir ürün görseli seç.';
  if (typeof input.ingredientsText !== 'string' || !input.ingredientsText.trim()) return 'Ambalajdaki içindekiler listesini gir.';
  return '';
}

export function normalizeProduct(input, id) {
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


export const localProductsKey = KEY;
export function readLocalProductRecords() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { throw new Error('Tarayıcı ürünleri okunamadı; mevcut kayıtlar korundu.'); }
  if (!Array.isArray(saved)) throw new Error('Tarayıcı ürün kaydı geçersiz; mevcut kayıtlar korundu.');
  return saved;
}
export function getValidLocalProducts() {
  const seen = new Set();
  return readLocalProductRecords().filter(item => {
    if (!item || typeof item.id !== 'string' || !/^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id) || seen.has(item.id) || validateProduct(item)) return false;
    seen.add(item.id); return true;
  });
}
export let products = builtInProducts;
let snapshot = { scope: 'pending', products };
export const getProductsSnapshot = () => snapshot;
export function subscribeProducts(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function publishCatalog(scope, next) {
  if (snapshot.scope === scope && products === next) return;
  products = next; snapshot = { scope, products }; listeners.forEach(listener => listener());
}
export function addGuestProduct(input) {
  const error = validateProduct(input);
  if (error) throw new Error(error);
  const id = 'custom-' + crypto.randomUUID();
  const saved = readLocalProductRecords();
  try { localStorage.setItem(KEY, JSON.stringify([...saved, { ...input, id }])); }
  catch { throw new Error('Ürün kaydedilemedi. Tarayıcı depolamasını kontrol et.'); }
  window.dispatchEvent(new Event('fitizbaby:products-change'));
  return id;
}
