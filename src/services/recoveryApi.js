export async function recoveryRequest(path,data,accountId) {
 let response;
 try{response=await fetch('/api/v1/auth/'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(accountId?{'X-FitizBaby-Account':accountId}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(15000)});}
 catch(error){throw new Error('Hesap sunucusuna ulaşılamadı. Yeniden dene.',{cause:error});}
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error?.message||'İşlem tamamlanamadı.');
 return result;
}
