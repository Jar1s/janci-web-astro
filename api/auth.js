import { loadAuthCors } from './deps.js';

export default async function handler(req, res) {
  const { isAdminRequest, getCorsHeaders, handleCorsPreflight } = await loadAuthCors();

  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach((key) => {
    res.setHeader(key, corsHeaders[key]);
  });

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(503).json({
        error: 'Service unavailable',
        code: 'not_configured',
        message:
          'Admin prihlásenie nie je nakonfigurované na serveri. Nastavte premennú ADMIN_PASSWORD vo Vercel (Settings → Environment Variables).'
      });
    }
    if (!isAdminRequest(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'wrong_password',
        message: 'Nesprávne administrátorské heslo. Skúste to znova.'
      });
    }
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
