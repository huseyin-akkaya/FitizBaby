import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createApp } from '../app.js';
import { createPool, pool } from '../db/pool.js';
import { decodeImage } from '../products/validation.js';

const integration = Boolean(process.env.FITIZBABY_TEST_DATABASE_URL);
const database = integration ? createPool(process.env.FITIZBABY_TEST_DATABASE_URL) : null;
const owner = integration ? createPool(process.env.FITIZBABY_TEST_OWNER_URL) : null;
const baseProduct = { name: 'Etiket Testi', brand: 'Test', category: 'Kahvaltılık', serving: '100 g', calories: 350, protein: 15, carbs: 40, sugar: 3, fat: 10, ingredientsText: 'Yulaf\nSüt', allergensText: 'Süt', tracesText: '', sourceUrl: 'https://example.test/label', image: '' };
const id = () => 'custom-' + randomUUID();
async function withApi(action) {
  const server = createApp(database).listen(0, '127.0.0.1'); await once(server, 'listening');
  const request = (path, { method = 'GET', data, cookie, account, raw, headers = {} } = {}) => fetch('http://127.0.0.1:' + server.address().port + '/api/v1/' + path, { method, headers: { ...(!['GET', 'HEAD'].includes(method) ? { Origin: 'http://localhost:8080', 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(account ? { 'X-FitizBaby-Account': account } : {}), ...headers }, body: raw ?? (data === undefined ? undefined : JSON.stringify(data)) });
  const register = async () => {
    const response = await request('auth/register', { method: 'POST', data: { name: 'Ürün Testi', email: randomUUID() + '@example.test', password: 'Products-only-generated-test-password!' } });
    assert.equal(response.status, 201);
    return { cookie: response.headers.get('set-cookie').split(';')[0], account: (await response.json()).user.id };
  };
  try { await action(request, register); } finally { await new Promise(resolve => server.close(resolve)); }
}
test('Image decoder rejects SVG, URLs, corrupt files, mismatched MIME and oversized dimensions', async () => {
  for (const input of ['https://example.test/picture.png', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,AAAA']) await assert.rejects(decodeImage(input));
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(decodeImage('data:image/jpeg;base64,' + png.toString('base64')));
  const large = await sharp({ create: { width: 4100, height: 4100, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(decodeImage('data:image/png;base64,' + large.toString('base64')));
});
test('Real PostgreSQL: private product CRUD, image access and optimistic concurrency', { skip: !integration }, async () => withApi(async (request, register) => {
  assert.equal((await request('products')).status, 401);
  assert.equal((await request('products', { method: 'POST', raw: 'x'.repeat(950000) })).status, 401);
  const a = await register(); const b = await register(); const productId = id();
  const png = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#88cc88' } }).withMetadata().png().toBuffer();
  const input = { ...baseProduct, image: 'data:image/png;base64,' + png.toString('base64') };
  const created = await request('products', { ...a, method: 'POST', data: { id: productId, product: input } });
  assert.equal(created.status, 201);
  let product = (await created.json()).product;
  assert.ok(product.image.includes('/image?account=' + a.account));
  const imagePath = product.image.replace('/api/v1/', '');
  assert.equal((await request('products/' + productId, b)).status, 404);
  assert.deepEqual((await (await request('products', b)).json()).products, []);
  assert.equal((await request(imagePath)).status, 401);
  assert.equal((await request(imagePath, b)).status, 409);
  assert.equal((await request('products/' + productId + '/image?account=' + b.account, b)).status, 404);
  const image = await request(imagePath, a);
  assert.equal(image.status, 200); assert.match(image.headers.get('content-type'), /^image\/webp/); assert.equal(image.headers.get('cache-control'), 'no-store');
  const imageBytes = Buffer.from(await image.arrayBuffer());
  const metadata = await sharp(imageBytes).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 800); assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined);
  assert.equal((await request('products/' + productId, { ...b, method: 'PUT', data: { revision: product.revision, product: baseProduct } })).status, 404);
  assert.equal((await request('products/' + productId, { ...b, method: 'DELETE', data: { revision: product.revision } })).status, 404);
  assert.equal((await request('products', { ...a, account: b.account })).status, 409);
  assert.equal((await request('products', { ...a, method: 'POST', data: { id: id(), product: baseProduct, userId: b.account } })).status, 400);
  for (const bad of [{ ...baseProduct, sugar: 90 }, { ...baseProduct, sourceUrl: 'javascript:alert(1)' }, { ...baseProduct, image: 'https://example.test/remote.jpg' }, { ...baseProduct, role: 'admin' }, { ...baseProduct, ingredientsText: '' }]) {
    assert.equal((await request('products', { ...a, method: 'POST', data: { id: id(), product: bad } })).status, 400);
  }
  assert.equal((await request('products', { ...a, method: 'POST', raw: JSON.stringify({ padding: 'x'.repeat(930000) }) })).status, 413);
  const oldRevision = product.revision;
  const competing = await Promise.all(['Yeni Etiket 1', 'Yeni Etiket 2'].map(name => request('products/' + productId, { ...a, method: 'PUT', data: { revision: oldRevision, product: { ...baseProduct, name, image: null } } })));
  assert.deepEqual(competing.map(response => response.status).sort(), [200, 409]);
  product = (await (await request('products/' + productId, a)).json()).product;
  const preserved = await request(product.image.replace('/api/v1/', ''), a);
  assert.deepEqual(Buffer.from(await preserved.arrayBuffer()), imageBytes);
  const imported = await request('products/import', { ...a, method: 'POST', data: { id: productId, product: baseProduct } });
  assert.equal(imported.status, 200); assert.equal((await imported.json()).imported, false);
  assert.notEqual((await (await request('products/' + productId, a)).json()).product.name, baseProduct.name);
  // Same local UUID may be explicitly imported by another user, but their copy is independent.
  assert.equal((await request('products/import', { ...b, method: 'POST', data: { id: productId, product: { ...baseProduct, name: 'B kopyası' } } })).status, 201);
  assert.equal((await (await request('products/' + productId, b)).json()).product.name, 'B kopyası');
  await request('favorites', { ...a, method: 'POST', data: { productId, favorite: true } });
  await request('favorites', { ...b, method: 'POST', data: { productId, favorite: true } });
  assert.equal((await request('products/' + productId, { ...a, method: 'DELETE', data: { revision: oldRevision } })).status, 409);
  assert.equal((await request('products/' + productId, { ...a, method: 'DELETE', data: { revision: product.revision } })).status, 200);
  assert.equal((await request('products/' + productId, a)).status, 404);
  assert.equal((await request(imagePath, a)).status, 404);
  assert.deepEqual((await (await request('favorites', a)).json()).productIds, []);
  assert.deepEqual((await (await request('favorites', b)).json()).productIds, [productId]);
  const reimported = await request('products/import', { ...a, method: 'POST', data: { id: productId, product: baseProduct } });
  assert.equal((await reimported.json()).imported, false);
  assert.equal((await request('products/' + productId, a)).status, 404);
  const tombstone = (await owner.query('SELECT data, image, deleted_at FROM user_products WHERE user_id=$1 AND id=$2', [a.account, productId])).rows[0];
  assert.deepEqual(tombstone.data, {}); assert.equal(tombstone.image, null); assert.ok(tombstone.deleted_at);
  assert.equal((await request('favorites', { ...a, method: 'POST', data: { productId, favorite: true } })).status, 400);
}));
test('Real PostgreSQL: active product quota and restricted database columns', { skip: !integration }, async () => withApi(async (request, register) => {
  const a = await register();
  await owner.query("INSERT INTO user_products (user_id,id,data) SELECT $1, 'custom-' || gen_random_uuid()::text, '{}'::jsonb FROM generate_series(1,100)", [a.account]);
  assert.equal((await request('products', { ...a, method: 'POST', data: { id: id(), product: baseProduct } })).status, 409);
  const permissions = (await database.query("SELECT has_column_privilege(current_user,'user_products','user_id','UPDATE') AS owner_change, has_column_privilege(current_user,'user_products','id','UPDATE') AS id_change, has_column_privilege(current_user,'user_products','created_at','INSERT') AS fake_date, has_table_privilege(current_user,'user_products','DELETE') AS purge")).rows[0];
  assert.deepEqual(permissions, { owner_change: false, id_change: false, fake_date: false, purge: false });
}));
test.after(async () => { await database?.end(); await owner?.end(); await pool?.end(); });
