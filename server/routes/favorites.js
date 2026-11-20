import { Router } from 'express';
import { z } from 'zod';
import { requireAccount } from '../middleware/account.js';
import { products } from '../../src/data/products.js';

const catalogIds = new Set(products.map(product => String(product.id)));
const productId = z.string().max(64).refine(value => catalogIds.has(value) || /^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
const changeSchema = z.object({ productId, favorite: z.boolean() }).strict();
const importSchema = z.object({ productIds: z.array(productId).max(1000) }).strict();
const badInput = res => res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Geçerli ürün kimlikleri gönder; en fazla 1000 favori saklanabilir.' } });
const read = async (client, userId) => (await client.query('SELECT product_id FROM user_favorites WHERE user_id = $1 ORDER BY product_id', [userId])).rows.map(row => row.product_id);

export function createFavoritesRouter(database) {
  const router = Router();
  router.use(requireAccount(database));
  router.get('/', async (_req, res) => res.json({ userId: res.locals.userId, productIds: await read(database, res.locals.userId) }));
  async function mutate(req, res, importing) {
    const parsed = (importing ? importSchema : changeSchema).safeParse(req.body);
    if (!parsed.success) return badInput(res);
    const userId = res.locals.userId;
    const input = parsed.data;
    const additions = [...new Set(importing ? input.productIds : input.favorite ? [input.productId] : [])];
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      // Serialize the limit check and imports for the same account.
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (!importing && input.favorite && input.productId.startsWith('custom-')) {
        const owned = await client.query('SELECT id FROM user_products WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL', [userId, input.productId]);
        if (!owned.rowCount) { await client.query('ROLLBACK'); return badInput(res); }
      }
      const existing = await read(client, userId);
      if (new Set([...existing, ...additions]).size > 1000) {
        await client.query('ROLLBACK');
        return badInput(res);
      }
      if (additions.length) await client.query('INSERT INTO user_favorites (user_id, product_id) SELECT $1, value FROM unnest($2::text[]) AS value ON CONFLICT DO NOTHING', [userId, additions]);
      if (!importing && !input.favorite) await client.query('DELETE FROM user_favorites WHERE user_id = $1 AND product_id = $2', [userId, input.productId]);
      const productIds = await read(client, userId);
      await client.query('COMMIT');
      return res.json({ userId, productIds });
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  }
  router.post('/', (req, res) => mutate(req, res, false));
  router.post('/import', (req, res) => mutate(req, res, true));
  return router;
}
