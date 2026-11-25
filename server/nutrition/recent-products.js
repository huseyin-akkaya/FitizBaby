import {z} from 'zod';
import {dateSchema} from './schema.js';
import {products} from '../../src/data/products.js';
import {collectRecentProducts} from '../../src/utils/recentProducts.js';
import {shiftRhythmDay} from '../../src/utils/weeklyRhythm.js';
const querySchema=z.object({end:dateSchema}).strict();
export async function recentProducts(database,req,res){
 const parsed=querySchema.safeParse(req.query);
 if(!parsed.success)return res.status(400).json({error:{code:'INVALID_RECENT_PRODUCTS',message:'Son kayıtlar için geçerli bir bitiş tarihi seç.'}});
 const userId=res.locals.userId,end=parsed.data.end,start=shiftRhythmDay(end,-29);
 if(!dateSchema.safeParse(start).success)return res.status(400).json({error:{code:'INVALID_RECENT_PRODUCTS',message:'Bu tarih aralığı desteklenmiyor.'}});
 // At most 30 days x 100 entries. Read only portion metadata, never entire snapshots/images.
 const records=await database.query(`SELECT substring(n.key from 5) AS day,meal.slot AS meal,
  item.value->>'productId' AS "productId",item.value->>'mode' AS mode,item.value->>'amount' AS amount,
  item.value->>'packageSize' AS "packageSize",item.value->>'packageCount' AS "packageCount",
  item.value->'snapshot'->>'serving' AS serving
  FROM user_nutrition n CROSS JOIN LATERAL jsonb_each(n.data) AS meal(slot,entries)
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(meal.entries)='array' THEN meal.entries ELSE '[]'::jsonb END) WITH ORDINALITY AS item(value,position)
  WHERE n.user_id=$1 AND n.key >= $2 AND n.key <= $3 AND meal.slot IN ('breakfast','lunch','dinner','snacks')
  ORDER BY n.key DESC,CASE meal.slot WHEN 'snacks' THEN 4 WHEN 'dinner' THEN 3 WHEN 'lunch' THEN 2 ELSE 1 END DESC,item.position DESC LIMIT 3000`,[userId,'day:'+start,'day:'+end]);
 const owned=await database.query("SELECT id,data->>'serving' AS serving FROM user_products WHERE user_id=$1 AND deleted_at IS NULL ORDER BY id LIMIT 100",[userId]);
 res.json({userId,recent:{start,end,items:collectRecentProducts(records.rows,[...products,...owned.rows])}});
}
