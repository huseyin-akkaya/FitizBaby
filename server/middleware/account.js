import { lookupUser } from '../routes/auth.js';

export function requireAccount(database, allowImageQuery = false) {
  return async (req, res, next) => {
    const user = await lookupUser(database, req, res);
    if (res.headersSent) return;
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Bu işlem için yeniden giriş yapmalısın.' } });
    const expected = allowImageQuery && req.method === 'GET' && req.path.endsWith('/image') ? req.query.account : req.get('X-FitizBaby-Account');
    // A consistency guard only: ownership always comes from the validated session.
    if (expected !== user.id) return res.status(409).json({ error: { code: 'ACCOUNT_CHANGED', message: 'Etkin hesap değişti. Sayfayı yenileyip yeniden dene.' } });
    res.locals.userId = user.id;
    next();
  };
}
