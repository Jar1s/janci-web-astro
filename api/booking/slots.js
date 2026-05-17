import { loadKvAuthCorsValidation } from '../deps.js';
import { getAvailableSlots } from '../../lib/booking-provider.js';

export default async function handler(req, res) {
  const { getCorsHeaders, handleCorsPreflight, validateBookingSlotsQuery } =
    await loadKvAuthCorsValidation();

  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach((key) => {
    res.setHeader(key, corsHeaders[key]);
  });

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const validation = validateBookingSlotsQuery(req.query || {});
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
  }

  const serviceType = req.query?.serviceType ? String(req.query.serviceType).toLowerCase() : 'tk_ek';
  const days = req.query?.days ? Number(req.query.days) : 14;

  try {
    const { slots, source } = await getAvailableSlots({
      serviceType,
      days,
      fromDate: new Date().toISOString()
    });

    return res.status(200).json({ slots, source });
  } catch (error) {
    return res.status(502).json({
      error: 'Nepodarilo sa načítať voľné termíny',
      detail: error?.message || 'Unknown error'
    });
  }
}
