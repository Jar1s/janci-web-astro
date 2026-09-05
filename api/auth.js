import { requireAdmin } from '../lib/auth.js';
import { getCorsHeaders, handleCorsPreflight } from '../lib/cors.js';

export default async function handler(req, res) {
  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach((key) => {
    res.setHeader(key, corsHeaders[key]);
  });

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  if (!requireAdmin(req, res)) return;
  return res.status(200).json({ ok: true });
}
