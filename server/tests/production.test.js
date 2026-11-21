import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../app.js';
import { pool } from '../db/pool.js';

const enabled = process.env.NODE_ENV === 'production' && Boolean(process.env.FITIZBABY_TEST_DATABASE_URL);
test('Production: rejects plain HTTP and uses Secure host-only session cookies behind trusted TLS proxy', { skip: !enabled }, async () => {
  const server = createApp(pool).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    assert.equal((await fetch(base + '/api/v1/auth/me')).status, 400);
    const response = await fetch(base + '/api/v1/auth/register', { method: 'POST', headers: { Origin: 'https://localhost', 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' }, body: JSON.stringify({ name: 'Production Test', email: 'production-' + Date.now() + '@example.test', password: 'Only-test-production-passphrase!' }) });
    assert.equal(response.status, 201);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /^__Host-fitizbaby_session=/);
    assert.match(cookie, /; Secure/); assert.match(cookie, /; HttpOnly/); assert.match(cookie, /SameSite=Lax/);
    assert.ok(!/Domain=/i.test(cookie));
    const status=await fetch(base+'/api/v1/auth/recovery-status',{headers:{'X-Forwarded-Proto':'https'}});
    assert.equal((await status.json()).delivery,'disabled');
    const forgot=await fetch(base+'/api/v1/auth/forgot-password',{method:'POST',headers:{Origin:'https://localhost','Content-Type':'application/json','X-Forwarded-Proto':'https'},body:JSON.stringify({email:'production-missing@example.test'})});
    assert.equal(forgot.status,503);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test.after(async () => { await pool?.end(); });
