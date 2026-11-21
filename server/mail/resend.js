import {env} from '../config.js';
export const resendSender='FitizBaby Deneme <onboarding@resend.dev>';
export async function sendResend(message,jobId,{settings=env,fetcher=fetch}={}) {
 if(message.to.toLowerCase()!==settings.RESEND_TEST_RECIPIENT) return {ok:false,retry:false,code:'RECIPIENT_BLOCKED'};
 let response;
 try{response=await fetcher('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+settings.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'fitizbaby/recovery/'+jobId},body:JSON.stringify({from:resendSender,to:[message.to],subject:message.subject,text:message.text}),signal:AbortSignal.timeout(10000)});}
 catch{return {ok:false,retry:true,code:'NETWORK_UNCERTAIN'};}
 const body=await response.json().catch(()=>({}));
 if(response.ok&&typeof body.id==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(body.id))return {ok:true,id:body.id};
 const retry=response.status===429||response.status>=500||response.status===409&&body.name==='concurrent_idempotent_requests'||response.ok;
 return {ok:false,retry,code:response.ok?'INVALID_RECEIPT':'HTTP_'+response.status};
}
