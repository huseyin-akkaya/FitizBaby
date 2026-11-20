const listeners = new Set();
const fixed = { 'fitizbaby-nutrition-profile':'profile', 'fitizbaby-nutrition-plan-v1':'plan', 'fitizbaby.daily-macro-targets.v1':'targets' };
export const toDocumentKey = key => fixed[key] || (/^fitizbaby\.daily-macro-log\.(\d{4}-\d{2}-\d{2})\.v1$/.exec(key)?.[1] ? 'day:' + /^fitizbaby\.daily-macro-log\.(\d{4}-\d{2}-\d{2})\.v1$/.exec(key)[1] : null);
export const toStorageKey = key => Object.keys(fixed).find(item => fixed[item] === key) || (key.startsWith('day:') ? 'fitizbaby.daily-macro-log.' + key.slice(4) + '.v1' : null);
export function localDay() { const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
let state = { scope:'pending',ready:false,error:'',docs:{},days:[],busy:false,notice:'' };
let controller = null;
let version = 0;
const inFlight = new Map();
export const getPersonalSnapshot = () => state;
export const subscribePersonal = listener => {listeners.add(listener);return () => listeners.delete(listener);};
const publish = change => { state={...state,...change};listeners.forEach(listener => listener()); };
const canonical = value => JSON.stringify(value, (_key,item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item);
export const isDirty = doc => doc && canonical(doc.draft) !== canonical(doc.data);
async function request(path='',method='GET',body,expectedScope=state.scope) {
  const scope=expectedScope;
  if(state.scope!==scope)throw new Error('Hesap değişti.'); const signal=controller?.signal;
  let response;
  try { response=await fetch('/api/v1/nutrition'+path,{method,credentials:'same-origin',cache:'no-store',headers:{'X-FitizBaby-Account':scope,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)}); }
  catch(error) { throw new Error('Beslenme sunucusuna ulaşılamadı. Taslaklar korundu; kayıt sonucunu yenileyerek kontrol et.',{cause:error}); }
  const result=await response.json().catch(()=>({}));
  if (state.scope!==scope || signal?.aborted) throw new Error('Hesap değişti.');
  if(!response.ok) throw new Error(result.error?.message || 'Beslenme kaydı tamamlanamadı.');
  if(result.userId!==scope) throw new Error('Yanıt etkin hesapla eşleşmedi.');
  return result;
}
function storeDocument(document) {
  if(!document || typeof document.key!=='string' || !Object.hasOwn(document,'data') || !Object.hasOwn(document,'revision')) throw new Error('Kayıt yanıtı okunamadı.');
  const old=state.docs[document.key];
  return {...document,draft:structuredClone(document.data),loaded:true,epoch:(old?.epoch||0)+1};
}
export function activatePersonal(scope) {
  controller?.abort();controller=new AbortController();version+=1;inFlight.clear();
  publish({scope,ready:scope==='guest',error:'',docs:{},days:[],busy:false,notice:''});
}
async function loadBootstrap() {
  const scope=state.scope;const current=version;
  if(scope==='guest'||scope==='pending') return;
  try {
    const result=await request('?day='+localDay());
    if(version!==current)return;
    const docs=Object.fromEntries(result.documents.map(doc=>[doc.key,storeDocument(doc)]));
    publish({docs,days:result.days,ready:true,error:''});
  }catch(error){if(state.scope===scope&&version===current)publish({error:error.message,ready:false});}
}
export function bootstrapPersonal() {
  if(inFlight.has('bootstrap'))return inFlight.get('bootstrap');
  const promise=loadBootstrap().finally(()=>{if(inFlight.get('bootstrap')===promise)inFlight.delete('bootstrap');});
  inFlight.set('bootstrap',promise);return promise;
}
export async function ensureDocuments(keys) {
  if(state.scope==='guest')return;
  await Promise.all(keys.map(async key=>{
    if(state.docs[key]?.loaded)return;
    if(inFlight.has(key))return inFlight.get(key);
    const current=version;
    const promise=request('/'+encodeURIComponent(key)).then(result=>{if(version===current)publish({docs:{...state.docs,[key]:storeDocument(result.document)},error:''});}).catch(error=>{if(version===current)publish({error:error.message});}).finally(()=>{if(version===current)inFlight.delete(key);});
    inFlight.set(key,promise);return promise;
  }));
}
export const personalStorage = {
  getItem(key) {
    if(state.scope==='guest')return localStorage.getItem(key);
    const document=state.docs[toDocumentKey(key)];
    return document?.draft == null ? null : JSON.stringify(document.draft);
  },
  setItem(key,value) {
    if(!state.ready||state.busy)throw new Error('Kayıtlar hazır değil veya başka bir kayıt işlemi sürüyor.');
    try {
      const parsed=JSON.parse(value);
      if(state.scope==='guest') {
        const old=localStorage.getItem(key);
        // Keep the first source version before the snapshot-capable format is saved.
        const backup='fitizbaby.backup.before-nutrition-v2.'+key;
        if(old!==null&&localStorage.getItem(backup)===null)localStorage.setItem(backup,old);
        localStorage.setItem(key,value);publish({error:''});return;
      }
      const docKey=toDocumentKey(key);const doc=state.docs[docKey];
      if(!doc?.loaded)throw new Error('Kayıt henüz yüklenmedi.');
      if(canonical(doc.draft)===canonical(parsed))return;
      publish({docs:{...state.docs,[docKey]:{...doc,draft:parsed}},error:'',notice:''});
    }catch(error){publish({error:error.message});throw error;}
  },
};
export async function saveDocuments(keys) {
  if(state.scope==='guest')return;
  if(state.busy||!state.ready)throw new Error('Kayıtlar henüz hazır değil.');
  const scope=state.scope;const operationVersion=version;publish({busy:true,error:'',notice:''});
  try {
    for(const key of keys) {
      if(version!==operationVersion)throw new Error('Hesap değişti.');
      const doc=state.docs[key];if(!isDirty(doc))continue;
      const result=await request('/'+encodeURIComponent(key),'PUT',{revision:doc.revision,data:doc.draft},scope);
      if(version!==operationVersion)throw new Error('Hesap değişti.');
      publish({docs:{...state.docs,[key]:storeDocument(result.document)},days:key.startsWith('day:')?[...new Set([...state.days,key.slice(4)])].sort().reverse():state.days});
    }
    publish({notice:'Değişiklikler hesabına kaydedildi.'});
  }catch(error){if(state.scope===scope&&version===operationVersion)publish({error:error.message});throw error;}
  finally{if(state.scope===scope&&version===operationVersion)publish({busy:false});}
}
export async function reloadDocuments(keys) {
  if(state.busy)return;
  const scope=state.scope;const operationVersion=version;publish({busy:true,error:'',notice:''});
  try {
    const results=await Promise.all(keys.map(key=>request('/'+encodeURIComponent(key),'GET',undefined,scope)));
    if(version!==operationVersion)throw new Error('Hesap değişti.');
    const docs={...state.docs};for(const result of results)docs[result.document.key]=storeDocument(result.document);
    publish({docs,notice:'Sunucudaki kayıt yüklendi.'});
  }catch(error){if(state.scope===scope&&version===operationVersion)publish({error:error.message});}
  finally{if(state.scope===scope&&version===operationVersion)publish({busy:false});}
}
export function localNutritionKeys() {
  const keys=[];for(let i=0;i<localStorage.length;i+=1){const key=localStorage.key(i);if(toDocumentKey(key))keys.push(key);}return keys.sort();
}
function importValue(key,value) {
  if(key==='plan') {
    value={...value,calculationVersion:3};
    if(value.profile){const legacy={'1.2':'inactive','1.375':'low','1.55':'active','1.725':'veryActive','1.9':'veryActive'};value.profile={...value.profile,activity:legacy[value.profile.activity]||value.profile.activity};}
  }
  if(key.startsWith('day:')) {
    value=Object.fromEntries(['breakfast','lunch','dinner','snacks'].map(meal=>[meal,(value[meal]||[]).map(entry=>({...entry,id:entry.id||crypto.randomUUID(),...(entry.mode?{}:{mode:'custom',amount:String((Number(entry.quantity)||0)*100),packageSize:'',packageCount:1})})).map(entry=>{const copy={...entry};delete copy.quantity;return copy;})]));
  }
  return value;
}
export async function importNutrition(sourceKeys) {
  if(state.busy||!state.ready) return;
  const scope=state.scope;const operationVersion=version;
  if(Object.values(state.docs).some(isDirty)){publish({error:'Önce açık taslaklarını kaydet veya ilgili sayfada sunucudaki kaydı yeniden yükle.'});return;}
  publish({busy:true,error:'',notice:''});let imported=0,skipped=0;
  try{
    for(const sourceKey of sourceKeys){
      if(version!==operationVersion)throw new Error('Hesap değişti.');
      const key=toDocumentKey(sourceKey);if(!key)continue;
      const raw=localStorage.getItem(sourceKey);if(raw===null)continue;
      const result=await request('/import/'+encodeURIComponent(key),'POST',{data:importValue(key,JSON.parse(raw))},scope);
      if(version!==operationVersion)throw new Error('Hesap değişti.');
      if(result.imported)imported+=1;else skipped+=1;
      publish({docs:{...state.docs,[key]:storeDocument(result.document)},days:key.startsWith('day:')?[...new Set([...state.days,key.slice(4)])].sort().reverse():state.days});
    }
    publish({notice:`${imported} kayıt aktarıldı; mevcut ${skipped} hesap kaydı korundu. Tarayıcı kaynakları silinmedi.`});
  }catch(error){if(state.scope===scope&&version===operationVersion)publish({error:`${imported} kayıt aktarıldıktan sonra durdu: ${error.message} Kaynaklar korundu; tekrar aktarım mevcut kayıtları ezmez.`});}
  finally{if(state.scope===scope&&version===operationVersion)publish({busy:false});}
}
