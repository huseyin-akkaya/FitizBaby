import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {dateSchema} from './schema.js';
import {sessionTokenHash} from '../routes/auth.js';
import {buildRhythmFromDays,shiftRhythmDay,rhythmBadges} from '../../src/utils/weeklyRhythm.js';
const bodySchema=z.object({day:dateSchema}).strict();
const fail=(res,status,code,message)=>res.status(status).json({error:{code,message}});
export async function refreshWeeklyRhythm(database,req,res){
 const parsed=bodySchema.safeParse(req.body),utcToday=new Date().toISOString().slice(0,10);
 // Accept the browser's local day only within the world's current date window.
 if(Object.keys(req.query).length||!parsed.success||parsed.data.day<shiftRhythmDay(utcToday,-1)||parsed.data.day>shiftRhythmDay(utcToday,1))return fail(res,400,'INVALID_RHYTHM','Gün bilgisini kontrol et; sayfayı yenileyip tekrar dene.');
 const client=await database.connect(),userId=res.locals.userId;
 try{
  await client.query('BEGIN');
  // Serialize with day writes and account security changes, then recheck the session.
  await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
  const active=await client.query("SELECT id FROM user_sessions WHERE user_id=$1 AND token_hash=$2 AND expires_at>NOW() AND last_seen_at>NOW()-INTERVAL '30 minutes' FOR SHARE",[userId,sessionTokenHash(req)]);
  if(!active.rowCount){await client.query('ROLLBACK');return fail(res,401,'UNAUTHORIZED','Oturumun kapandı. Yeniden giriş yap.');}
  // Return dates only. Nutrition snapshots and product names never leave PostgreSQL.
  const records=await client.query(`SELECT key FROM user_nutrition n
   WHERE user_id=$1 AND key >= 'day:' AND key <= $2 AND EXISTS (
    SELECT 1 FROM jsonb_each(n.data) AS meal(slot,entries)
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(meal.entries)='array' THEN meal.entries ELSE '[]'::jsonb END) AS item(value)
    WHERE meal.slot IN ('breakfast','lunch','dinner','snacks') AND
    CASE WHEN item.value->>'mode'='package' THEN
     NULLIF(item.value->>'packageSize','')::numeric>0 AND NULLIF(item.value->>'packageCount','')::numeric>0
    ELSE NULLIF(item.value->>'amount','')::numeric>0 END
   ) ORDER BY key LIMIT 3660`,[userId,'day:'+parsed.data.day]);
  const existing=await client.query("SELECT data FROM user_nutrition WHERE user_id=$1 AND key='rhythm' FOR UPDATE",[userId]);
  const summary=buildRhythmFromDays(records.rows.map(row=>row.key.slice(4)),parsed.data.day),unlocked=existing.rows[0]?.data?.unlocked||[],ids=new Set(unlocked.map(item=>item.id)),newlyUnlocked=[];
  for(const badge of rhythmBadges){
   if(ids.has(badge.id)||!summary.eligible[badge.id])continue;
   unlocked.push({id:badge.id,earnedAt:new Date().toISOString(),achievedOn:summary.eligible[badge.id]});newlyUnlocked.push(badge.id);ids.add(badge.id);
  }
  if(newlyUnlocked.length){
   const data=JSON.stringify({version:1,unlocked});
   if(existing.rowCount)await client.query("UPDATE user_nutrition SET data=$2,revision=$3,updated_at=NOW() WHERE user_id=$1 AND key='rhythm'",[userId,data,randomUUID()]);
   else await client.query("INSERT INTO user_nutrition (user_id,key,data) VALUES ($1,'rhythm',$2)",[userId,data]);
  }
  await client.query('COMMIT');
  const {eligible,...rhythm}=summary;void eligible;
  res.json({userId,rhythm:{...rhythm,unlocked,newlyUnlocked}});
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
