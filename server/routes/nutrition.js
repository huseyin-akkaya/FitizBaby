import {sessionTokenHash} from './auth.js';
import {copyDay} from '../nutrition/copy-day.js';
import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import { z } from 'zod';
import { requireAccount } from '../middleware/account.js';
import { keySchema, dateSchema, getSchema, snapshotSchema } from '../nutrition/schema.js';
import { products } from '../../src/data/products.js';

const bodySchema = z.object({ revision: z.uuid().nullable(), data: z.unknown(), refresh: z.object({ entryId:z.uuid(), preview:snapshotSchema }).strict().optional() }).strict();
const importSchema = z.object({ data: z.unknown() }).strict();
const meals = ['breakfast','lunch','dinner','snacks'];
const fail = (res,status,code,message) => res.status(status).json({ error: { code,message } });
const invalid = res => fail(res,400,'INVALID_NUTRITION','Kayıt alanlarını kontrol et. Gün başına en fazla 100 öğün ürünü saklanabilir.');
const document = (key,row) => ({ key, data: row?.data ?? null, revision: row?.revision ?? null });
async function freezeEntries(client,userId,data,previous,importing,refresh) {
  const prior = new Map(Object.values(previous || {}).flat().filter(item => item?.id).map(item => [item.id,item]));
  const ids = new Set();
  for (const meal of meals) {
    for (const entry of data[meal]) {
      if (!entry.id) entry.id = randomUUID();
      if (ids.has(entry.id)) throw new Error('INVALID_ENTRY');
      ids.add(entry.id);
      const old = prior.get(entry.id);
      if (old && old.id !== refresh?.entryId) {
        if (String(old.productId) !== String(entry.productId)) throw new Error('INVALID_ENTRY');
        entry.snapshot = old.snapshot ?? null;
        continue;
      }
      if (importing && entry.snapshot) { entry.snapshot = { ...entry.snapshot, id: entry.productId, source: 'browser-import' }; continue; }
      if (refresh?.entryId === entry.id && (!old || String(old.productId)!==String(entry.productId))) throw new Error('INVALID_ENTRY');
      let product = products.find(item => String(item.id) === String(entry.productId));
      if (!product && String(entry.productId).startsWith('custom-')) {
        const result = await client.query('SELECT data FROM user_products WHERE user_id=$1 AND id=$2 AND deleted_at IS NULL FOR SHARE', [userId,entry.productId]);
        if (result.rowCount) product = { ...result.rows[0].data, id: entry.productId };
      }
      if (!product) {
        if (!importing) throw new Error('PRODUCT_MISSING');
        entry.snapshot = null; continue;
      }
      if(refresh?.entryId===entry.id){const fields=['id','name','brand','serving','calories','protein','carbs','fat'];if(fields.some(key=>String(product[key]??null)!==String(refresh.preview[key]??null)))throw new Error('LABEL_CHANGED');}
      entry.snapshot = { id: product.id, name: product.name, brand: product.brand, serving: product.serving, calories: product.calories ?? null, protein: product.protein ?? null, carbs: product.carbs ?? null, fat: product.fat ?? null, capturedAt: new Date().toISOString(), source: importing ? 'catalog-at-import' : 'catalog-at-entry' };
    }
  }
  return data;
}
export function createNutritionRouter(database) {
  const router = Router();
  router.use(requireAccount(database));
  router.use(express.json({ limit: '256kb', strict: true }));
  router.post('/copy-day',(req,res)=>copyDay(database,req,res));
  router.get('/',async (req,res) => {
    if (!dateSchema.safeParse(req.query.day).success) return invalid(res);
    const keys = ['profile','plan','targets','day:' + req.query.day];
    const result = await database.query('SELECT key,data,revision FROM user_nutrition WHERE user_id=$1 AND key=ANY($2::text[])',[res.locals.userId,keys]);
    const index = await database.query("SELECT key FROM user_nutrition WHERE user_id=$1 AND key LIKE 'day:%' ORDER BY key DESC",[res.locals.userId]);
    res.json({ userId:res.locals.userId, documents:keys.map(key => document(key,result.rows.find(row => row.key === key))), days:index.rows.map(row => row.key.slice(4)) });
  });
  router.get('/:key',async (req,res) => {
    if (!keySchema.safeParse(req.params.key).success) return invalid(res);
    const result = await database.query('SELECT data,revision FROM user_nutrition WHERE user_id=$1 AND key=$2',[res.locals.userId,req.params.key]);
    res.json({ userId:res.locals.userId, document:document(req.params.key,result.rows[0]) });
  });
  async function save(req,res,importing) {
    const key = req.params.key;
    if (!keySchema.safeParse(key).success) return invalid(res);
    const body = (importing ? importSchema : bodySchema).safeParse(req.body);
    if (!body.success) return invalid(res);
    const parsed = getSchema(key).safeParse(body.data.data);
    if (!parsed.success) return invalid(res);
    const client = await database.connect();
    const userId = res.locals.userId;
    try {
      await client.query('BEGIN');
      // Same lock order as products: snapshots and product changes are serialized.
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
      const active=await client.query("SELECT id FROM user_sessions WHERE user_id=$1 AND token_hash=$2 AND expires_at>NOW() AND last_seen_at>NOW()-INTERVAL '30 minutes' FOR SHARE",[userId,sessionTokenHash(req)]);
      if(!active.rowCount){await client.query('ROLLBACK');return fail(res,401,'UNAUTHORIZED','Oturumun kapandı. Yeniden giriş yap.');}
      const existing = await client.query('SELECT data,revision FROM user_nutrition WHERE user_id=$1 AND key=$2 FOR UPDATE',[userId,key]);
      const old = existing.rows[0];
      if (importing && old) { await client.query('ROLLBACK'); return res.json({ userId, imported:false, document:document(key,old) }); }
      if (!importing && (old?.revision ?? null) !== body.data.revision) { await client.query('ROLLBACK'); return fail(res,409,'EDIT_CONFLICT','Bu kayıt başka bir sekmede değişti. Taslağın korundu. Yeni kaydı yüklemeden önce değişikliklerini kontrol et.'); }
      if (!old && key.startsWith('day:')) {
        const count = await client.query("SELECT COUNT(*)::int AS count FROM user_nutrition WHERE user_id=$1 AND key LIKE 'day:%'",[userId]);
        if (count.rows[0].count >= 3660) { await client.query('ROLLBACK'); return fail(res,409,'DAY_LIMIT','Hesap başına 3660 günlük kayıt sınırı var.'); }
      }
      const refresh=body.data.refresh;
      if(refresh&&(!key.startsWith('day:')||!Object.values(old?.data??{}).flat().some(entry=>entry.id===refresh.entryId)||!Object.values(parsed.data).flat().some(entry=>entry.id===refresh.entryId))){await client.query('ROLLBACK');return invalid(res);}
      let data = parsed.data;
      if (key.startsWith('day:')) data = await freezeEntries(client,userId,data,old?.data,importing,refresh);
      if (Buffer.byteLength(JSON.stringify(data),'utf8') > 140000) { await client.query('ROLLBACK'); return invalid(res); }
      const result = old
        ? await client.query('UPDATE user_nutrition SET data=$3,revision=$4,updated_at=NOW() WHERE user_id=$1 AND key=$2 RETURNING data,revision',[userId,key,JSON.stringify(data),randomUUID()])
        : await client.query('INSERT INTO user_nutrition (user_id,key,data) VALUES ($1,$2,$3) RETURNING data,revision',[userId,key,JSON.stringify(data)]);
      await client.query('COMMIT');
      res.json({ userId,imported:importing,document:document(key,result.rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if(error.message==='LABEL_CHANGED')return fail(res,409,'LABEL_CHANGED','Ürün bilgisi değişti. Sayfayı yenileyip yeni değerleri tekrar kontrol et.');
      if (['INVALID_ENTRY','PRODUCT_MISSING'].includes(error.message)) return fail(res,400,error.message,'Öğün ürünü bulunamadı veya kayıt kimliği geçersiz. Ürünü önce hesabına aktar; mevcut öğün taslağın korundu.');
      throw error;
    } finally { client.release(); }
  }
  router.put('/:key',(req,res) => save(req,res,false));
  router.post('/import/:key',(req,res) => save(req,res,true));
  return router;
}
