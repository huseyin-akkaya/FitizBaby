import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ProductContext } from './productContext';
import { useAuth } from '../hooks/useAuth';
import { products as builtInProducts } from '../data/products';
import { addGuestProduct, getValidLocalProducts, readLocalProductRecords, normalizeProduct, publishCatalog, subscribeProducts, getProductsSnapshot } from '../data/catalogStore';
import { productsRequest } from '../services/productsApi';

const emptyRecords = [];
const fields = ['name', 'brand', 'category', 'serving', 'calories', 'protein', 'carbs', 'sugar', 'fat', 'saturatedFat', 'fiber', 'salt', 'ingredientsText', 'allergensText', 'tracesText', 'sourceUrl', 'image'];
const wire = record => Object.fromEntries(fields.filter(key => record[key] !== undefined).map(key => [key, record[key]]));
function readGuest() {
  try { const records = getValidLocalProducts(); return { records, error: '', skipped: readLocalProductRecords().length - records.length }; }
  catch (error) { return { records: [], error: error.message, skipped: 0 }; }
}

export default function ProductProvider({ children }) {
  const { user, loading: authLoading, error: authError } = useAuth();
  const accountId = user?.id ?? null;
  const scopeKey = authLoading || authError ? 'pending' : accountId || 'guest';
  const [guest, setGuest] = useState(readGuest);
  const [state, setState] = useState({ accountId: null, records: [], ready: false, error: '', busy: false, notice: '' });
  const active = useRef(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const channel = useRef(null);
  const bridge = useSyncExternalStore(subscribeProducts, getProductsSnapshot, getProductsSnapshot);
  const current = state.accountId === accountId;
  const ready = !authLoading && !authError && (!accountId || current && state.ready);
  const records = accountId ? current ? state.records : emptyRecords : guest.records;
  const visible = useMemo(() => [...builtInProducts, ...(scopeKey === 'pending' ? [] : records.map(record => ({ ...normalizeProduct(record, record.id), ...(accountId ? { accountOwned: true, revision: record.revision } : {}) })))], [scopeKey, records, accountId]);
  useLayoutEffect(() => { publishCatalog(scopeKey, visible); }, [scopeKey, visible]);

  const reload = useCallback(async () => {
    const scope = active.current;
    if (!scope?.accountId || scope.controller.signal.aborted || busy.current) return;
    const request = ++generation.current;
    try {
      const result = await productsRequest(scope.accountId, '', 'GET', undefined, scope.controller.signal);
      if (!Array.isArray(result.products)) throw new Error('Ürün listesi okunamadı.');
      if (active.current === scope && request === generation.current) setState({ accountId: scope.accountId, records: result.products, ready: true, error: '', busy: false, notice: '' });
    } catch (error) {
      if (!scope.controller.signal.aborted && active.current === scope && request === generation.current) setState({ accountId: scope.accountId, records: [], ready: false, error: error.message, busy: false, notice: '' });
    }
  }, []);
  useEffect(() => {
    const scope = { accountId: scopeKey === 'pending' ? null : accountId, controller: new AbortController() };
    active.current = scope; busy.current = false; generation.current += 1;
    queueMicrotask(() => { if (!scope.controller.signal.aborted) reload(); });
    return () => { scope.controller.abort(); if (active.current === scope) active.current = null; };
  }, [scopeKey, accountId, reload]);
  useEffect(() => {
    const syncLocal = () => setGuest(readGuest());
    const syncAccount = () => reload();
    window.addEventListener('storage', syncLocal);
    window.addEventListener('fitizbaby:products-change', syncLocal);
    window.addEventListener('focus', syncAccount);
    if (typeof BroadcastChannel !== 'undefined') { channel.current = new BroadcastChannel('fitizbaby-products'); channel.current.onmessage = syncAccount; }
    return () => { window.removeEventListener('storage', syncLocal); window.removeEventListener('fitizbaby:products-change', syncLocal); window.removeEventListener('focus', syncAccount); channel.current?.close(); channel.current = null; };
  }, [reload]);
  async function operation(action) {
    const scope = active.current;
    if (!ready || !accountId || scope?.accountId !== accountId || busy.current) throw new Error('Ürünler henüz hazır değil veya başka bir işlem sürüyor.');
    busy.current = true; generation.current += 1;
    setState(previous => ({ ...previous, busy: true, error: '', notice: '' }));
    try {
      const result = await action(scope);
      if (active.current !== scope || scope.controller.signal.aborted) throw new Error('Hesap değişti. İşlemin sonucunu doğru hesapta kontrol et.');
      const list = await productsRequest(accountId, '', 'GET', undefined, scope.controller.signal);
      if (active.current !== scope || scope.controller.signal.aborted) throw new Error('Hesap değişti. Sayfayı yenile.');
      if (!Array.isArray(list.products)) throw new Error('Ürün listesi okunamadı. Listeyi yenile.');
      setState({ accountId, records: list.products, ready: true, busy: false, error: '', notice: result.notice || '' });
      channel.current?.postMessage('changed');
      return result;
    } catch (error) {
      if (active.current === scope && !scope.controller.signal.aborted) setState(previous => ({ ...previous, busy: false, error: error.message }));
      throw error;
    } finally { if (active.current === scope) busy.current = false; }
  }
  async function addProduct(input, id = 'custom-' + crypto.randomUUID()) {
    if (!ready) throw new Error('Oturum veya ürünler henüz hazır değil.');
    if (!accountId) return addGuestProduct(input);
    await operation(scope => productsRequest(accountId, '', 'POST', { id, product: wire(input) }, scope.controller.signal));
    return id;
  }
  async function updateProduct(id, revision, input) {
    await operation(scope => productsRequest(accountId, '/' + encodeURIComponent(id), 'PUT', { revision, product: wire(input) }, scope.controller.signal));
    return id;
  }
  async function deleteProduct(id, revision) {
    await operation(scope => productsRequest(accountId, '/' + encodeURIComponent(id), 'DELETE', { revision }, scope.controller.signal));
    window.dispatchEvent(new Event('fitizbaby:favorites-refresh'));
  }
  async function importProducts() {
    try {
      const local = readGuest();
      if (local.error) throw new Error(local.error);
      await operation(async scope => {
        let imported = 0, skipped = 0;
        for (const record of local.records) {
          if (scope.controller.signal.aborted) throw new Error('Aktarım durdu; kaynak kayıtlar korundu.');
          try {
            const result = await productsRequest(accountId, '/import', 'POST', { id: record.id.toLowerCase(), product: wire(record) }, scope.controller.signal);
            if (result.imported) imported += 1; else skipped += 1;
          } catch (error) {
            throw new Error(`${imported} ürün aktarıldı. ${record.name} aktarılırken durdu: ${error.message} Kaynaklar korundu; yeniden aktarım mevcut ürünleri değiştirmez.`, { cause: error });
          }
        }
        return { notice: `${imported} ürün aktarıldı; daha önce aktarılmış ${skipped} ürün korundu. Tarayıcı kayıtları silinmedi.${local.skipped ? ` Geçersiz ${local.skipped} yerel kayıt kaynakta korundu ve aktarılmadı.` : ''}` };
      });
    } catch (error) { if (active.current?.accountId === accountId) setState(previous => ({ ...previous, error: error.message })); }
  }
  const getDraft = id => { const record = records.find(item => item.id === id); return record ? { ...wire(record), image: accountId && record.image ? null : record.image || '' } : null; };
  const value = { products: visible, account: Boolean(accountId), ready, busy: current && state.busy, error: authError || (accountId ? current ? state.error : '' : guest.error), notice: current ? state.notice : '', localCount: guest.records.length, localSkipped: guest.skipped, addProduct, updateProduct, deleteProduct, importProducts, getDraft, retry: reload };
  // Do not render children against the previous account's live catalog. Clear
  // mounted forms, assistant messages and selections when account scope changes.
  if (bridge.scope !== scopeKey || authLoading || accountId && !current || accountId && !state.ready && !state.error) return <main className="p-10" role="status">Ürünler ve oturum yükleniyor…</main>;
  return <ProductContext.Provider value={value}><Fragment key={scopeKey}>{children}</Fragment></ProductContext.Provider>;
}
