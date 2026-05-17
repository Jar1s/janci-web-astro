import { loadKvAuthCorsValidation } from '../deps.js';
import { bulkImportReviews } from '../../lib/reviews-import.js';

export default async function handler(req, res) {
  const { requireAdmin, createManualReview, getManualReviews, getCorsHeaders, handleCorsPreflight } =
    await loadKvAuthCorsValidation();

  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach((key) => {
    res.setHeader(key, corsHeaders[key]);
  });

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req, res)) return;

  const skipExisting = req.body?.skipExisting !== false;

  try {
    const result = await bulkImportReviews({
      createManualReview,
      getManualReviews,
      skipExisting
    });
    return res.status(200).json({ ok: true, message: 'Import dokončený', ...result });
  } catch (err) {
    console.error('Reviews bulk import:', err);
    return res.status(500).json({ error: err.message || 'Import failed' });
  }
}
