export async function accountSecurityRequest(accountId,path,{data,signal}={}){
 let response;
 try{response=await fetch('/api/v1/account/security'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{'X-FitizBaby-Account':accountId,...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data),signal:signal||AbortSignal.timeout(20000)});}
 catch(error){if(error.name==='AbortError')throw error;throw new Error(data===undefined?'Oturum listesi alınamadı. Yeniden dene.':'İşlem sonucu alınamadı. Oturum listesini yenile; parola değiştiriyorsan yeni parolayla giriş yaparak sonucu kontrol et.',{cause:error});}
 const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error?.message||'Güvenlik işlemi tamamlanamadı.');return result;
}
