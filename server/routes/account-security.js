import {Router} from 'express';
import argon2 from 'argon2';
import {z} from 'zod';
import {requireAccount} from '../middleware/account.js';
import {reauthenticate,currentPasswordSchema} from '../auth/reauthenticate.js';
import {hashOptions,passwordSchema} from '../auth/password-policy.js';
import {passwordWork} from '../middleware/security.js';
import {sessionTokenHash} from './auth.js';
const proof=z.object({password:currentPasswordSchema}).strict();
const change=z.object({password:currentPasswordSchema,newPassword:passwordSchema}).strict().refine(value=>value.password!==value.newPassword);
const fail=(res,status,code,message)=>res.status(status).json({error:{code,message}});
export function createAccountSecurityRouter(database,limits){
 const router=Router();router.use(requireAccount(database));
 router.get('/sessions',limits.securityRead,async(req,res)=>{
  const result=await database.query(`SELECT s.id,s.created_at,s.last_seen_at,s.expires_at,(s.token_hash=$2) AS current
   FROM user_sessions s WHERE s.user_id=$1 AND s.expires_at>NOW() AND s.last_seen_at>NOW()-INTERVAL '30 minutes'
   AND EXISTS(SELECT 1 FROM user_sessions c WHERE c.user_id=$1 AND c.token_hash=$2 AND c.expires_at>NOW() AND c.last_seen_at>NOW()-INTERVAL '30 minutes')
   ORDER BY current DESC,s.created_at DESC,s.id`,[res.locals.userId,sessionTokenHash(req)]);
  if(!result.rows.some(row=>row.current))return fail(res,401,'UNAUTHORIZED','Oturumun kapandı. Yeniden giriş yap.');
  return res.json({sessions:result.rows.map(row=>({id:row.id,current:row.current,createdAt:row.created_at,lastSeenAt:row.last_seen_at,expiresAt:row.expires_at}))});
 });
 router.post('/password',limits.securityWrite,async(req,res)=>{
  if(!change.safeParse(req.body).success)return fail(res,400,'INVALID_INPUT','Güncel parolanı ve mevcut parolandan farklı, 15–128 karakterlik yeni parolanı gir.');
  await reauthenticate(database,req,res,async(client,account,newHash)=>{
   await client.query('UPDATE users SET password_hash=$2,updated_at=NOW() WHERE id=$1',[account.userId,newHash]);
   await client.query('DELETE FROM user_sessions WHERE user_id=$1',[account.userId]);
   await client.query('UPDATE account_actions SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',[account.userId]);
   await client.query("UPDATE mail_outbox SET state='dead',ciphertext=NULL,lease_until=NULL,lease_token=NULL,last_error='PASSWORD_CHANGED',updated_at=NOW() WHERE user_id=$1 AND state IN ('pending','sending')",[account.userId]);
  },()=>passwordWork(()=>argon2.hash(req.body.newPassword,hashOptions)));
  // Do not clear a cookie here: a delayed response must not erase a newer login.
  if(!res.headersSent)res.json({changed:true,message:'Parolan değiştirildi. Bu hesabın tüm oturumları kapatıldı. Yeni parolanla giriş yap.'});
 });
 router.post('/sessions/revoke-others',limits.securityWrite,async(req,res)=>{
  if(!proof.safeParse(req.body).success)return fail(res,400,'INVALID_INPUT','Güncel parolanı gir.');
  const result=await reauthenticate(database,req,res,async(client,account)=>{
   const removed=await client.query('DELETE FROM user_sessions WHERE user_id=$1 AND id<>$2',[account.userId,account.sessionId]);return{revoked:removed.rowCount};
  });
  if(!res.headersSent)res.json(result);
 });
 router.post('/sessions/:id/revoke',limits.securityWrite,async(req,res)=>{
  if(!proof.safeParse(req.body).success||!z.uuid().safeParse(req.params.id).success)return fail(res,400,'INVALID_INPUT','Geçerli oturum ve güncel parola gerekli.');
  const result=await reauthenticate(database,req,res,async(client,account)=>{
   if(req.params.id===account.sessionId)return{current:true};
   const removed=await client.query('DELETE FROM user_sessions WHERE user_id=$1 AND id=$2',[account.userId,req.params.id]);return{revoked:removed.rowCount};
  });
  if(res.headersSent)return;
  if(result.current)return fail(res,409,'CURRENT_SESSION','Bu oturumu kapatmak için menüdeki Çıkış yap seçeneğini kullan.');
  if(!result.revoked)return fail(res,404,'SESSION_NOT_FOUND','Oturum bulunamadı veya zaten kapatılmış. Listeyi yenile.');
  return res.json(result);
 });
 return router;
}
