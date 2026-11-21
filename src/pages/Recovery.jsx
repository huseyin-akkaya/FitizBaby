import { useEffect,useLayoutEffect,useState } from 'react';
import { Link,useLocation,useNavigate } from 'react-router-dom';
import { recoveryRequest } from '../services/recoveryApi';
import { useAuth } from '../hooks/useAuth';

export default function Recovery({mode}) {
 const location=useLocation(),navigate=useNavigate();const {refreshAcrossTabs}=useAuth();
 const [token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')||'');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[delivery,setDelivery]=useState('loading');
 const completed=location.state?.recoveryComplete===mode;
 useLayoutEffect(()=>{if(window.location.hash)window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);},[]);
 useEffect(()=>{let live=true;recoveryRequest('recovery-status').then(result=>{if(live)setDelivery(result.delivery);}).catch(()=>{if(live)setDelivery('disabled');});return()=>{live=false;};},[]);
 const valid=/^[A-Za-z0-9_-]{43}$/.test(token);
 async function submit(event){
  event.preventDefault();if(busy)return;setError('');setNotice('');
  if(mode==='reset'&&password!==confirm){setError('Parolalar eşleşmiyor.');return;}
  setBusy(true);
  try{
   const result=await recoveryRequest(mode==='forgot'?'forgot-password':mode==='verify'?'verify-email':'reset-password',mode==='forgot'?{email}:mode==='verify'?{token}:{token,password});
   if(mode==='forgot')setNotice(result.message);
   else{setPassword('');setConfirm('');navigate(location.pathname,{replace:true,state:{recoveryComplete:mode}});await refreshAcrossTabs();}
  }catch(failure){setError(failure.message);}finally{setBusy(false);}
 }
 const success=mode==='verify'?'E-posta adresi doğrulandı.':'Parolan değiştirildi. Bu hesabın tüm açık oturumları kapatıldı. Yeni parolanla giriş yap.';
 return <main className="min-h-[70vh] bg-zinc-50 px-4 py-10"><section className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
  <p className="text-sm font-semibold text-green-700">FITIZBABY HESAP GÜVENLİĞİ</p><h1 className="mt-2 text-2xl font-bold">{mode==='forgot'?'Parolamı unuttum':mode==='verify'?'E-posta adresini doğrula':'Yeni parola belirle'}</h1>
  {delivery==='local'&&mode!=='forgot'&&<p className="mt-3 text-sm text-amber-900">Yerel deneme modu: bu akış gerçek e-posta sahipliğini doğrulamaz.</p>}
  {completed?<p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-900">{success}</p>:<>
   {mode==='forgot'?<p className="mt-4 text-sm text-zinc-600">{delivery==='local'?'Bu yerel denemede gerçek e-posta gönderilmez. Hesap için işlem yapılabiliyorsa bağlantı bilgisayardaki korumalı deneme kutusuna yazılır.':'E-posta gönderimi bu ortamda henüz bağlı değil.'} Hesabın varlığı bu ekranda açıklanmaz.</p>:<p className="mt-4 text-sm text-zinc-600">{mode==='verify'?'Bağlantı 24 saat geçerlidir; doğrulamak için aşağıdan onayla.':'Bağlantı 30 dakika geçerlidir. Parola değişince bu hesabın açık oturumları kapanır.'} Bağlantı tek kullanımlıktır. Ekranı yenilersen bağlantıyı yeniden açman gerekebilir.</p>}
   {mode!=='forgot'&&!valid?<p role="alert" className="mt-5 text-sm text-red-700">Geçerli bağlantı bulunamadı. Deneme kutusundaki bağlantıyı yeniden aç veya yeni bağlantı iste.</p>:<form onSubmit={submit} className="mt-5 space-y-4"><fieldset disabled={busy} className="space-y-4">
    {mode==='forgot'&&<label className="block text-sm font-medium">E-posta adresin<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 p-3"/></label>}
    {mode==='reset'&&<><label className="block text-sm font-medium">Yeni parola<input type="password" autoComplete="new-password" minLength={15} maxLength={128} required value={password} onChange={event=>setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 p-3"/></label><label className="block text-sm font-medium">Yeni parola tekrar<input type="password" autoComplete="new-password" minLength={15} maxLength={128} required value={confirm} onChange={event=>setConfirm(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 p-3"/></label></>}
    <button type="submit" disabled={busy||mode==='forgot'&&delivery!=='local'} className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?'İşleniyor…':mode==='forgot'?'Sıfırlama bağlantısı hazırla':mode==='verify'?'E-postamı doğrula':'Yeni parolayı kaydet'}</button>
   </fieldset></form>}
  </>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
  <div className="mt-6 flex flex-wrap gap-4 text-sm text-green-800"><Link to="/login" className="underline">Giriş sayfası</Link>{mode==='reset'&&<Link to="/forgot-password" className="underline">Yeni bağlantı iste</Link>}<Link to="/account" className="underline">Hesabım</Link></div>
 </section></main>;
}
