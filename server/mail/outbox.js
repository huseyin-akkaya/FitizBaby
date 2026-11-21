import {createCipheriv,createDecipheriv,randomBytes,randomUUID} from 'node:crypto';
import {env} from '../config.js';
import {sendResend} from './resend.js';
const aad=(id,actionId)=>Buffer.from('fitizbaby-mail-v1:'+id+':'+actionId);
export function encryptMail(message,id,actionId,key) {
 const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'base64'),nonce);cipher.setAAD(aad(id,actionId));
 const data=Buffer.concat([cipher.update(JSON.stringify(message),'utf8'),cipher.final()]);return Buffer.concat([nonce,cipher.getAuthTag(),data]);
}
export function decryptMail(data,id,actionId,key) {
 const cipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'base64'),data.subarray(0,12));cipher.setAAD(aad(id,actionId));cipher.setAuthTag(data.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString('utf8'));
}
export async function enqueueMail(client,message,{userId,actionId,expiresAt,settings=env}) {
 if(message.to.toLowerCase()!==settings.RESEND_TEST_RECIPIENT)return false;
 const now=new Date(),windows=[['day:'+now.toISOString().slice(0,10),settings.MAIL_DAILY_LIMIT],['month:'+now.toISOString().slice(0,7),settings.MAIL_MONTHLY_LIMIT]];
 // A global budget lock prevents concurrent accounts from exceeding the free cap.
 await client.query('SELECT pg_advisory_xact_lock(843115045)');
 for(const [window,limit] of windows){const found=await client.query('SELECT reserved FROM mail_usage WHERE window_key=$1',[window]);if((found.rows[0]?.reserved||0)>=limit)return false;}
 for(const [window] of windows)await client.query('INSERT INTO mail_usage (window_key,reserved) VALUES ($1,1) ON CONFLICT (window_key) DO UPDATE SET reserved=mail_usage.reserved+1',[window]);
 const id=randomUUID(),ciphertext=encryptMail(message,id,actionId,settings.MAIL_OUTBOX_KEY);
 await client.query('INSERT INTO mail_outbox (id,user_id,action_id,ciphertext,expires_at) VALUES ($1,$2,$3,$4,$5)',[id,userId,actionId,ciphertext,new Date(Math.min(new Date(expiresAt).getTime(),now.getTime()+30*60*1000))]);
 return true;
}
export async function processOneMail(database,{settings=env,send=sendResend}={}) {
 if(settings.MAIL_MODE!=='resend')return false;
 const client=await database.connect();let job;
 try{
  await client.query('BEGIN');
  await client.query("UPDATE mail_outbox j SET state='dead',ciphertext=NULL,lease_token=NULL,lease_until=NULL,last_error='EXPIRED_OR_REVOKED',updated_at=NOW() FROM account_actions a WHERE a.id=j.action_id AND j.state IN ('pending','sending') AND (j.expires_at<=NOW() OR a.used_at IS NOT NULL OR a.expires_at<=NOW() OR j.attempts>=5 AND (j.lease_until IS NULL OR j.lease_until<=NOW()))");
  const selected=await client.query("SELECT j.* FROM mail_outbox j JOIN account_actions a ON a.id=j.action_id WHERE a.used_at IS NULL AND a.expires_at>NOW() AND j.expires_at>NOW() AND j.attempts<5 AND (j.state='pending' AND j.available_at<=NOW() OR j.state='sending' AND j.lease_until<=NOW()) ORDER BY j.created_at,j.id FOR UPDATE OF j SKIP LOCKED LIMIT 1");
  if(!selected.rowCount){await client.query('COMMIT');return false;}
  job=selected.rows[0];job.lease=randomUUID();
  await client.query("UPDATE mail_outbox SET state='sending',attempts=attempts+1,lease_token=$2,lease_until=NOW()+INTERVAL '30 seconds',updated_at=NOW() WHERE id=$1",[job.id,job.lease]);await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
 // No network operation occurs inside a database transaction.
 let result;
 try{const message=decryptMail(job.ciphertext,job.id,job.action_id,settings.MAIL_OUTBOX_KEY);result=await send(message,job.id,{settings});}
 catch{result={ok:false,retry:false,code:'PAYLOAD_UNAVAILABLE'};}
 if(result.ok)await database.query("UPDATE mail_outbox SET state='sent',ciphertext=NULL,lease_token=NULL,lease_until=NULL,provider_message_id=$3,last_error=NULL,updated_at=NOW() WHERE id=$1 AND lease_token=$2",[job.id,job.lease,result.id]);
 else{
  const retry=result.retry&&job.attempts+1<5;
  await database.query("UPDATE mail_outbox SET state=$3,ciphertext=CASE WHEN $4::boolean THEN ciphertext ELSE NULL END,available_at=NOW()+($5::int*INTERVAL '1 second'),lease_token=NULL,lease_until=NULL,last_error=$6,updated_at=NOW() WHERE id=$1 AND lease_token=$2",[job.id,job.lease,retry?'pending':'dead',retry,5*3**job.attempts,result.code]);
 }
 return true;
}
export function startMailWorker(database) {
 if(!database||env.MAIL_MODE!=='resend')return ()=>{};
 let busy=false,stopped=false;
 const tick=async()=>{if(busy||stopped)return;busy=true;try{await processOneMail(database);}catch{console.error('E-posta kuyruğu işlemi tamamlanamadı.');}finally{busy=false;}};
 const timer=setInterval(tick,5000);timer.unref();tick();
 return ()=>{stopped=true;clearInterval(timer);};
}
