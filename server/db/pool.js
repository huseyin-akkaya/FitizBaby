import pg from 'pg';
import { env } from '../config.js';

export function createPool(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
  pool.on('error', () => console.error('Veritabanı bağlantısı kesildi.'));
  return pool;
}
export const pool = env.DATABASE_URL ? createPool(env.DATABASE_URL) : null;
export async function assertRuntimeRole(database) {
  const result = await database.query("SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls, has_schema_privilege(current_user, 'public', 'CREATE') AS can_change_schema FROM pg_roles WHERE rolname = current_user");
  if (!result.rows[0] || Object.values(result.rows[0]).some(Boolean)) throw new Error('API için sınırlı yetkili veritabanı kullanıcısı gerekli.');
  await database.query('SELECT id FROM users WHERE FALSE');
  await database.query('SELECT id FROM user_sessions WHERE FALSE');
}
