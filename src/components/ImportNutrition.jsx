import { useState, useSyncExternalStore } from 'react';
import { getPersonalSnapshot,subscribePersonal,localNutritionKeys,toDocumentKey,importNutrition,bootstrapPersonal } from '../data/personalStorage';
export default function ImportNutrition() {
  const state=useSyncExternalStore(subscribePersonal,getPersonalSnapshot,getPersonalSnapshot);
  const [selected,setSelected]=useState([]);
  let keys=[],sourceError='';
  try{keys=localNutritionKeys();}catch{sourceError='Tarayıcı kayıtları okunamadı; kaynaklar korundu.';}
  const toggle=key=>setSelected(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
  return <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
    <h2 className="text-lg font-bold">Beslenme kayıtlarını hesabıma aktar</h2>
    <p className="mt-2 text-sm leading-6">Aktarmak istediğin kayıtları seç. Paylaşılan bilgisayarda yalnızca kendi verilerini aktar. Mevcut hesap kayıtları değiştirilmez; tekrar aktarım kopya oluşturmaz. Tarayıcı kaynakları silinmez. Hata olursa önceki başarılı aktarımlar kalır.</p>
    <p className="mt-2 text-sm leading-6">Özel ürünlerini önce üstteki ürün aktarımından taşı. Eski öğünlerin asıl günündeki etiket değerleri bilinmiyorsa aktarım anındaki katalog değerleri kullanılır ve tahmini aktarım olarak işaretlenir. Bulunamayan ürünün miktarı korunur; besin değerleri uydurulmaz.</p>
    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{keys.map(key=><label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={state.busy} checked={selected.includes(key)} onChange={()=>toggle(key)}/>{({profile:'Asistan hedef profili',plan:'Vücut bilgileri ve beslenme planı',targets:'Günlük makro hedefleri'})[toDocumentKey(key)]||'Öğün kaydı: '+toDocumentKey(key).slice(4)}</label>)}</div>
    {!keys.length&&<p className="mt-3 text-sm">Bu tarayıcıda aktarılabilecek beslenme kaydı yok.</p>}
    <button type="button" disabled={!state.ready||state.busy||!selected.length} onClick={()=>importNutrition(selected)} className="mt-4 rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{state.busy?'Aktarılıyor…':'Seçtiğim beslenme kayıtlarını aktar'}</button>
    {(sourceError||state.error)&&<p role="alert" className="mt-3 text-sm text-red-700">{sourceError||state.error}{!state.ready&&<button type="button" onClick={bootstrapPersonal} className="ml-2 underline">Yeniden dene</button>}</p>}
    {state.notice&&<p role="status" className="mt-3 text-sm text-green-900">{state.notice}</p>}
    <p className="mt-3 text-xs text-zinc-600">Asistan hedefleri, hesaplayıcı planı ve günlük takip hedefleri ayrı kayıtlardır; birbirlerinin üzerine otomatik yazılmaz.</p>
  </section>;
}
