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
      return res.status(503).json({ error: 'ADMIN_PASSWORD is not configured' });
    }
    if (!isAdminRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
