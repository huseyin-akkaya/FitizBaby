import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_HOST: z.enum(['127.0.0.1', '::1', '0.0.0.0']).default('127.0.0.1'),
  DATABASE_URL: z.string().min(1).optional(),
  MIGRATION_DATABASE_URL: z.string().min(1).optional(),
  FRONTEND_ORIGINS: z.string().default('http://localhost:8080,http://127.0.0.1:8080'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
});
const result = schema.safeParse(process.env);
if (!result.success) throw new Error('Backend ortam ayarları geçersiz; .env alanlarını kontrol et.');
export const env = result.data;
export const allowedOrigins = new Set(env.FRONTEND_ORIGINS.split(',').map(value => value.trim()).filter(Boolean));
for (const origin of allowedOrigins) {
  let parsed;
  try { parsed = new URL(origin); } catch { throw new Error('FRONTEND_ORIGINS geçerli site adresleri içermeli.'); }
  if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol) || (env.NODE_ENV === 'production' && parsed.protocol !== 'https:')) throw new Error('Site kaynağı ayarlarını kontrol et; üretimde HTTPS gerekli.');
}
if (!allowedOrigins.size || (env.NODE_ENV === 'production' && !env.DATABASE_URL)) throw new Error('Üretim için veritabanı ve izin verilen site ayarları gerekli.');
