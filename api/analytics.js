import { loadKvAuthCorsValidation } from './deps.js';

const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|bytespider/i;

export default async function handler(req, res) {
  const {
    recordPageView,
    getVisitAnalytics,
    requireAdmin,
    validatePageView,
    getCorsHeaders,
    handleCorsPreflight
  } = await loadKvAuthCorsValidation();

  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach((key) => {
    res.setHeader(key, corsHeaders[key]);
  });

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  if (req.method === 'POST') {
    const ua = req.headers['user-agent'] || '';
    if (BOT_RE.test(ua)) {
      return res.status(204).end();
    }

    const body = req.body || {};
    const validation = validatePageView(body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }

    const result = await recordPageView({
      path: body.path.trim(),
      referrer: body.referrer,
      userAgent: ua
    });

    if (!result.ok) {
      return res.status(503).json({ error: 'Analytics unavailable', reason: result.reason });
    }

    return res.status(204).end();
  }

  if (req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    const data = await getVisitAnalytics();
    return res.status(200).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
