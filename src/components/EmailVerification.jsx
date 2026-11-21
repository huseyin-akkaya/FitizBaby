import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { recoveryRequest } from '../services/recoveryApi';
export default function EmailVerification() {
 const {user}=useAuth();const [delivery,setDelivery]=useState('loading');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 useEffect(()=>{let live=true;recoveryRequest('recovery-status').then(result=>{if(live)setDelivery(result.delivery);}).catch(()=>{if(live)setDelivery('disabled');});return()=>{live=false;};},[]);
 async function send(){setBusy(true);setError('');setNotice('');try{const result=await recoveryRequest('request-verification',{},user.id);setNotice(result.message);}catch(failure){setError(failure.message);}finally{setBusy(false);}}
 return <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
  <h2 className="text-lg font-bold">Hesap güvenliği</h2>
  <p className="mt-2 text-sm">{user.emailVerified?'E-posta adresin doğrulandı.':'E-posta adresin henüz doğrulanmadı.'}</p>
  <p className="mt-2 text-sm text-zinc-600">{delivery==='local'?'Yerel deneme kullanılıyor. Gerçek e-posta gönderilmez; bağlantı yalnızca bu bilgisayardaki korumalı deneme kutusuna yazılır.':delivery==='loading'?'Gönderim durumu kontrol ediliyor…':'E-posta gönderimi bu ortamda bağlı değil.'}</p>
  <p className="mt-2 text-xs text-zinc-500">Bu deneme gerçek e-posta sahipliğini kanıtlamaz. Yerel geliştirmede doğrulama henüz hesap erişiminin ön koşulu değildir.</p>
  <div className="mt-3 flex flex-wrap gap-3">{!user.emailVerified&&<button type="button" disabled={busy||delivery!=='local'} onClick={send} className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy?'Hazırlanıyor…':'Doğrulama bağlantısı hazırla'}</button>}<Link to="/forgot-password" className="rounded-lg border border-zinc-300 px-4 py-2">Parolamı sıfırla</Link></div>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="mt-3 text-sm text-green-900">{notice}</p>}
 </section>;
}
