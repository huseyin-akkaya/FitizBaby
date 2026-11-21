import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { env } from './config.js';
import { pool } from './db/pool.js';
import { createRecoveryRouter } from './routes/recovery.js';
import {createAccountDataRouter} from './routes/account-data.js';
import { createAuthRouter } from './routes/auth.js';
import { createFavoritesRouter } from './routes/favorites.js';
import { createProductsRouter } from './routes/products.js';
import { createNutritionRouter } from './routes/nutrition.js';
import { createLimits, requireAllowedOrigin } from './middleware/security.js';

export function createApp(database = pool, { deliverLocalMail } = {}) {
  const app = express();
  const limits = createLimits();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.use(helmet());
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); res.locals.requestId = randomUUID(); next(); });
  app.use('/api', limits.api, requireAllowedOrigin);
  app.use('/api/v1/products', createProductsRouter(database));
  app.use('/api/v1/nutrition', createNutritionRouter(database));
  app.use('/api', express.json({ limit: '16kb', strict: true }));
  app.get('/api/health', async (_req, res) => {
    if (!database) return res.status(503).json({ status: 'degraded', database: 'not_configured' });
    try { await database.query('SELECT 1'); return res.json({ status: 'ok', database: 'connected' }); }
    catch { return res.status(503).json({ status: 'degraded', database: 'unavailable' }); }
  });
  app.use('/api/v1/account',createAccountDataRouter(database,limits));
  app.use('/api/v1/auth', createAuthRouter(database, limits.auth));
  app.use('/api/v1/auth', createRecoveryRouter(database, limits, deliverLocalMail));
  app.use('/api/v1/favorites', createFavoritesRouter(database));
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API adresi bulunamadı.' } }));
  app.use((error, _req, res, _next) => {
    void _next;
    const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : error.status === 503 ? 503 : 500;
    const message = { 413: 'İstek boyutu sınırı aşıldı.', 400: 'Geçerli JSON gönder.', 503: 'Hizmet şu anda meşgul. Yeniden dene.', 500: 'İşlem tamamlanamadı. Daha sonra yeniden dene.' }[status];
    if (status === 500) console.error('API isteği başarısız:', res.locals.requestId);
    return res.status(status).json({ error: { code: 'REQUEST_FAILED', message, requestId: res.locals.requestId } });
  });
  return app;
}
export default createApp();
