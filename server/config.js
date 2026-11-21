import {resolve,relative,isAbsolute,sep} from 'node:path';
import dotenv from 'dotenv';
import {readFileSync,lstatSync} from 'node:fs';
const initialEnvironment={...process.env};
const baseEnvironment=dotenv.config({quiet:true}).parsed||{};
let mailEnvironment={};
if((initialEnvironment.NODE_ENV||baseEnvironment.NODE_ENV)!=='test'){
 try{const file=resolve('.env.mail');const info=lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||info.size>16384)throw new Error('INVALID_MAIL_FILE');const parsed=dotenv.parse(readFileSync(file));for(const key of ['MAIL_MODE','RESEND_API_KEY','RESEND_TEST_RECIPIENT','MAIL_OUTBOX_KEY','MAIL_DAILY_LIMIT','MAIL_MONTHLY_LIMIT'])if(parsed[key]!==undefined)mailEnvironment[key]=parsed[key];}
 catch(error){if(error.code!=='ENOENT')throw new Error('Özel e-posta ayar dosyası okunamadı.',{cause:error});}
}
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_HOST: z.enum(['127.0.0.1', '::1', '0.0.0.0']).default('127.0.0.1'),
  DATABASE_URL: z.string().min(1).optional(),
  MIGRATION_DATABASE_URL: z.string().min(1).optional(),
  FRONTEND_ORIGINS: z.string().default('http://localhost:8080,http://127.0.0.1:8080'),
  MAIL_MODE: z.enum(['disabled','local','resend']).default(process.env.NODE_ENV === 'production' ? 'disabled' : 'local'),
  APP_PUBLIC_URL: z.string().default('http://localhost:8080'),
  RESEND_API_KEY:z.string().regex(/^re_[A-Za-z0-9_-]{8,200}$/).optional(),
  RESEND_TEST_RECIPIENT:z.string().trim().toLowerCase().pipe(z.email().max(254)).optional(),
  MAIL_OUTBOX_KEY:z.string().optional(),
  MAIL_DAILY_LIMIT:z.coerce.number().int().min(1).max(50).default(50),
  MAIL_MONTHLY_LIMIT:z.coerce.number().int().min(1).max(1000).default(1000),
  LOCAL_MAIL_DIR: z.string().min(1).optional(),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
});
const result = schema.safeParse({...baseEnvironment,...mailEnvironment,...initialEnvironment});
if (!result.success) throw new Error('Backend ortam ayarları geçersiz; .env alanlarını kontrol et.');
export const env = result.data;
export const allowedOrigins = new Set(env.FRONTEND_ORIGINS.split(',').map(value => value.trim()).filter(Boolean));
for (const origin of allowedOrigins) {
  let parsed;
  try { parsed = new URL(origin); } catch { throw new Error('FRONTEND_ORIGINS geçerli site adresleri içermeli.'); }
  if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol) || (env.NODE_ENV === 'production' && parsed.protocol !== 'https:')) throw new Error('Site kaynağı ayarlarını kontrol et; üretimde HTTPS gerekli.');
}
if (!allowedOrigins.size || (env.NODE_ENV === 'production' && !env.DATABASE_URL)) throw new Error('Üretim için veritabanı ve izin verilen site ayarları gerekli.');

if (!allowedOrigins.has(env.APP_PUBLIC_URL)) throw new Error('APP_PUBLIC_URL izin verilen site kaynaklarından biri olmalı.');
if (env.MAIL_MODE === 'local' && (env.NODE_ENV === 'production' || !['127.0.0.1','::1'].includes(env.API_HOST))) throw new Error('Yerel e-posta yalnızca geliştirme/test ve loopback sunucusunda kullanılabilir.');

if(env.MAIL_MODE==='local') {
  if(!['localhost','127.0.0.1','[::1]'].includes(new URL(env.APP_PUBLIC_URL).hostname))throw new Error('Yerel deneme bağlantısı yalnızca bu bilgisayara yönlenebilir.');
  const directory=resolve(env.LOCAL_MAIL_DIR||'.local-mail');const inside=relative(process.cwd(),directory);
  if((inside===''||inside!=='..'&&!inside.startsWith('..'+sep)&&!isAbsolute(inside))&&directory!==resolve('.local-mail'))throw new Error('Yerel kutu proje içinde yalnızca korumalı .local-mail klasörü olabilir.');
}

if(env.MAIL_MODE==='resend') {
 const key=Buffer.from(env.MAIL_OUTBOX_KEY||'','base64');
 if(!env.RESEND_API_KEY||!env.RESEND_TEST_RECIPIENT||key.length!==32||key.toString('base64')!==env.MAIL_OUTBOX_KEY)throw new Error('Gerçek test gönderimi için özel e-posta ayarları eksik veya geçersiz.');
 if(env.NODE_ENV==='production'||!['127.0.0.1','::1'].includes(env.API_HOST)||!['localhost','127.0.0.1','[::1]'].includes(new URL(env.APP_PUBLIC_URL).hostname))throw new Error('Resend tek alıcılı test modu yalnızca yerel geliştirmede kullanılabilir.');
}
