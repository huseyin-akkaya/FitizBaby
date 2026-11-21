import { rateLimit } from 'express-rate-limit';
import { allowedOrigins, env } from '../config.js';

export function requireAllowedOrigin(req, res, next) {
  if (env.NODE_ENV === 'production' && !req.secure) return res.status(400).json({ error: { code: 'HTTPS_REQUIRED', message: 'Güvenli bağlantı gerekli.' } });
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!allowedOrigins.has(req.get('origin')) || req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Bu site kaynağından işlem yapılamaz.' } });
  if (!req.is('application/json')) return res.status(415).json({ error: { code: 'JSON_REQUIRED', message: 'İstek JSON biçiminde olmalı.' } });
  next();
}
export function createLimits() {
  const options = { windowMs: 15 * 60 * 1000, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Çok fazla deneme yapıldı. Bir süre sonra yeniden dene.' } } };
  return { accountData:rateLimit({...options,limit:5}),exportDownload:rateLimit({...options,limit:10}),recoveryAsk:rateLimit({...options,limit:10}),recoveryConsume:rateLimit({...options,limit:30}),api: rateLimit({ ...options, limit: 300 }), auth: rateLimit({ ...options, limit: 10 }) };
}
let hashing = 0;
export async function passwordWork(action) {
  if (hashing >= 4) { const error = new Error('Busy'); error.status = 503; throw error; }
  hashing += 1;
  try { return await action(); } finally { hashing -= 1; }
}
