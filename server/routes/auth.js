import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { env } from '../config.js';
import { passwordWork } from '../middleware/security.js';
import { hashOptions, passwordSchema as password } from '../auth/password-policy.js';

const cookieName = env.NODE_ENV === 'production' ? '__Host-fitizbaby_session' : 'fitizbaby_session';
const duration = 7 * 24 * 60 * 60 * 1000;
const email = z.email().max(254);
const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().pipe(email), password }).strict();
const loginSchema = z.object({ email: z.string().trim().toLowerCase().pipe(email), password: z.string().min(1).max(128) }).strict();
const digest = token => createHash('sha256').update(token).digest('hex');
const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
const publicUser = row => ({ id: row.id, name: row.display_name, email: row.email, role: row.role, emailVerified: Boolean(row.email_verified_at) });
function readToken(req) {
  const value = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
function parseBody(schema, body, res) {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Bilgileri kontrol et. Parola 15–128 karakter, ad 2–100 karakter olmalı; geçerli e-posta gir.' } });
  return null;
}
async function session(client, userId, previousToken) {
  await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
  if (previousToken) await client.query('DELETE FROM user_sessions WHERE token_hash = $1', [digest(previousToken)]);
  await client.query('DELETE FROM user_sessions WHERE user_id = $1 AND expires_at <= NOW()', [userId]);
  const token = randomBytes(32).toString('base64url');
  await client.query('INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, digest(token), new Date(Date.now() + duration)]);
  await client.query('DELETE FROM user_sessions WHERE id IN (SELECT id FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC, id DESC OFFSET 5)', [userId]);
  return token;
}
function unavailable(res) { return res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Hesap sistemi hazır değil. Yerel veritabanı kurulumunu kontrol et.' } }); }

export function createAuthRouter(database, authLimit) {
  const router = Router();
  router.post('/register', authLimit, async (req, res) => {
    const input = parseBody(registerSchema, req.body, res);
    if (!input) return;
    if (!database) return unavailable(res);
    const passwordHash = await passwordWork(() => argon2.hash(input.password, hashOptions));
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('INSERT INTO users (display_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, display_name, email, role, email_verified_at', [input.name, input.email, passwordHash]);
      const user = result.rows[0];
      const token = await session(client, user.id, readToken(req));
      await client.query('COMMIT');
      res.cookie(cookieName, token, { ...cookieOptions, maxAge: duration });
      return res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.code === '23505') return res.status(409).json({ error: { code: 'REGISTRATION_FAILED', message: 'Bu bilgilerle kayıt tamamlanamadı. Mevcut hesabın varsa giriş yapmayı dene.' } });
      throw error;
    } finally { client.release(); }
  });
  router.post('/login', authLimit, async (req, res) => {
    const input = parseBody(loginSchema, req.body, res);
    if (!input) return;
    if (!database) return unavailable(res);
    const result = await database.query('SELECT id, display_name, email, password_hash, role, email_verified_at FROM users WHERE email = $1', [input.email]);
    const user = result.rows[0];
    const valid = await passwordWork(async () => user ? argon2.verify(user.password_hash, input.password) : (await argon2.hash(input.password, hashOptions), false));
    if (!valid) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'E-posta veya parola hatalı.' } });
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const latest = await client.query('SELECT password_hash, email_verified_at FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      if (latest.rows[0]?.password_hash !== user.password_hash) { await client.query('ROLLBACK'); return res.status(401).json({error:{code:'INVALID_CREDENTIALS',message:'E-posta veya parola hatalı.'}}); }
      user.email_verified_at = latest.rows[0].email_verified_at;
      const token = await session(client, user.id, readToken(req));
      await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      await client.query('COMMIT');
      res.cookie(cookieName, token, { ...cookieOptions, maxAge: duration });
      return res.json({ user: publicUser(user) });
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  });
  router.get('/me', async (req, res) => {
    const user = await lookupUser(database, req, res);
    if (!res.headersSent) res.json({ user });
  });
  router.get('/account', async (req, res) => {
    const user = await lookupUser(database, req, res);
    if (res.headersSent) return;
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Bu işlem için giriş yapmalısın.' } });
    return res.json({ user });
  });
  router.post('/logout', async (req, res) => {
    const token = readToken(req);
    if (token && !database) return unavailable(res);
    if (token) await database.query('DELETE FROM user_sessions WHERE token_hash = $1', [digest(token)]);
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).end();
  });
  return router;
}

export async function lookupUser(database, req, res) {
    if (!database) return unavailable(res);
    const token = readToken(req);
    if (!token) return null;
    const result = await database.query(`UPDATE user_sessions s SET last_seen_at = NOW() FROM users u
      WHERE s.user_id = u.id AND s.token_hash = $1 AND s.expires_at > NOW()
      AND s.last_seen_at > NOW() - INTERVAL '30 minutes'
      RETURNING u.id, u.display_name, u.email, u.role, u.email_verified_at`, [digest(token)]);
    if (!result.rows[0]) { res.clearCookie(cookieName, cookieOptions); return null; }
    return publicUser(result.rows[0]);
  }
