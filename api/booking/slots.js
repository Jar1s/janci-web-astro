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
    return res.status(405).json({ error: 'Nepodporovaná HTTP metóda' });
  }

  const validation = validateBookingSlotsQuery(req.query || {});
  if (!validation.valid) {
    return res.status(400).json({ error: 'Neplatné vstupné údaje', errors: validation.errors });
  }

  const serviceType = req.query?.serviceType ? String(req.query.serviceType).toLowerCase() : 'tk_ek';
  const days = req.query?.days ? Number(req.query.days) : 14;
  const startDate = req.query?.startDate ? String(req.query.startDate).trim() : '';
  const fromDate = startDate
    ? new Date(`${startDate}T00:00:00`).toISOString()
    : new Date().toISOString();

  try {
    const { slots, source } = await getAvailableSlots({
      serviceType,
      days,
      fromDate
    });

    return res.status(200).json({ slots, source });
  } catch (error) {
    return res.status(502).json({
      error: 'Nepodarilo sa načítať voľné termíny',
      detail: error?.message || 'Neznáma chyba'
    });
  }
}
