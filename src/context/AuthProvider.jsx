import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthContext } from './authContext';
import { authRequest } from '../services/authApi';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const channel = useRef(null);
  const version = useRef(0);
  const refresh = useCallback(async signal => {
    const request = ++version.current;
    try {
      const result = await authRequest('me', undefined, signal);
      if (request === version.current) { setUser(result.user); setError(''); }
    } catch (failure) { if (failure.name !== 'AbortError' && request === version.current) { setUser(null); setError(failure.message); } }
    finally { if (!signal?.aborted && request === version.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) refresh(controller.signal); });
    const sync = () => refresh();
    window.addEventListener('focus', sync);
    if (typeof BroadcastChannel !== 'undefined') { channel.current = new BroadcastChannel('fitizbaby-auth'); channel.current.onmessage = sync; }
    return () => { controller.abort(); window.removeEventListener('focus', sync); channel.current?.close(); channel.current = null; };
  }, [refresh]);
  const authenticate = async (mode, data) => {
    const result = await authRequest(mode, data);
    version.current += 1; setUser(result.user); setLoading(false); setError(''); channel.current?.postMessage('changed');
  };
  const logout = async () => {
    await authRequest('logout', {});
    version.current += 1; setUser(null); setError(''); channel.current?.postMessage('changed');
  };
  const refreshAcrossTabs=async()=>{await refresh();channel.current?.postMessage('changed');};
  return <AuthContext.Provider value={{ user, loading, error, authenticate, logout, refresh, refreshAcrossTabs }}>{children}</AuthContext.Provider>;
}
