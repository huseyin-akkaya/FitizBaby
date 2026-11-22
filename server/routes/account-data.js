import {createHash,randomBytes} from 'node:crypto';
import {env} from '../config.js';
import {Router} from 'express';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGzip} from 'node:zlib';
import {z} from 'zod';
import {requireAccount} from '../middleware/account.js';
import {sessionTokenHash,publicUser} from './auth.js';
import {reauthenticate} from '../auth/reauthenticate.js';
import {removeLocalAccountMail} from '../mail/cleanup-local.js';
const password=z.string().min(1).max(128).refine(value=>Buffer.byteLength(value,'utf8')<=512);
const exportSchema=z.object({password}).strict();
const deleteSchema=z.object({password,confirmation:z.literal('HESABIMI SIL')}).strict();
const fail=(res,status,code,message)=>res.status(status).json({error:{code,message}});
const denied=res=>fail(res,403,'REAUTH_FAILED','Parolan veya oturumun doğrulanamadı. İşlem yapılmadı.');
const exportCookie=env.NODE_ENV==='production'?'__Secure-fitizbaby_export':'fitizbaby_export';
const hash=value=>createHash('sha256').update(value).digest('hex');
function exportCapability(req){const value=req.headers.cookie?.split(';').map(part=>part.trim()).find(part=>part.startsWith(exportCookie+'='))?.slice(exportCookie.length+1);return value&&/^[A-Za-z0-9_-]{43}$/.test(value)?value:null;}
let activeExports=0;
async function* exportJson(client,userId,account) {
 yield '{"format":"fitizbaby.account-export","version":1,"exportedAt":'+JSON.stringify(new Date().toISOString())+',"account":'+JSON.stringify(account)+',"products":[';
 let cursor='',first=true;
 while(true){const rows=(await client.query('SELECT id,data,image,created_at,updated_at FROM user_products WHERE user_id=$1 AND deleted_at IS NULL AND id>$2 ORDER BY id LIMIT 1',[userId,cursor])).rows;if(!rows.length)break;const row=rows[0];cursor=row.id;yield(first?'':',')+JSON.stringify({...row.data,id:row.id,image:row.image?'data:image/webp;base64,'+row.image.toString('base64'):'',createdAt:row.created_at,updatedAt:row.updated_at});first=false;}
 yield '],"deletedProducts":[';cursor='';first=true;
 while(true){const rows=(await client.query('SELECT id,deleted_at FROM user_products WHERE user_id=$1 AND deleted_at IS NOT NULL AND id>$2 ORDER BY id LIMIT 100',[userId,cursor])).rows;if(!rows.length)break;for(const row of rows){cursor=row.id;yield(first?'':',')+JSON.stringify({id:row.id,deletedAt:row.deleted_at});first=false;}}
 yield '],"favorites":[';cursor='';first=true;
 while(true){const rows=(await client.query('SELECT product_id FROM user_favorites WHERE user_id=$1 AND product_id>$2 ORDER BY product_id LIMIT 100',[userId,cursor])).rows;if(!rows.length)break;for(const row of rows){cursor=row.product_id;yield(first?'':',')+JSON.stringify(row.product_id);first=false;}}
 yield '],"nutrition":[';cursor='';first=true;
 while(true){const rows=(await client.query('SELECT key,data,updated_at FROM user_nutrition WHERE user_id=$1 AND key>$2 ORDER BY key LIMIT 20',[userId,cursor])).rows;if(!rows.length)break;for(const row of rows){cursor=row.key;yield(first?'':',')+JSON.stringify({key:row.key,data:row.data,updatedAt:row.updated_at});first=false;}}
 yield ']}';
}
export function createAccountDataRouter(database,limits) {
 const router=Router();router.use(requireAccount(database,false,true));
 router.post('/export',limits.accountData,async(req,res)=>{
  if(!exportSchema.safeParse(req.body).success)return fail(res,400,'INVALID_INPUT','Güncel parolanı gir.');
  const result=await reauthenticate(database,req,res,async(client,account)=>{
   const capability=randomBytes(32).toString('base64url');
   await client.query("INSERT INTO account_export_grants(session_id,user_id,capability_hash,expires_at) VALUES ($1,$2,$3,NOW()+INTERVAL '2 minutes') ON CONFLICT(session_id) DO UPDATE SET expires_at=EXCLUDED.expires_at,capability_hash=EXCLUDED.capability_hash",[account.sessionId,account.userId,hash(capability)]);return{capability,downloadUrl:'/api/v1/account/export?account='+encodeURIComponent(account.userId)};
  });
  if(!res.headersSent){res.cookie(exportCookie,result.capability,{httpOnly:true,secure:env.NODE_ENV==='production',sameSite:'strict',path:'/api/v1/account/export',maxAge:120000});res.json({downloadUrl:result.downloadUrl});}
 });
 router.head('/export',limits.exportDownload,(_req,res)=>fail(res,405,'METHOD_NOT_ALLOWED','İndirmeyi Hesabım ekranından başlat.'));
 router.get('/export',limits.exportDownload,async(req,res)=>{
  if(req.get('sec-fetch-site')==='cross-site')return fail(res,403,'CROSS_SITE','İndirmeyi Hesabım ekranından başlat.');
  const capability=exportCapability(req);if(!capability)return fail(res,403,'EXPORT_REAUTH_REQUIRED','İndirme izni yok veya süresi doldu. Parolanla yeniden dışa aktarma iste.');
  if(activeExports>=2)return fail(res,503,'EXPORT_BUSY','Dışa aktarma şu anda meşgul. Kısa süre sonra yeniden dene.');
  activeExports+=1;let client;let transaction=false;
  try{
   client=await database.connect();
   const grant=await client.query('DELETE FROM account_export_grants WHERE user_id=$1 AND expires_at>NOW() AND capability_hash=$3 AND session_id IN (SELECT id FROM user_sessions WHERE token_hash=$2 AND user_id=$1) RETURNING session_id',[res.locals.userId,sessionTokenHash(req),hash(capability)]);
   if(!grant.rowCount)return fail(res,403,'EXPORT_REAUTH_REQUIRED','İndirme izni yok veya süresi doldu. Parolanla yeniden dışa aktarma iste.');
   await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');transaction=true;
   const session=await client.query("SELECT id FROM user_sessions WHERE user_id=$1 AND token_hash=$2 AND expires_at>NOW() AND last_seen_at>NOW()-INTERVAL '30 minutes'",[res.locals.userId,sessionTokenHash(req)]);
   if(!session.rowCount){await client.query('ROLLBACK');transaction=false;return denied(res);}
   const row=(await client.query('SELECT id,display_name,email,role,email_verified_at,email_verification_source,created_at,updated_at,last_login_at FROM users WHERE id=$1',[res.locals.userId])).rows[0];
   if(!row){await client.query('ROLLBACK');transaction=false;return denied(res);}
   const user=publicUser(row),account={id:user.id,name:user.name,email:user.email,emailVerified:user.emailVerified,createdAt:row.created_at,updatedAt:row.updated_at,lastLoginAt:row.last_login_at};
   res.set({'Content-Type':'application/gzip','Content-Disposition':'attachment; filename="fitizbaby-account-'+new Date().toISOString().slice(0,10)+'.json.gz"','Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff'});
   await pipeline(Readable.from(exportJson(client,res.locals.userId,account),{objectMode:false,highWaterMark:65536}),createGzip(),res);
   await client.query('COMMIT');transaction=false;
  }catch(error){if(transaction)await client.query('ROLLBACK').catch(()=>{});if(!res.headersSent)throw error;res.destroy();}
  finally{client?.release();activeExports-=1;}
 });
 router.delete('/',limits.accountData,async(req,res)=>{
  if(!deleteSchema.safeParse(req.body).success)return fail(res,400,'CONFIRMATION_REQUIRED','Güncel parola ve HESABIMI SIL onayı gerekli.');
  const result=await reauthenticate(database,req,res,async(client,account)=>{await client.query('DELETE FROM users WHERE id=$1',[account.userId]);return account;});
  if(res.headersSent)return;
  const cleaned=await removeLocalAccountMail(result.email).catch(()=>false);
  res.json({deleted:true,warnings:cleaned?[]:['LOCAL_DEMO_CLEANUP_INCOMPLETE']});
 });
 return router;
}
