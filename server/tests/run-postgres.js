import { spawn, spawnSync } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
import { databasePlan, provisionDatabase } from '../db/provision.js';
import { migrate } from '../db/migrate.js';

const argument = name => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const bin = argument('--pg-bin') || process.env.PG_BIN;
if (!bin) { console.error('PostgreSQL bin dizinini belirt: npm run test:integration -- --pg-bin "POSTGRESQL_BIN_DIZINI"'); process.exit(1); }
const executable = name => join(resolve(bin), name + (process.platform === 'win32' ? '.exe' : ''));
const directory = await mkdtemp(join(tmpdir(), 'fitizbaby-test-'));
const data = join(directory, 'data');
await mkdir(data);
const secret = randomBytes(32).toString('hex');
const pwfile = join(directory, 'test-password');
await writeFile(pwfile, secret, { mode: 0o600 });
const freePort = () => new Promise((resolvePort, reject) => { const socket = net.createServer(); socket.once('error', reject); socket.listen(0, '127.0.0.1', () => { const chosen = socket.address().port; socket.close(() => resolvePort(chosen)); }); });
const port = await freePort();
function pgCommand(command, args) {
  const log = openSync(join(directory, 'commands.log'), 'a');
  let result; try { result = spawnSync(executable(command), args, { stdio: ['ignore', log, log], windowsHide: true, timeout: 60000 }); } finally { closeSync(log); }
  if (result.status !== 0) { console.error(command + ' başarısız:', result.error?.code || result.status); throw new Error('TEST_CLUSTER_FAILED'); }
}
function run(command, args, env = {}) {
  return new Promise((resolveChild, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: 'inherit', windowsHide: true });
    child.once('error', reject); child.once('exit', code => code === 0 ? resolveChild() : reject(new Error('TEST_FAILED')));
  });
}
let started = false;
const children = [];
try {
  pgCommand('initdb', ['-D', data, '-U', 'test_admin', '--pwfile', pwfile, '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--encoding=UTF8', '--no-locale']);
  pgCommand('pg_ctl', ['-D', data, '-w', '-l', join(directory, 'postgres.log'), '-o', '-h 127.0.0.1 -p ' + port, 'start']);
  started = true;
  const suffix = randomBytes(4).toString('hex');
  const plan = databasePlan({ port, database: 'fitizbaby_test_' + suffix, owner: 'test_owner_' + suffix, app: 'test_app_' + suffix });
  await provisionDatabase({ host: '127.0.0.1', port, database: 'postgres', user: 'test_admin', password: secret }, plan);
  await migrate(plan.ownerUrl, plan.app);
  await migrate(plan.ownerUrl, plan.app); // Repeat should safely skip applied migrations.
  const env = { MAIL_MODE:'local',LOCAL_MAIL_DIR:join(directory,'mail'),APP_PUBLIC_URL:'http://localhost:8080',NODE_ENV: 'test', DATABASE_URL: plan.appUrl, FITIZBABY_TEST_DATABASE_URL: plan.appUrl, FRONTEND_ORIGINS: 'http://localhost:8080,http://127.0.0.1:8080', API_HOST: '127.0.0.1', API_PORT: '3001', TRUST_PROXY: 'false' };
  if(process.argv.includes("--browser-only")){
    if(!argument("--browser-test"))throw new Error("BROWSER_TEST_REQUIRED");
  }else if(process.argv.includes("--backup-only")){
    await run(process.execPath,["--test","server/tests/backup.test.js"],{...env,FITIZBABY_TEST_OWNER_URL:plan.ownerUrl,FITIZBABY_TEST_PG_BIN:resolve(bin)});
  }else{
  await run(process.execPath, ['--test', '--test-concurrency=1', 'server/tests/auth.test.js', 'server/tests/products.test.js', 'server/tests/nutrition.test.js', 'server/tests/recovery.test.js', 'server/tests/account-data.test.js', 'server/tests/account-security.test.js', 'server/tests/today.test.js', 'server/tests/companion.test.js', 'server/tests/backup.test.js'], { ...env, FITIZBABY_TEST_OWNER_URL: plan.ownerUrl, FITIZBABY_TEST_PG_BIN: resolve(bin) });
  await run(process.execPath,['--test','server/tests/free-mail.test.js'],{...env,MAIL_MODE:'resend',RESEND_API_KEY:'re_test_fixture_not_a_real_key',RESEND_TEST_RECIPIENT:'provider-owner@example.test',MAIL_OUTBOX_KEY:randomBytes(32).toString('base64'),FITIZBABY_TEST_OWNER_URL:plan.ownerUrl});
  await run(process.execPath, ['--test', 'server/tests/production.test.js'], { ...env, NODE_ENV: 'production', MAIL_MODE:'disabled',APP_PUBLIC_URL:'https://localhost',FRONTEND_ORIGINS: 'https://localhost', TRUST_PROXY: 'true' });
  }
  const browserTest = argument('--browser-test');
  if (browserTest) {
    const apiPort = await freePort();
    const webPort = await freePort();
    const browserBase = 'http://127.0.0.1:' + webPort;
    const apiBase = 'http://127.0.0.1:' + apiPort;
    const browserEnv = { ...process.env, ...env, API_PORT: String(apiPort), APP_PUBLIC_URL:browserBase,FRONTEND_ORIGINS: browserBase, FITIZBABY_BROWSER_BASE: browserBase, FITIZBABY_TEST_WEB_PORT: String(webPort) };
    for (const script of ['server/index.js', 'server/tests/serve-browser.js']) children.push(spawn(process.execPath, [script], { env: browserEnv, stdio: 'inherit', windowsHide: true }));
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try { const results = await Promise.all([fetch(apiBase + '/api/health'), fetch(browserBase)]); if (results.every(response => response.ok)) { ready = true; break; } } catch { /* Servers are starting. */ }
      await new Promise(resolveDelay => setTimeout(resolveDelay, 250));
    }
    if (!ready || children.some(child => child.exitCode !== null)) throw new Error('TEST_SERVERS_NOT_READY');
    await run(process.execPath, [resolve(browserTest)], browserEnv);
  }
  console.info('Gerçek PostgreSQL testleri tamamlandı; kişisel veritabanı kullanılmadı.');
} catch (error) { console.error('Entegrasyon testi tamamlanamadı:', error.message); process.exitCode = 1; }
finally {
  for (const child of children) child.kill();
  if (children.length) await new Promise(resolveDelay => setTimeout(resolveDelay, 300));
  if (started) pgCommand('pg_ctl', ['-D', data, '-w', '-m', 'fast', 'stop']);
  console.info('Test klasörü (yalnızca test verileri): ' + directory);
}
