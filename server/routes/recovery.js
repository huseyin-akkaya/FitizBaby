import { createHash,randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { env } from '../config.js';
import { lookupUser } from './auth.js';
import { hashOptions,passwordSchema } from '../auth/password-policy.js';
import { passwordWork } from '../middleware/security.js';
import { enqueueMail } from '../mail/outbox.js';
import { writeLocalMail } from '../mail/local-mail.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
const token=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const emailSchema=z.object({email:z.string().trim().toLowerCase().pipe(z.email().max(254))}).strict();
const verifySchema=z.object({token}).strict();
const resetSchema=z.object({token,password:passwordSchema}).strict();
const fail=(res,status,code,message)=>res.status(status).json({error:{code,message}});
const invalid=res=>fail(res,400,'INVALID_LINK','Bağlantı geçersiz, süresi dolmuş veya daha önce kullanılmış. Yeni bağlantı iste.');
const unavailable=res=>fail(res,503,'RECOVERY_UNAVAILABLE','Hesap kurtarma hizmeti bu ortamda hazır değil.');
const localNotice='Bu adres için işlem yapılabiliyorsa bağlantı yerel deneme kutusuna yazıldı. Gerçek e-posta gönderilmedi. Yeni istek için en az 60 saniye bekle.';
const notice=()=>env.MAIL_MODE==='resend'?'Bu adres için işlem yapılabiliyorsa e-posta gönderim kuyruğuna alındı. Ücretsiz test yalnızca tanımlı deneme alıcısında çalışır. Yeni istek için en az 60 saniye bekle.':localNotice;
async function issue(database,userId,purpose,deliver) {
 const client=await database.connect();
 try {
  await client.query('BEGIN');
  const owner=await client.query('SELECT email,email_verified_at,email_verification_source FROM users WHERE id=$1 FOR UPDATE',[userId]);
  if(!owner.rowCount||purpose==='verify'&&owner.rows[0].email_verified_at&&(env.MAIL_MODE!=='resend'||owner.rows[0].email_verification_source==='resend')){await client.query('ROLLBACK');return;}
  if(env.MAIL_MODE==='resend'&&owner.rows[0].email!==env.RESEND_TEST_RECIPIENT){await client.query('ROLLBACK');return;}
  const recent=await client.query("SELECT COUNT(*) FILTER (WHERE created_at>NOW()-INTERVAL '1 hour')::int AS count,COUNT(*) FILTER (WHERE created_at>NOW()-INTERVAL '60 seconds')::int AS cooldown FROM account_actions WHERE user_id=$1 AND purpose=$2",[userId,purpose]);
  if(recent.rows[0].count>=5||recent.rows[0].cooldown){await client.query('ROLLBACK');return;}
  const value=randomBytes(32).toString('base64url');
  const expiresAt=new Date(Date.now()+(purpose==='verify'?24*60:30)*60*1000);
  await client.query('UPDATE account_actions SET used_at=NOW() WHERE user_id=$1 AND purpose=$2 AND used_at IS NULL',[userId,purpose]);
  const action=await client.query('INSERT INTO account_actions (user_id,purpose,token_hash,expires_at,delivery) VALUES ($1,$2,$3,$4,$5) RETURNING id',[userId,purpose,digest(value),expiresAt,env.MAIL_MODE==='resend'?'resend':'local']);
  await client.query("DELETE FROM account_actions WHERE user_id=$1 AND expires_at<NOW()-INTERVAL '2 days'",[userId]);
  const url=env.APP_PUBLIC_URL+(purpose==='verify'?'/verify-email':'/reset-password')+'#token='+value;
  // Local delivery completes before commit; a write failure leaves older tokens valid.
  // A rare commit failure can leave an unusable local message; request a new link.
  const message={to:owner.rows[0].email,subject:purpose==='verify'?'FitizBaby e-posta doğrulama':'FitizBaby parola sıfırlama',text:(purpose==='verify'?'E-posta adresini doğrulamak':'Yeni parola belirlemek')+' için bağlantıyı açıp işlemi ekranda onayla: '+url,expiresAt:expiresAt.toISOString()};
  if(env.MAIL_MODE==='resend'){if(!await enqueueMail(client,message,{userId,actionId:action.rows[0].id,expiresAt})){await client.query('ROLLBACK');return;}}else await deliver(message);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
export function createRecoveryRouter(database,limits,deliver=writeLocalMail) {
 const router=Router();
 router.get('/recovery-status',(_req,res)=>res.json({delivery:env.MAIL_MODE,testOnly:true,verificationRequired:false}));
 router.post('/forgot-password',limits.recoveryAsk,async(req,res)=>{
  const parsed=emailSchema.safeParse(req.body);if(!parsed.success)return fail(res,400,'INVALID_INPUT','Geçerli bir e-posta adresi gir.');
  if(!database||env.MAIL_MODE==='disabled')return unavailable(res);
  const start=performance.now();
  try{const result=await database.query('SELECT id FROM users WHERE email=$1',[parsed.data.email]);if(result.rowCount)await issue(database,result.rows[0].id,'reset',deliver);}
  catch{console.error('Kurtarma isteği tamamlanamadı:',res.locals.requestId);}
  // Same body/status for unknown, throttled and delivery-failed accounts.
  await delay(Math.max(0,400-(performance.now()-start)));
  return res.status(202).json({message:notice(),delivery:env.MAIL_MODE});
 });
 router.post('/request-verification',limits.recoveryAsk,async(req,res)=>{
  if(!z.object({}).strict().safeParse(req.body).success)return fail(res,400,'INVALID_INPUT','Geçerli bir istek gönder.');
  const user=await lookupUser(database,req,res);if(res.headersSent)return;
  if(!user)return fail(res,401,'UNAUTHORIZED','E-posta doğrulaması istemek için giriş yapmalısın.');
  if(req.get('X-FitizBaby-Account')!==user.id)return fail(res,409,'ACCOUNT_CHANGED','Hesap değişti. Sayfayı yenile.');
  if(env.MAIL_MODE==='disabled')return unavailable(res);
  try{await issue(database,user.id,'verify',deliver);}catch{return fail(res,503,'DELIVERY_FAILED','Bağlantı isteği hazırlanamadı. Daha sonra yeniden dene.');}
  return res.status(202).json({message:notice(),delivery:env.MAIL_MODE});
 });
 async function consume(req,res,purpose) {
  const parsed=(purpose==='verify'?verifySchema:resetSchema).safeParse(req.body);
  if(!parsed.success)return fail(res,400,'INVALID_INPUT',purpose==='reset'?'Geçerli bağlantı ve 15–128 karakterlik parola gerekli.': 'Geçerli bir doğrulama bağlantısı gerekli.');
  if(!database)return unavailable(res);
  const hash=digest(parsed.data.token);
  const requireReal=env.MAIL_MODE==='resend'||env.NODE_ENV==='production';
  const candidate=await database.query("SELECT user_id FROM account_actions WHERE token_hash=$1 AND purpose=$2 AND used_at IS NULL AND expires_at>NOW() AND ($3::boolean=FALSE OR delivery='resend')",[hash,purpose,requireReal]);
  if(!candidate.rowCount)return invalid(res);
  const passwordHash=purpose==='reset'?await passwordWork(()=>argon2.hash(parsed.data.password,hashOptions)):null;
  const client=await database.connect();
  try{
   await client.query('BEGIN');
   const userId=candidate.rows[0].user_id;
   const user=await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
   if(!user.rowCount){await client.query('ROLLBACK');return invalid(res);}
   const action=await client.query('SELECT id,delivery FROM account_actions WHERE token_hash=$1 AND user_id=$2 AND purpose=$3 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE',[hash,userId,purpose]);
   if(!action.rowCount||requireReal&&action.rows[0].delivery!=='resend'){await client.query('ROLLBACK');return invalid(res);}
   if(purpose==='reset') {
    await client.query("UPDATE users SET password_hash=$2,email_verified_at=COALESCE(email_verified_at,NOW()),email_verification_source=CASE WHEN email_verification_source='resend' THEN 'resend' ELSE $3 END,updated_at=NOW() WHERE id=$1",[userId,passwordHash,action.rows[0].delivery]);
    await client.query('DELETE FROM user_sessions WHERE user_id=$1',[userId]);
    await client.query('UPDATE account_actions SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',[userId]);
   }else{
    await client.query("UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()),email_verification_source=CASE WHEN email_verification_source='resend' THEN 'resend' ELSE $2 END,updated_at=NOW() WHERE id=$1",[userId,action.rows[0].delivery]);
    await client.query("UPDATE account_actions SET used_at=NOW() WHERE user_id=$1 AND purpose='verify' AND used_at IS NULL",[userId]);
   }
   await client.query('COMMIT');
   return res.json({message:purpose==='reset'?'Parolan değiştirildi. Bu hesabın tüm açık oturumları kapatıldı. Yeni parolanla giriş yap.':'E-posta adresi doğrulandı.'});
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
 }
 router.post('/verify-email',limits.recoveryConsume,(req,res)=>consume(req,res,'verify'));
 router.post('/reset-password',limits.recoveryConsume,(req,res)=>consume(req,res,'reset'));
 return router;
}
