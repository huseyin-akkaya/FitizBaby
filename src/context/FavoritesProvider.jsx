import { useCallback, useEffect, useRef, useState } from 'react';
import { FavoritesContext } from './favoritesContext';
import { useAuth } from '../hooks/useAuth';
import { favoritesRequest } from '../services/favoritesApi';

const KEY = 'fitizbaby-favorites';
const EVENT = 'fitizbaby:favorites-change';
function readLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(saved)) throw new Error();
    return [...new Set(saved.filter(id => Number.isSafeInteger(id) && id > 0 || typeof id === 'string' && /^custom-[0-9a-f-]{36}$/i.test(id)))];
  } catch { return null; }
}

export default function FavoritesProvider({ children }) {
  const { user, loading: authLoading, error: authError } = useAuth();
  const accountId = user?.id ?? null;
  const [localIds, setLocalIds] = useState(() => readLocal() ?? []);
  const [state, setState] = useState({ accountId: null, ids: [], ready: false, busy: false, error: '', notice: '' });
  const active = useRef(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const channel = useRef(null);
  // Hide a previous account's state immediately, before any effect runs.
  const current = state.accountId === accountId && !authLoading && !authError;
  const ready = !authLoading && !authError && (!accountId || current && state.ready);

  const reload = useCallback(async () => {
    const scope = active.current;
    if (!scope?.accountId || scope.controller.signal.aborted || busy.current) return;
    const request = ++generation.current;
    try {
      const ids = await favoritesRequest(scope.accountId, undefined, false, scope.controller.signal);
      if (active.current === scope && generation.current === request) setState({ accountId: scope.accountId, ids, ready: true, busy: false, error: '', notice: '' });
    } catch (error) {
      if (!scope.controller.signal.aborted && active.current === scope && generation.current === request) setState({ accountId: scope.accountId, ids: [], ready: false, busy: false, error: error.message, notice: '' });
    }
  }, []);

  useEffect(() => {
    const scope = { accountId: !authLoading && !authError ? accountId : null, controller: new AbortController() };
    active.current = scope;
    busy.current = false;
    generation.current += 1;
    queueMicrotask(() => { if (!scope.controller.signal.aborted) reload(); });
    return () => { scope.controller.abort(); if (active.current === scope) active.current = null; };
  }, [accountId, authLoading, authError, reload]);
  useEffect(() => {
    const sync = () => { const ids = readLocal(); if (ids) setLocalIds(ids); };
    const refresh = () => reload();
    window.addEventListener('storage', sync);
    window.addEventListener(EVENT, sync);
    window.addEventListener('focus', refresh);
    if (typeof BroadcastChannel !== 'undefined') { channel.current = new BroadcastChannel('fitizbaby-favorites'); channel.current.onmessage = refresh; }
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(EVENT, sync); window.removeEventListener('focus', refresh); channel.current?.close(); channel.current = null; };
  }, [reload]);

  async function save(data, importing = false) {
    const scope = active.current;
    if (!ready || !accountId || scope?.accountId !== accountId || busy.current) return;
    busy.current = true;
    generation.current += 1;
    setState(previous => ({ ...previous, busy: true, error: '', notice: '' }));
    try {
      const ids = await favoritesRequest(accountId, data, importing, scope.controller.signal);
      if (active.current === scope) {
        setState({ accountId, ids, ready: true, busy: false, error: '', notice: importing ? 'Tarayıcı favorileri hesabına aktarıldı. Tarayıcıdaki asıl kayıtlar korundu.' : '' });
        channel.current?.postMessage('changed');
      }
    } catch (error) {
      if (active.current === scope && !scope.controller.signal.aborted) setState(previous => ({ ...previous, busy: false, error: error.message }));
    } finally { if (active.current === scope) busy.current = false; }
  }
  function toggleFavorite(id) {
    if (!ready) return;
    if (accountId) return save({ productId: String(id), favorite: !state.ids.includes(id) });
    const previous = readLocal();
    if (!previous) { setState({ accountId: null, ids: [], ready: false, busy: false, error: 'Tarayıcı favorileri okunamadı. Mevcut kayıtlar korundu.', notice: '' }); return; }
    const next = previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setLocalIds(next);
      setState({ accountId: null, ids: [], ready: true, busy: false, error: '', notice: '' });
      window.dispatchEvent(new Event(EVENT));
    } catch { setState({ accountId: null, ids: [], ready: true, busy: false, error: 'Tarayıcı favorileri kaydedilemedi. Depolama iznini kontrol et.', notice: '' }); }
  }
  function importLocalFavorites() {
    const ids = readLocal();
    if (!ids) { setState(previous => ({ ...previous, error: 'Tarayıcı favorileri okunamadı; mevcut kayıtlar korundu.' })); return; }
    return save({ productIds: ids.map(String) }, true);
  }
  return <FavoritesContext.Provider value={{
    favoriteIds: ready ? accountId ? state.ids : localIds : [], toggleFavorite,
    loading: !ready, busy: current && state.busy, account: Boolean(accountId),
    error: authError || (current ? state.error : ''), notice: current ? state.notice : '',
    localCount: localIds.length, importLocalFavorites, retry: reload,
  }}>{children}</FavoritesContext.Provider>;
}
