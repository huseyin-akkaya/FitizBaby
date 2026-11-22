import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '../hooks/useAuth';
import {accountSecurityRequest} from '../services/accountSecurityApi';
const date=value=>new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
export default function AccountSecurity(){
 const {user,refreshAcrossTabs,finishPasswordChange}=useAuth();
 const [sessions,setSessions]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [password,setPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[repeat,setRepeat]=useState(''),[proof,setProof]=useState(''),[target,setTarget]=useState(null);
 const live=useRef(true),version=useRef(0);
 const load=useCallback(async signal=>{
  const request=++version.current;setLoading(true);
  try{const result=await accountSecurityRequest(user.id,'/sessions',{signal});if(live.current&&request===version.current){setSessions(result.sessions);setError('');}}
  catch(failure){if(live.current&&request===version.current&&failure.name!=='AbortError'){setSessions([]);setError(failure.message);}}
  finally{if(live.current&&request===version.current)setLoading(false);}
 },[user.id]);
 useEffect(()=>{live.current=true;const controller=new AbortController();queueMicrotask(()=>{if(!controller.signal.aborted)load(controller.signal);});return()=>{live.current=false;controller.abort();};},[load]);
 async function change(event){
  event.preventDefault();if(busy)return;setError('');setNotice('');
  if(newPassword!==repeat){setError('Yeni parolalar eşleşmiyor.');return;}
  if(newPassword===password){setError('Yeni parolan güncel parolandan farklı olmalı.');return;}
  setBusy(true);
  try{const result=await accountSecurityRequest(user.id,'/password',{data:{password,newPassword}});if(!result.changed)throw new Error('Parola değişikliği doğrulanamadı.');
   // Completion lives above account-scoped providers and survives a logout refresh.
   await finishPasswordChange();}
  catch(failure){if(live.current)setError(failure.message);}
  finally{if(live.current){setBusy(false);setPassword('');setNewPassword('');setRepeat('');}}
 }
 async function revoke(event){
  event.preventDefault();if(busy||!target)return;setBusy(true);setError('');setNotice('');
  try{await accountSecurityRequest(user.id,target==='others'?'/sessions/revoke-others':'/sessions/'+encodeURIComponent(target)+'/revoke',{data:{password:proof}});if(!live.current)return;setTarget(null);setNotice('Seçtiğin oturumlar kapatıldı. Bu oturum açık kalıyor.');await load();if(live.current)await refreshAcrossTabs();}
  catch(failure){if(live.current)setError(failure.message);}
  finally{if(live.current){setBusy(false);setProof('');}}
 }
 return <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4" aria-labelledby="account-security-heading">
  <h2 id="account-security-heading" className="text-lg font-bold">Parola ve oturum güvenliği</h2>
  <h3 className="mt-4 font-semibold">Parolamı değiştir</h3><p className="mt-2 text-sm leading-6">Güncel parolanla onayla. Yeni parola en az 15, en fazla 128 karakter olmalı. Değişiklikten sonra bu hesapta açık olan tüm oturumlar kapanır; yeniden giriş yapman gerekir. Bekleyen doğrulama, parola sıfırlama ve indirme izinleri geçersiz olur. Kaydedilmiş ürünlerin ve beslenme kayıtların korunur.</p>
  <form onSubmit={change} className="mt-4"><fieldset disabled={busy} className="space-y-3">
   <label className="block text-sm font-medium">Güncel parolan<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3"/></label>
   <label className="block text-sm font-medium">Yeni parolan<input type="password" autoComplete="new-password" required minLength={15} maxLength={128} value={newPassword} onChange={event=>setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3"/></label>
   <label className="block text-sm font-medium">Yeni parolanı tekrar gir<input type="password" autoComplete="new-password" required minLength={15} maxLength={128} value={repeat} onChange={event=>setRepeat(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3"/></label>
   <button type="submit" className="rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?'İşleniyor…':'Parolamı değiştir ve tüm oturumları kapat'}</button>
  </fieldset></form>
  <div className="mt-6 border-t border-zinc-200 pt-4"><h3 className="font-semibold">Açık oturumlarım</h3><p className="mt-2 text-sm leading-6">Son 30 dakikada etkin ve süresi dolmamış oturumlar gösterilir. Cihaz ve IP bilgisi tutulmuyor; tarihleri kullanarak ayırt edebilirsin. Tarihler bulunduğun saat dilimindedir. Kapatılan oturumun sonraki isteği reddedilir; başka cihazın ekranı yenilendiğinde giriş istenir.</p>
   <button type="button" disabled={busy||loading} onClick={()=>load()} className="mt-3 rounded-xl border border-zinc-300 bg-white px-4 py-2 font-semibold disabled:opacity-50">Oturum listesini yenile</button>
   {loading?<p role="status" className="mt-3 text-sm">Oturumlar yükleniyor…</p>:<ul className="mt-3 space-y-3">{sessions.map((session,index)=><li key={session.id} className="rounded-xl border border-zinc-200 bg-white p-3"><p className="font-semibold">{session.current?'Bu oturum':'Diğer oturum '+index}</p><p className="mt-1 text-sm">Açılış: {date(session.createdAt)}</p><p className="text-sm">Son etkinlik: {date(session.lastSeenAt)}</p><p className="text-sm">En geç sona erme: {date(session.expiresAt)}</p>{!session.current&&<button type="button" disabled={busy} onClick={()=>{setTarget(session.id);setProof('');setError('');setNotice('');}} className="mt-2 font-semibold text-red-700 underline">Bu oturumu kapat</button>}</li>)}</ul>}
   <button type="button" disabled={busy||loading||!sessions.some(session=>!session.current)} onClick={()=>{setTarget('others');setProof('');setError('');setNotice('');}} className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-3 font-semibold text-red-700 disabled:opacity-50">Diğer tüm oturumları kapat</button>
   {target&&<form onSubmit={revoke} className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"><fieldset disabled={busy} className="space-y-3"><p className="text-sm">{target==='others'?'Bu hesapta bu oturum dışındaki tüm oturumlar kapatılacak.':'Seçtiğin oturum kapatılacak.'} Bu oturum açık kalır. Güncel parolanla onayla.</p><label className="block text-sm font-medium">Oturum kapatma için güncel parolan<input type="password" autoComplete="current-password" required maxLength={128} value={proof} onChange={event=>setProof(event.target.value)} className="mt-2 w-full rounded-xl border border-red-200 bg-white p-3"/></label><div className="flex flex-wrap gap-3"><button type="submit" className="rounded-xl bg-red-700 px-4 py-3 font-semibold text-white">Seçimi onayla ve kapat</button><button type="button" onClick={()=>{setTarget(null);setProof('');}} className="rounded-xl border border-red-200 bg-white px-4 py-3 font-semibold">Vazgeç</button></div></fieldset></form>}
  </div>
  {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="mt-4 text-sm text-green-900">{notice}</p>}
 </section>;
}
