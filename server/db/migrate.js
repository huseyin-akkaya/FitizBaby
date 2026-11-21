import dotenv from 'dotenv';
import { migrationChecksums } from './migration-checksums.js';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createPool } from './pool.js';

export async function migrate(connectionString, appRole) {
  if (!connectionString || !/^[a-z_][a-z0-9_]{0,62}$/.test(appRole || '')) throw new Error('Migration bağlantısı veya uygulama rolü eksik.');
  const pool = createPool(connectionString);
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(843115044)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const directory = new URL('./migrations/', import.meta.url);
    for (const name of (await readdir(directory)).filter(file => file.endsWith('.sql')).sort()) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const checksums = migrationChecksums(sql);
      const checksum = checksums[0];
      const previous = await client.query('SELECT checksum FROM schema_migrations WHERE name = $1', [name]);
      if (previous.rows[0]) {
        if (!checksums.includes(previous.rows[0].checksum)) throw new Error('Uygulanmış migration değiştirildi; yeni migration ekle.');
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
    // Fixed table allowlist: runtime cannot change the schema or migration history.
    const role = '"' + appRole + '"';
    await client.query('BEGIN');
    try {
      await client.query('REVOKE ALL ON users, user_sessions FROM ' + role);
      await client.query('GRANT SELECT (id, display_name, email, password_hash, role, email_verified_at, email_verification_source, created_at, updated_at, last_login_at), INSERT (display_name, email, password_hash), UPDATE (last_login_at, password_hash, email_verified_at, email_verification_source, updated_at) ON users TO ' + role);
      await client.query('GRANT DELETE ON users TO ' + role);
      await client.query('REVOKE ALL ON account_export_grants FROM ' + role);
      await client.query('GRANT SELECT, DELETE, INSERT (session_id,user_id,capability_hash,expires_at), UPDATE (expires_at,capability_hash) ON account_export_grants TO ' + role);
      await client.query('GRANT SELECT, DELETE ON user_sessions TO ' + role);
      await client.query('REVOKE ALL ON mail_outbox, mail_usage FROM ' + role);
      await client.query('GRANT SELECT ON mail_outbox, mail_usage TO ' + role);
      await client.query('GRANT INSERT (id,user_id,action_id,ciphertext,expires_at), UPDATE (state,attempts,available_at,lease_until,lease_token,last_error,provider_message_id,ciphertext,updated_at) ON mail_outbox TO ' + role);
      await client.query('GRANT INSERT (window_key,reserved), UPDATE (reserved) ON mail_usage TO ' + role);
      await client.query('REVOKE ALL ON account_actions FROM ' + role);
      await client.query('GRANT SELECT, DELETE, INSERT (user_id, purpose, token_hash, expires_at, delivery), UPDATE (used_at) ON account_actions TO ' + role);
      await client.query('REVOKE ALL ON user_nutrition FROM ' + role);
      await client.query('GRANT SELECT, INSERT (user_id, key, data), UPDATE (data, revision, updated_at) ON user_nutrition TO ' + role);
      await client.query('REVOKE ALL ON user_products FROM ' + role);
      await client.query('GRANT SELECT, INSERT (user_id, id, data, image), UPDATE (data, image, revision, updated_at, deleted_at) ON user_products TO ' + role);
      await client.query('REVOKE ALL ON user_favorites FROM ' + role);
      await client.query('GRANT SELECT, DELETE, INSERT (user_id, product_id) ON user_favorites TO ' + role);
      await client.query('GRANT INSERT (user_id, token_hash, expires_at), UPDATE (last_seen_at) ON user_sessions TO ' + role);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } finally {
    await client.query('SELECT pg_advisory_unlock(843115044)').catch(() => {});
    client.release(); await pool.end();
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  dotenv.config({ path: '.env.migration', quiet: true });
  try { await migrate(process.env.MIGRATION_DATABASE_URL, new URL(process.env.DATABASE_URL).username); console.info('Veritabanı şeması hazır.'); }
  catch { console.error('Migration tamamlanamadı. Bağlantıyı ve şema dosyalarını kontrol et.'); process.exitCode = 1; }
}
