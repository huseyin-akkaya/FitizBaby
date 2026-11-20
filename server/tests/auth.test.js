import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createApp } from '../app.js';
import { migrationChecksums } from '../db/migration-checksums.js';
import { createPool, assertRuntimeRole, pool } from '../db/pool.js';

const origin = 'http://localhost:8080';
const integration = Boolean(process.env.FITIZBABY_TEST_DATABASE_URL);
const database = integration ? createPool(process.env.FITIZBABY_TEST_DATABASE_URL) : null;
const owner = integration ? createPool(process.env.FITIZBABY_TEST_OWNER_URL) : null;
const password = 'Only-a-generated-test-password-2026!';
let counter = 0;
const newUser = () => ({ name: 'Test Kullanıcısı', email: 'test' + (++counter) + '@example.test', password });
async function withApi(target, action) {
  const server = createApp(target).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = async (path, { method = 'GET', data, cookie, headers = {}, raw } = {}) => fetch(base + '/api' + path, { method, headers: { ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: raw ?? (data === undefined ? undefined : JSON.stringify(data)) });
  try { await action(request); } finally { await new Promise(resolve => server.close(resolve)); }
}
const cookieFrom = response => response.headers.get('set-cookie').split(';')[0];
const register = (request, user = newUser()) => request('/v1/auth/register', { method: 'POST', data: user });

test('Migration checksums tolerate only LF/CRLF differences and reject content edits', () => {
  const lf = 'CREATE TABLE sample (id INT);\n-- same SQL\n';
  const crlf = lf.replace(/\n/g, '\r\n');
  const hash = value => createHash('sha256').update(value).digest('hex');
  assert.deepEqual(migrationChecksums(lf), migrationChecksums(crlf));
  assert.ok(migrationChecksums(crlf).includes(hash(lf)));
  assert.ok(migrationChecksums(lf).includes(hash(crlf)));
  assert.ok(!migrationChecksums(lf.replace('INT', 'TEXT')).includes(hash(lf)));
  assert.ok(!migrationChecksums(lf + '-- changed').includes(hash(lf)));
});

test('Origin, content type, body limits and input schema reject invalid requests', async () => withApi(null, async request => {
  assert.equal((await request('/v1/auth/login', { method: 'POST', data: {}, headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await request('/v1/auth/login', { method: 'POST', data: {}, headers: { Origin: '' } })).status, 403);
  assert.equal((await request('/v1/auth/logout', { method: 'POST', data: {}, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await request('/v1/auth/login', { method: 'POST', raw: '{}', headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await request('/v1/auth/login', { method: 'POST', raw: '{invalid' })).status, 400);
  assert.equal((await request('/v1/auth/login', { method: 'POST', data: { password: 'x'.repeat(20000) } })).status, 413);
  assert.equal((await register(request, { ...newUser(), role: 'admin' })).status, 400);
  assert.equal((await register(request, { ...newUser(), password: 'short' })).status, 400);
}));
test('Database missing returns actionable 503; no caching or framework disclosure', async () => withApi(null, async request => {
  const response = await request('/health');
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await register(request)).status, 503);
  assert.equal((await request('/v1/auth/me')).status, 503);
}));
test('Authentication attempts are limited', async () => withApi(null, async request => {
  for (let i = 0; i < 10; i += 1) assert.equal((await request('/v1/auth/login', { method: 'POST', data: {} })).status, 400);
  assert.equal((await request('/v1/auth/login', { method: 'POST', data: {} })).status, 429);
}));
test('Internal errors do not expose database/password details', async () => withApi({ query() { throw new Error('password=DO_NOT_EXPOSE database=private'); } }, async request => {
  const response = await request('/v1/auth/me', { cookie: 'fitizbaby_session=' + 'A'.repeat(43) });
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.ok(!body.includes('DO_NOT_EXPOSE') && !body.includes('private'));
}));
test('Real PostgreSQL: runtime role has no DDL/admin privileges', { skip: !integration }, async () => {
  await assertRuntimeRole(database);
  const permission = await database.query("SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create, has_table_privilege(current_user, 'schema_migrations', 'UPDATE') AS can_migrate");
  assert.equal(permission.rows[0].can_create, false);
  assert.equal(permission.rows[0].can_migrate, false);
  const columns = await database.query("SELECT has_column_privilege(current_user, 'users', 'role', 'UPDATE') AS can_promote, has_column_privilege(current_user, 'user_sessions', 'expires_at', 'UPDATE') AS can_extend");
  assert.equal(columns.rows[0].can_promote, false); assert.equal(columns.rows[0].can_extend, false);
});
test('Real PostgreSQL: registration stores hashes; private account returns only authenticated user', { skip: !integration }, async () => withApi(database, async request => {
  assert.equal((await request('/v1/auth/account')).status, 401);
  const user = newUser();
  const response = await register(request, user);
  assert.equal(response.status, 201);
  const cookieHeader = response.headers.get('set-cookie');
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /SameSite=Lax/);
  const cookie = cookieFrom(response);
  const body = await response.json();
  assert.deepEqual(Object.keys(body.user).sort(), ['email', 'id', 'name', 'role']);
  assert.equal(body.user.role, 'member');
  assert.equal(body.user.email, user.email);
  const stored = await database.query('SELECT password_hash FROM users WHERE id = $1', [body.user.id]);
  assert.match(stored.rows[0].password_hash, /^\$argon2id\$/);
  assert.notEqual(stored.rows[0].password_hash, password);
  const token = cookie.split('=')[1];
  const sessions = await database.query('SELECT token_hash FROM user_sessions WHERE user_id = $1', [body.user.id]);
  assert.equal(sessions.rows[0].token_hash, createHash('sha256').update(token).digest('hex'));
  const account = await request('/v1/auth/account', { cookie });
  assert.equal(account.status, 200);
  assert.equal((await account.json()).user.id, body.user.id);
  const second = await register(request);
  assert.notEqual((await second.json()).user.id, body.user.id);
  assert.equal((await (await request('/v1/auth/me', { cookie })).json()).user.id, body.user.id);
}));
test('Real PostgreSQL: duplicate email, credential failures, rotation and logout', { skip: !integration }, async () => withApi(database, async request => {
  const user = newUser();
  const original = cookieFrom(await register(request, user));
  assert.equal((await register(request, { ...user, email: user.email.toUpperCase() })).status, 409);
  const wrong = await request('/v1/auth/login', { method: 'POST', data: { email: user.email, password: 'wrong-password' } });
  const absent = await request('/v1/auth/login', { method: 'POST', data: { email: 'absent@example.test', password: 'wrong-password' } });
  assert.equal(wrong.status, 401); assert.equal(absent.status, 401);
  assert.deepEqual(await wrong.json(), await absent.json());
  const login = await request('/v1/auth/login', { method: 'POST', cookie: original, data: { email: user.email, password } });
  assert.equal(login.status, 200);
  const rotated = cookieFrom(login);
  assert.notEqual(rotated, original);
  assert.equal((await (await request('/v1/auth/me', { cookie: original })).json()).user, null);
  assert.equal((await request('/v1/auth/logout', { method: 'POST', data: {}, cookie: rotated })).status, 204);
  assert.equal((await request('/v1/auth/account', { cookie: rotated })).status, 401);
}));
test('Real PostgreSQL: inactive, expired and malformed sessions are rejected', { skip: !integration }, async () => withApi(database, async request => {
  for (const assignment of ["last_seen_at = NOW() - INTERVAL '31 minutes'", "expires_at = NOW() - INTERVAL '1 second'"]) {
    const response = await register(request);
    const cookie = cookieFrom(response);
    const user = (await response.json()).user;
    await owner.query('UPDATE user_sessions SET ' + assignment + ' WHERE user_id = $1', [user.id]);
    assert.equal((await request('/v1/auth/account', { cookie })).status, 401);
  }
  assert.equal((await request('/v1/auth/account', { cookie: 'fitizbaby_session=invalid' })).status, 401);
}));
test('Real PostgreSQL: user input cannot become SQL or change privileges', { skip: !integration }, async () => withApi(database, async request => {
  const response = await register(request, { ...newUser(), name: "Robert'); DROP TABLE users; --" });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).user.role, 'member');
  assert.ok((await database.query('SELECT COUNT(*)::int AS count FROM users')).rows[0].count > 0);
}));

test('Real PostgreSQL: favorites are private, imports idempotent, stale accounts and untrusted owners rejected', { skip: !integration }, async () => withApi(database, async request => {
  assert.equal((await request('/v1/favorites')).status, 401);
  const first = await register(request);
  const firstCookie = cookieFrom(first);
  const firstId = (await first.json()).user.id;
  const second = await register(request);
  const secondCookie = cookieFrom(second);
  const secondId = (await second.json()).user.id;
  const options = { cookie: firstCookie, headers: { 'X-FitizBaby-Account': firstId } };
  const secondOptions = { cookie: secondCookie, headers: { 'X-FitizBaby-Account': secondId } };
  const get = async args => (await (await request('/v1/favorites', args)).json()).productIds;
  assert.deepEqual(await get(options), []);
  assert.equal((await request('/v1/favorites', { ...options, method: 'POST', data: { productId: '1', favorite: true, userId: secondId } })).status, 400);
  assert.equal((await request('/v1/favorites', { cookie: firstCookie })).status, 409);
  assert.equal((await request('/v1/favorites', { ...secondOptions, method: 'POST', headers: options.headers, data: { productId: '1', favorite: true } })).status, 409);
  assert.equal((await request('/v1/favorites', { ...options, method: 'POST', data: { productId: "1'); DROP TABLE users;--", favorite: true } })).status, 400);
  assert.equal((await request('/v1/favorites', { ...options, method: 'POST', data: { productId: '999999', favorite: true } })).status, 400);
  assert.equal((await request('/v1/favorites', { ...options, method: 'POST', data: { productId: '1', favorite: true } })).status, 200);
  assert.deepEqual(await get(options), ['1']);
  assert.deepEqual(await get(secondOptions), []);
  for (let i = 0; i < 2; i += 1) {
    const imported = await request('/v1/favorites/import', { ...options, method: 'POST', data: { productIds: ['1', '2', '2'] } });
    assert.equal(imported.status, 200);
    assert.deepEqual((await imported.json()).productIds, ['1', '2']);
  }
  const invalid = await request('/v1/favorites/import', { ...options, method: 'POST', data: { productIds: ['3', 'bad-id'] } });
  assert.equal(invalid.status, 400);
  assert.deepEqual(await get(options), ['1', '2']);
  await request('/v1/favorites', { ...secondOptions, method: 'POST', data: { productId: '1', favorite: false } });
  assert.deepEqual(await get(options), ['1', '2']);
  await Promise.all(Array.from({ length: 4 }, () => request('/v1/favorites/import', { ...options, method: 'POST', data: { productIds: ['2', '3'] } })));
  assert.deepEqual(await get(options), ['1', '2', '3']);
  await request('/v1/favorites', { ...options, method: 'POST', data: { productId: '1', favorite: false } });
  assert.deepEqual(await get(options), ['2', '3']);
  assert.deepEqual(await get(secondOptions), []);
  const permissions = await database.query("SELECT has_column_privilege(current_user, 'user_favorites', 'created_at', 'INSERT') AS can_forge_date, has_table_privilege(current_user, 'user_favorites', 'UPDATE') AS can_reassign");
  assert.equal(permissions.rows[0].can_forge_date, false);
  assert.equal(permissions.rows[0].can_reassign, false);
  await request('/v1/auth/logout', { method: 'POST', data: {}, cookie: firstCookie });
  assert.equal((await request('/v1/favorites', options)).status, 401);
}));

test.after(async () => { await database?.end(); await owner?.end(); await pool?.end(); });
