import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {dateSchema,getSchema} from './schema.js';
import {sessionTokenHash} from '../routes/auth.js';
const mealKeys=['breakfast','lunch','dinner','snacks'];
const body=z.object({sourceDay:dateSchema,targetDay:dateSchema,sourceRevision:z.uuid(),revision:z.uuid().nullable(),meals:z.array(z.enum(mealKeys)).min(1).max(4).refine(items=>new Set(items).size===items.length)}).strict().refine(value=>{
 const next=new Date(value.sourceDay+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);return next.toISOString().slice(0,10)===value.targetDay;
});
const empty=()=>Object.fromEntries(mealKeys.map(key=>[key,[]]));
const fail=(res,status,code,message)=>res.status(status).json({error:{code,message}});
export async function copyDay(database,req,res){
 const parsed=body.safeParse(req.body);if(!parsed.success)return fail(res,400,'INVALID_COPY','Önceki gün, hedef gün ve kopyalanacak öğünleri kontrol et.');
 const input=parsed.data,userId=res.locals.userId,sourceKey='day:'+input.sourceDay,targetKey='day:'+input.targetDay;
 const client=await database.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
  const active=await client.query("SELECT id FROM user_sessions WHERE user_id=$1 AND token_hash=$2 AND expires_at>NOW() AND last_seen_at>NOW()-INTERVAL '30 minutes' FOR SHARE",[userId,sessionTokenHash(req)]);
  if(!active.rowCount){await client.query('ROLLBACK');return fail(res,401,'UNAUTHORIZED','Oturumun kapandı. Yeniden giriş yap.');}
  const rows=(await client.query('SELECT key,data,revision FROM user_nutrition WHERE user_id=$1 AND key=ANY($2::text[]) ORDER BY key FOR UPDATE',[userId,[sourceKey,targetKey]])).rows;
  const source=rows.find(row=>row.key===sourceKey),target=rows.find(row=>row.key===targetKey);
  if(!source){await client.query('ROLLBACK');return fail(res,404,'SOURCE_MISSING','Önceki gün için kaydedilmiş bir öğün bulunamadı.');}
  if(source.revision!==input.sourceRevision||(target?.revision??null)!==input.revision){await client.query('ROLLBACK');return fail(res,409,'EDIT_CONFLICT','Günlerden biri başka bir sekmede değişti. Kayıtları yenileyip kopyalamayı yeniden kontrol et.');}
  const sourceData=getSchema(sourceKey).safeParse(source.data),targetData=getSchema(targetKey).safeParse(target?.data??empty());
  if(!sourceData.success||!targetData.success){await client.query('ROLLBACK');return fail(res,409,'SOURCE_INVALID','Günlük kayıt biçimi kopyalamaya uygun değil. Günlük takip ekranında kontrol et.');}
  const next=targetData.data;let copied=0,skipped=0;
  for(const key of input.meals){const existing=new Set(next[key].map(entry=>String(entry.productId)));for(const original of sourceData.data[key]){
   if(existing.has(String(original.productId))){skipped++;continue;}
   // Nutrition comes only from the saved source row, never from the request or
   // today's mutable catalog. Unknown historical nutrition remains unknown.
   next[key].push({...structuredClone(original),id:randomUUID(),snapshot:original.snapshot??null});existing.add(String(original.productId));copied++;
  }}
  if(!getSchema(targetKey).safeParse(next).success||Buffer.byteLength(JSON.stringify(next))>140000){await client.query('ROLLBACK');return fail(res,400,'DAY_LIMIT','Kopyalama gün başına 100 ürün veya kayıt boyutu sınırını aşıyor. Hiçbir kayıt değiştirilmedi.');}
  if(!copied){await client.query('ROLLBACK');return res.json({userId,copied,skipped,document:{key:targetKey,data:target?.data??null,revision:target?.revision??null}});}
  if(!target){const count=await client.query("SELECT COUNT(*)::int AS count FROM user_nutrition WHERE user_id=$1 AND key LIKE 'day:%'",[userId]);if(count.rows[0].count>=3660){await client.query('ROLLBACK');return fail(res,409,'DAY_LIMIT','Hesap başına 3660 günlük kayıt sınırı var.');}}
  const result=target?await client.query('UPDATE user_nutrition SET data=$3,revision=$4,updated_at=NOW() WHERE user_id=$1 AND key=$2 RETURNING data,revision',[userId,targetKey,JSON.stringify(next),randomUUID()]):await client.query('INSERT INTO user_nutrition(user_id,key,data) VALUES($1,$2,$3) RETURNING data,revision',[userId,targetKey,JSON.stringify(next)]);
  await client.query('COMMIT');return res.json({userId,copied,skipped,document:{key:targetKey,...result.rows[0]}});
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
