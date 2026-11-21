export async function accountDataRequest(accountId,path,method,data) {
 let response;
 try{response=await fetch('/api/v1/account'+path,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-FitizBaby-Account':accountId},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});}
 catch(error){throw new Error(method==='DELETE'?'Silme işleminin sonucu alınamadı. Oturumunu yenileyerek sonucu kontrol et; tekrar giriş yapılamıyorsa hesap silinmiş olabilir.':'İndirme hazırlanamadı. Yeniden dene.',{cause:error});}
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error?.message||'Hesap işlemi tamamlanamadı.');
 return result;
}
