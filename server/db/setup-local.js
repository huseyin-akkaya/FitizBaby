import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { access, open } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { databasePlan, provisionDatabase } from './provision.js';
import { migrate } from './migrate.js';

async function writePrivateFile(file, contents) {
  const handle = await open(file, 'wx', 0o600);
  try {
    if (process.platform === 'win32') {
      const identity = execFileSync('whoami', ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true });
      const sid = identity.match(/S-1-[0-9-]+/)?.[0];
      if (!sid) throw new Error('FILE_PERMISSIONS_FAILED');
      execFileSync('icacls', [file, '/inheritance:r', '/grant:r', '*' + sid + ':(F)', '*S-1-5-18:(F)', '*S-1-5-32-544:(F)'], { stdio: 'ignore', windowsHide: true });
    }
    await handle.writeFile(contents);
  } finally { await handle.close(); }
}

async function askPassword() {
  const sink = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const prompt = createInterface({ input: process.stdin, output: sink, terminal: true });
  process.stdout.write('PostgreSQL yönetici parolan (ekranda görünmez): ');
  try { return await prompt.question(''); } finally { prompt.close(); process.stdout.write('\n'); }
}
async function setup() {
  if (!process.stdin.isTTY) throw new Error('INTERACTIVE_REQUIRED');
  for (const file of ['.env', '.env.migration']) {
    try { await access(file); throw new Error('CONFIG_EXISTS'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  console.info('Bu kurulum yalnızca yeni fitizbaby_dev veritabanını ve iki sınırlı rolü oluşturur. Mevcut adlar varsa durur. Yönetici parolan kaydedilmez.');
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let user;
  try { user = (await prompt.question('PostgreSQL yönetici adı [postgres]: ')).trim() || 'postgres'; } finally { prompt.close(); }
  const adminPassword = await askPassword();
  const plan = databasePlan();
  await provisionDatabase({ host: plan.host, port: plan.port, database: 'postgres', user, password: adminPassword }, plan);
  // App credentials and schema-owner credentials are separate and both gitignored.
  await writePrivateFile('.env', 'NODE_ENV=development\nAPI_HOST=127.0.0.1\nAPI_PORT=3001\nFRONTEND_ORIGINS=http://localhost:8080,http://127.0.0.1:8080\nTRUST_PROXY=false\nDATABASE_URL=' + plan.appUrl + '\n');
  await writePrivateFile('.env.migration', 'MIGRATION_DATABASE_URL=' + plan.ownerUrl + '\n');
  await migrate(plan.ownerUrl, plan.app);
  console.info('Kurulum tamamlandı. Bir terminalde npm run dev:server, diğerinde npm run dev çalıştır. Site: http://localhost:8080');
}
setup().catch(error => {
  const messages = { CONFIG_EXISTS: 'Ayar dosyası zaten var; güvenlik için üzerine yazılmadı. Gerekirse npm run db:migrate çalıştır.', TARGET_EXISTS: 'Hedef veritabanı veya roller zaten var; mevcut kurulum değiştirilmedi.', INTERACTIVE_REQUIRED: 'Bu komutu kendi bilgisayarındaki etkileşimli terminalde çalıştır.' };
  console.error(messages[error.message] || 'Kurulum tamamlanamadı. PostgreSQL bağlantısı/yetkilerini kontrol et. Oluşan dosyaları koru; parolanı sohbet veya GitHub üzerinden paylaşma.');
  process.exitCode = 1;
});
