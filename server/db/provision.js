import pg from 'pg';
import { randomBytes } from 'node:crypto';

export function databasePlan({ host = '127.0.0.1', port = 5432, database = 'fitizbaby_dev', owner = 'fitizbaby_owner_dev', app = 'fitizbaby_app_dev' } = {}) {
  if (![database, owner, app].every(value => /^[a-z_][a-z0-9_]{0,62}$/.test(value))) throw new Error('Geçersiz veritabanı veya rol adı.');
  const ownerPassword = randomBytes(32).toString('hex'), appPassword = randomBytes(32).toString('hex');
  const connection = (role, password) => { const url = new URL('postgresql://127.0.0.1'); url.hostname = host; url.port = String(port); url.username = role; url.password = password; url.pathname = '/' + database; return url.href; };
  return { host, port, database, owner, app, ownerPassword, appPassword, ownerUrl: connection(owner, ownerPassword), appUrl: connection(app, appPassword) };
}
export async function provisionDatabase(adminConfig, plan) {
  const admin = new pg.Client({ ...adminConfig, connectionTimeoutMillis: 5000 });
  await admin.connect();
  try {
    const existing = await admin.query('SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname = ANY($2::text[])) AS found', [plan.database, [plan.owner, plan.app]]);
    if (existing.rows[0].found) throw new Error('TARGET_EXISTS');
    const quote = value => '"' + value + '"';
    // Passwords are generated hex, never accepted as SQL from user input.
    for (const [role, password] of [[plan.owner, plan.ownerPassword], [plan.app, plan.appPassword]]) {
      await admin.query('CREATE ROLE ' + quote(role) + " LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '" + password + "'");
    }
    await admin.query('CREATE DATABASE ' + quote(plan.database) + ' OWNER ' + quote(plan.owner));
    await admin.query('REVOKE ALL ON DATABASE ' + quote(plan.database) + ' FROM PUBLIC');
    await admin.query('GRANT CONNECT ON DATABASE ' + quote(plan.database) + ' TO ' + quote(plan.owner) + ', ' + quote(plan.app));
  } finally { await admin.end(); }
  const owner = new pg.Client({ connectionString: plan.ownerUrl, connectionTimeoutMillis: 5000 });
  await owner.connect();
  try {
    await owner.query('REVOKE ALL ON SCHEMA public FROM PUBLIC');
    await owner.query('GRANT USAGE ON SCHEMA public TO "' + plan.app + '"');
  } finally { await owner.end(); }
}
