import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import { z } from 'zod';
import { requireAccount } from '../middleware/account.js';
import { customId, productSchema, decodeImage } from '../products/validation.js';

const createSchema = z.object({ id: customId, product: productSchema }).strict();
const updateSchema = z.object({ revision: z.uuid(), product: productSchema }).strict();
const deleteSchema = z.object({ revision: z.uuid() }).strict();
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } });
const missing = res => fail(res, 404, 'NOT_FOUND', 'Ürün bulunamadı.');
const invalid = res => fail(res, 400, 'INVALID_PRODUCT', 'Ürün alanlarını ve besin değerlerini kontrol et. Görsel PNG/JPEG/WebP, en fazla 600 KB ve 16 milyon piksel olmalı.');
const columns = 'id, data, revision, (image IS NOT NULL) AS has_image';
function publicProduct(row, userId) {
  return { ...row.data, id: row.id, revision: row.revision, image: row.has_image ? '/api/v1/products/' + row.id + '/image?account=' + encodeURIComponent(userId) + '&v=' + row.revision : '' };
}
export function createProductsRouter(database) {
  const router = Router();
  router.use(requireAccount(database, true));
  // Authenticate before allocating the larger, upload-only JSON body.
  router.use(express.json({ limit: '900kb', strict: true }));
  router.get('/', async (_req, res) => {
    const userId = res.locals.userId;
    const result = await database.query('SELECT ' + columns + ' FROM user_products WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at, id', [userId]);
    res.json({ userId, products: result.rows.map(row => publicProduct(row, userId)) });
  });
  router.get('/:id/image', async (req, res) => {
    if (!customId.safeParse(req.params.id).success) return missing(res);
    const result = await database.query('SELECT image FROM user_products WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL', [res.locals.userId, req.params.id]);
    if (!result.rows[0]?.image) return missing(res);
    res.type('image/webp').set('Content-Disposition', 'inline').send(result.rows[0].image);
  });
  router.get('/:id', async (req, res) => {
    if (!customId.safeParse(req.params.id).success) return missing(res);
    const result = await database.query('SELECT ' + columns + ' FROM user_products WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL', [res.locals.userId, req.params.id]);
    if (!result.rowCount) return missing(res);
    res.json({ userId: res.locals.userId, product: publicProduct(result.rows[0], res.locals.userId) });
  });
  async function create(req, res, importing) {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res);
    const userId = res.locals.userId;
    const { id, product } = parsed.data;
    // Repeated import never overwrites a newer edit or resurrects a deletion.
    const existing = await database.query('SELECT deleted_at FROM user_products WHERE user_id = $1 AND id = $2', [userId, id]);
    if (existing.rowCount) return importing ? res.json({ userId, imported: false, id }) : fail(res, 409, 'PRODUCT_EXISTS', 'Bu ürün kimliği daha önce kullanıldı. Sayfayı yenile.');
    let image;
    try { image = await decodeImage(product.image); } catch (error) { if (error.status === 503) throw error; return invalid(res); }
    const data = { ...product }; delete data.image;
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const prior = await client.query('SELECT id FROM user_products WHERE user_id = $1 AND id = $2', [userId, id]);
      if (prior.rowCount) { await client.query('ROLLBACK'); return importing ? res.json({ userId, imported: false, id }) : fail(res, 409, 'PRODUCT_EXISTS', 'Bu ürün kimliği daha önce kullanıldı.'); }
      const count = await client.query('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS active FROM user_products WHERE user_id = $1', [userId]);
      if (count.rows[0].active >= 100 || count.rows[0].total >= 500) { await client.query('ROLLBACK'); return fail(res, 409, 'PRODUCT_LIMIT', 'Hesap başına 100 etkin ürün ve geçmişle birlikte 500 ürün sınırı var.'); }
      const result = await client.query('INSERT INTO user_products (user_id, id, data, image) VALUES ($1, $2, $3, $4) RETURNING ' + columns, [userId, id, JSON.stringify(data), image]);
      await client.query('COMMIT');
      return res.status(201).json({ userId, imported: true, product: publicProduct(result.rows[0], userId) });
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
  router.post('/', (req, res) => create(req, res, false));
  router.post('/import', (req, res) => create(req, res, true));
  router.put('/:id', async (req, res) => {
    if (!customId.safeParse(req.params.id).success) return missing(res);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res);
    const userId = res.locals.userId;
    const { revision, product } = parsed.data;
    const owned = await database.query('SELECT revision FROM user_products WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL', [userId, req.params.id]);
    if (!owned.rowCount) return missing(res);
    if (owned.rows[0].revision !== revision) return fail(res, 409, 'EDIT_CONFLICT', 'Ürün başka bir sekmede değişti. Sayfayı yenileyip yeniden düzenle.');
    let image;
    try { image = product.image === null ? null : await decodeImage(product.image); } catch (error) { if (error.status === 503) throw error; return invalid(res); }
    const data = { ...product }; delete data.image;
    const result = await database.query('UPDATE user_products SET data = $3, image = CASE WHEN $4::boolean THEN image ELSE $5 END, revision = $6, updated_at = NOW() WHERE user_id = $1 AND id = $2 AND revision = $7 AND deleted_at IS NULL RETURNING ' + columns, [userId, req.params.id, JSON.stringify(data), product.image === null, image, randomUUID(), revision]);
    if (!result.rowCount) return fail(res, 409, 'EDIT_CONFLICT', 'Ürün değişti veya silindi. Sayfayı yenile.');
    res.json({ userId, product: publicProduct(result.rows[0], userId) });
  });
  router.delete('/:id', async (req, res) => {
    if (!customId.safeParse(req.params.id).success) return missing(res);
    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res);
    const userId = res.locals.userId;
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const owned = await client.query('SELECT revision FROM user_products WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL FOR UPDATE', [userId, req.params.id]);
      if (!owned.rowCount) { await client.query('ROLLBACK'); return missing(res); }
      if (owned.rows[0].revision !== parsed.data.revision) { await client.query('ROLLBACK'); return fail(res, 409, 'EDIT_CONFLICT', 'Ürün başka bir sekmede değişti. Sayfayı yenile.'); }
      await client.query("UPDATE user_products SET deleted_at = NOW(), updated_at = NOW(), revision = $3, data = '{}'::jsonb, image = NULL WHERE user_id = $1 AND id = $2", [userId, req.params.id, randomUUID()]);
      await client.query('DELETE FROM user_favorites WHERE user_id = $1 AND product_id = $2', [userId, req.params.id]);
      await client.query('COMMIT');
      res.json({ userId, deleted: true, id: req.params.id });
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  });
  return router;
}
