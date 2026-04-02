import { getStatistics, saveStatistics } from '../lib/kv.js';
import { requireAdmin } from '../lib/auth.js';
import { validateStatistics } from '../lib/validation.js';
import { getCorsHeaders, handleCorsPreflight } from '../lib/cors.js';

export default async function handler(req, res) {
  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  if (req.method === 'GET') {
    const stats = await getStatistics();
    const yearsExperience = Math.max(0, new Date().getFullYear() - (stats.yearsExperienceStart || 2014));
    return res.status(200).json({
      performedInspections: stats.performedInspections,
      yearsExperience,
      satisfactionPercentage: stats.satisfactionPercentage,
      yearsExperienceStart: stats.yearsExperienceStart,
      googlePlaceId: stats.googlePlaceId
    });
  }

  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    const body = req.body || {};
    const stats = {
      performedInspections: body.performedInspections,
      yearsExperienceStart: body.yearsExperienceStart,
      satisfactionPercentage: body.satisfactionPercentage,
      googlePlaceId: body.googlePlaceId
    };
    const validation = validateStatistics(stats);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }
    const result = await saveStatistics(stats);
    if (!result.ok) {
      return res.status(500).json({
        error: 'Failed to save statistics',
        reason: result.reason,
        detail: result.detail,
        code: result.code
      });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}





