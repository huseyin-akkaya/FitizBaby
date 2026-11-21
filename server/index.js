import app from './app.js';
import {startMailWorker} from './mail/outbox.js';
import { env } from './config.js';
import { pool, assertRuntimeRole } from './db/pool.js';

if (pool) {
  try { await assertRuntimeRole(pool); }
  catch { console.error('API başlatılmadı: veritabanı bağlantısını ve sınırlı kullanıcı yetkilerini kontrol et.'); await pool.end(); process.exit(1); }
}
const server = app.listen(env.API_PORT, env.API_HOST, () => console.info('FitizBaby API hazır: ' + env.API_HOST + ':' + env.API_PORT));
server.on('error', () => { console.error('API portu kullanılamıyor.'); process.exitCode = 1; pool?.end(); });
const stopMailWorker=startMailWorker(pool);
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  stopMailWorker();
  server.close(async () => { await pool?.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
