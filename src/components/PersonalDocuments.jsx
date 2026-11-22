import { useEffect, useState, useSyncExternalStore } from 'react';
import { ensureDocuments, bootstrapPersonal, getPersonalSnapshot, subscribePersonal, isDirty, saveDocuments, reloadDocuments } from '../data/personalStorage';
function usePersonalState(){return useSyncExternalStore(subscribePersonal,getPersonalSnapshot,getPersonalSnapshot);}
export function PersonalGate({keys,children,preserveOnSave=false}) {
  const state=usePersonalState();const signature=keys.join('|');
  const loaded=state.scope==='guest'||keys.every(key=>state.docs[key]?.loaded);
  useEffect(()=>{if(state.ready&&!loaded)ensureDocuments(signature.split('|'));},[state.ready,loaded,signature]);
  if(!state.ready||!loaded)return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Beslenme kayıtları</h1><p role={state.error?'alert':'status'} className="mt-4">{state.error||'Kayıtlar yükleniyor…'}</p>{state.error&&<button type="button" onClick={()=>state.ready?ensureDocuments(keys):bootstrapPersonal()} className="mt-4 rounded-xl bg-green-700 px-4 py-3 text-white">Yeniden dene</button>}</main>;
  const epoch=preserveOnSave?'stable':keys.map(key=>state.docs[key]?.epoch||0).join(':');
  return <section key={state.scope+':'+signature+':'+epoch}><fieldset disabled={state.busy}>{children}</fieldset></section>;
}
export function PersonalSavePanel({keys}) {
  const state=usePersonalState();const [confirm,setConfirm]=useState(false);
  const dirty=keys.some(key=>isDirty(state.docs[key]));
  const account=state.scope!=='guest';
  return <aside className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm" aria-label="Beslenme kayıt durumu">
    <p role="status">{!account?'Misafir kayıtları yalnızca bu tarayıcıda saklanır.':state.busy?'Kayıt işlemi sürüyor…':dirty?'Kaydedilmemiş değişiklikler var. Hesabına göndermek için kaydet.':'Bu sayfa hesabındaki kayıtları kullanır.'}</p>
    {account&&<div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={!dirty||state.busy} onClick={()=>saveDocuments(keys).catch(()=>{})} className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Hesabıma kaydet</button><button type="button" disabled={state.busy} onClick={()=>dirty?setConfirm(true):reloadDocuments(keys)} className="rounded-lg border border-green-300 px-4 py-2">Sunucudan yenile</button></div>}
    {confirm&&<div className="mt-3"><p>Kaydedilmemiş taslakları bırakıp sunucudaki sürümü yüklemek istiyor musun?</p><button type="button" disabled={state.busy} onClick={()=>{setConfirm(false);reloadDocuments(keys);}} className="mr-4 mt-2 underline">Evet, taslağı bırak</button><button type="button" onClick={()=>setConfirm(false)} className="underline">Vazgeç</button></div>}
    {state.error&&<p role="alert" className="mt-3 text-red-700">{state.error}</p>}
    {state.notice&&<p role="status" className="mt-3 text-green-900">{state.notice}</p>}
  </aside>;
}
