import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import {accountDataRequest} from '../services/accountDataApi';
export default function AccountDataControls() {
 const {user,refreshAcrossTabs}=useAuth(),navigate=useNavigate();
 const [exportPassword,setExportPassword]=useState(''),[deletePassword,setDeletePassword]=useState(''),[confirmation,setConfirmation]=useState('');
 const [showDelete,setShowDelete]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[downloadUrl,setDownloadUrl]=useState('');
 const live=useRef(true),frame=useRef(null);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 async function prepare(event){
  event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');setDownloadUrl('');
  try{const result=await accountDataRequest(user.id,'/export','POST',{password:exportPassword});if(!live.current)return;const url=new URL(result.downloadUrl,window.location.origin);if(url.origin!==window.location.origin||url.pathname!=='/api/v1/account/export'||url.searchParams.get('account')!==user.id)throw new Error('Geçerli indirme adresi alınamadı.');setDownloadUrl(url.pathname+url.search);setNotice('Dosyanı indirmek için aşağıdaki bağlantıyı kullan. İzin 2 dakika geçerli ve tek kullanımlıktır.');}
  catch(failure){if(live.current)setError(failure.message);}finally{if(live.current){setBusy(false);setExportPassword('');}}
 }
 async function remove(event){
  event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const result=await accountDataRequest(user.id,'','DELETE',{password:deletePassword,confirmation});if(!result.deleted)throw new Error('Hesap silme sonucu doğrulanamadı.');
   try{localStorage.removeItem('fitizbaby.compareProductIds.account.'+user.id);}catch{/* Only this account's disposable selection is affected. */}
   if(!live.current)return;
   navigate('/account-deleted',{replace:true,state:{accountDeleted:true,warnings:result.warnings||[]}});await refreshAcrossTabs();
  }catch(failure){if(live.current)setError(failure.message);}finally{if(live.current){setBusy(false);setDeletePassword('');}}
 }
 function frameLoaded(){
  try{const text=frame.current?.contentDocument?.body?.textContent;if(!text)return;const result=JSON.parse(text);if(result.error?.message){setError(result.error.message);setDownloadUrl('');}}
  catch{/* Successful attachments are handled by the browser's download manager. */}
 }
 return <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4" aria-labelledby="account-data-heading">
  <h2 id="account-data-heading" className="text-lg font-bold">Verilerim ve hesabım</h2>
  <p className="mt-2 text-sm leading-6">Hesabındaki profil, özel ürünler ve görseller, favoriler, plan ve günlük kayıtları sıkıştırılmış JSON dosyası olarak indirebilirsin. Parola özeti, oturumlar, güvenlik bağlantıları ve gizli anahtarlar dosyaya girmez. Dosya kişisel beslenme bilgilerini içerir; sıkıştırılmıştır, şifrelenmiş değildir. Güvenli bir yerde sakla. Dosyayı uygulamaya geri yükleme henüz yoktur.</p>
  <form onSubmit={prepare} className="mt-4 space-y-3"><fieldset disabled={busy} className="space-y-3"><label className="block text-sm font-medium">Dışa aktarmak için güncel parolan<input type="password" autoComplete="current-password" required maxLength={128} value={exportPassword} onChange={event=>setExportPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3"/></label><button type="submit" className="rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?'İşleniyor…':'Verilerimi indirmeye hazırla'}</button></fieldset></form>
  {downloadUrl&&<a href={downloadUrl} target={'fitizbaby-export-'+user.id} onClick={()=>setNotice('İndirme isteği başlatıldı. Tarayıcının indirilenler bölümünü kontrol et.')} className="mt-3 inline-block rounded-xl border border-green-400 bg-white px-4 py-3 font-semibold text-green-900">Dosyayı indir (.json.gz)</a>}
  <iframe ref={frame} name={'fitizbaby-export-'+user.id} title="Hesap verisi indirme" hidden sandbox="allow-same-origin allow-downloads" onLoad={frameLoaded}/>
  <div className="mt-6 border-t border-zinc-200 pt-5"><button type="button" disabled={busy} onClick={()=>{setShowDelete(value=>!value);setError('');}} className="font-semibold text-red-700 underline">{showDelete?'Silme seçeneklerini kapat':'Hesabımı silme seçeneklerini aç'}</button>
   {showDelete&&<form onSubmit={remove} className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"><fieldset disabled={busy} className="space-y-4">
    <h3 className="font-bold text-red-900">Hesabını kalıcı olarak sil</h3><p className="text-sm leading-6">Bu hesaba ait sunucu profili, özel ürünler ve görseller, favoriler, beslenme planı, günlük kayıtlar, açık oturumlar ve bekleyen güvenlik bağlantıları silinecek. Bu işlem geri alınamaz. İstersen önce verilerini indir.</p>
    <p className="text-sm leading-6">Tarayıcıdaki misafir kayıtları, önceden indirdiğin dosyalar, genel uygulama ayarları ve e-posta sağlayıcısındaki gönderim kayıtları otomatik silinmez. Başlamış bir e-posta gönderimi geri çağrılamayabilir; bağlantısı silme sonrasında çalışmaz.</p>
    <label className="block text-sm font-medium">Silmek için güncel parolan<input type="password" autoComplete="current-password" required maxLength={128} value={deletePassword} onChange={event=>setDeletePassword(event.target.value)} className="mt-2 w-full rounded-xl border border-red-200 bg-white p-3"/></label>
    <label className="block text-sm font-medium">Onay için HESABIMI SIL yaz<input type="text" autoComplete="off" spellCheck={false} required maxLength={30} value={confirmation} onChange={event=>setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-red-200 bg-white p-3"/></label>
    <div className="flex flex-wrap gap-3"><button type="submit" disabled={confirmation!=='HESABIMI SIL'||!deletePassword} className="rounded-xl bg-red-700 px-4 py-3 font-semibold text-white disabled:opacity-50">Hesabımı kalıcı olarak sil</button><button type="button" onClick={()=>{setShowDelete(false);setDeletePassword('');setConfirmation('');}} className="rounded-xl border border-red-200 bg-white px-4 py-3 font-semibold">Vazgeç</button></div>
   </fieldset></form>}
  </div>
  {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="mt-4 text-sm text-green-900">{notice}</p>}
 </section>;
}
