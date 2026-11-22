import argon2 from 'argon2';
import {z} from 'zod';
import {passwordWork} from '../middleware/security.js';
import {sessionTokenHash} from '../routes/auth.js';
export const currentPasswordSchema=z.string().min(1).max(128).refine(value=>Buffer.byteLength(value,'utf8')<=512);
const denied=res=>res.status(403).json({error:{code:'REAUTH_FAILED',message:'Parolan veya oturumun doğrulanamadı. İşlem yapılmadı.'}});
export async function reauthenticate(database,req,res,action,prepare=()=>undefined) {
 const userId=res.locals.userId;
 const result=await database.query('SELECT password_hash FROM users WHERE id=$1',[userId]);
 const stored=result.rows[0]?.password_hash;
 if(!stored||!await passwordWork(()=>argon2.verify(stored,req.body.password)))return denied(res);
 const prepared=await prepare();
 const client=await database.connect();
 try{
  await client.query('BEGIN');
  const current=await client.query('SELECT password_hash,email FROM users WHERE id=$1 FOR UPDATE',[userId]);
  if(current.rows[0]?.password_hash!==stored){await client.query('ROLLBACK');return denied(res);}
  const session=await client.query("SELECT id FROM user_sessions WHERE user_id=$1 AND token_hash=$2 AND expires_at>NOW() AND last_seen_at>NOW()-INTERVAL '30 minutes' FOR UPDATE",[userId,sessionTokenHash(req)]);
  if(!session.rowCount){await client.query('ROLLBACK');return denied(res);}
  const output=await action(client,{userId,sessionId:session.rows[0].id,email:current.rows[0].email},prepared);
  await client.query('COMMIT');return output;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
