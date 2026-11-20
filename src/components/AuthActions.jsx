import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthActions({ onNavigate = () => {} }) {
  const { user, loading, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setBusy(true); setError('');
    try { await logout(); onNavigate(); } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  if (loading) return <span className="text-xs text-zinc-400">Oturum kontrol ediliyor…</span>;
  return <div className="flex flex-wrap items-center gap-2">
    {user ? <><Link to="/account" onClick={onNavigate} className="max-w-32 truncate rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold" title={user.name}>Hesabım</Link><button type="button" disabled={busy} onClick={signOut} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50">{busy ? 'Çıkılıyor…' : 'Çıkış yap'}</button></> : <><Link to="/login" onClick={onNavigate} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-zinc-700">Giriş Yap</Link><Link to="/register" onClick={onNavigate} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700">Kayıt Ol</Link></>}
    {error && <p role="alert" className="w-full max-w-64 text-xs text-rose-300">{error}</p>}
  </div>;
}
