import { loadKvAuthCorsValidation } from './deps.js';

const FALLBACK_REVIEWS = [
  {
    author_name: 'Kristina Martinková',
    rating: 5,
    text: 'Za mňa zatiaľ najlepšia Emisná a STK na akej som bola príjemný prístup dievčat a pani ktorá tam bola a stále nám ponúkala bud koláčik raňajky kávu ...',
    relative_time_description: 'pred mesiacom'
  },
  {
    author_name: 'dwarfiusislav',
    rating: 5,
    text: 'Veľmi príjemný zážitok. Bol som prvý krát na odporúčanie a som milo prekvapený. Prakticky o nič sa nemusíte starať, dostanete aj kávičku a štrúdlu v ...',
    relative_time_description: 'pred 2 mesiacmi'
  },
  {
    author_name: 'CHRÁNIME TO ČO MUSÍME',
    rating: 5,
    text: 'EK a STK No lepšie sme ani nemohli spraviť ako ísť zrovna sem ..... 10/10 od vstupu až po odchod ..... Takýto servis som ešte nikde nezažil od ...',
    relative_time_description: 'pred 3 mesiacmi'
  }
];

function extractId(req) {
  if (req.query?.id) return req.query.id;
  const path = (req.url || '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  const idx = parts.indexOf('reviews');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return null;
}

async function fetchGoogleReviews(placeId, apiKey, limit = 5) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews,rating,user_ratings_total&language=sk&key=${apiKey}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await response.json();
  if (data.status !== 'OK' || !data.result) {
    throw new Error(data.status || 'Google API error');
  }
  return {
    reviews: (data.result.reviews || []).slice(0, limit).map((r) => ({
      author_name: r.author_name,
      rating: r.rating,
      text: r.text,
      relative_time_description: r.relative_time_description,
      profile_photo_url: r.profile_photo_url
    })),
    source: 'google',
    rating: data.result.rating,
    total_reviews: data.result.user_ratings_total
  };
}

export default async function handler(req, res) {
  const {
    getManualReviews,
    getManualReviewStats,
    createManualReview,
    updateManualReview,
    deleteManualReview,
    requireAdmin,
    isAdminRequest,
    validatePublicReview,
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

  const id = extractId(req);
  const limit = Math.min(200, Math.max(1, Number(req.query?.limit) || 50));

  if (req.method === 'GET') {
    const isAdmin = isAdminRequest(req);
    const { reviews } = await getManualReviews(!isAdmin, isAdmin ? 200 : limit);

    if (reviews.length > 0) {
      const stats = await getManualReviewStats(!isAdmin);
      return res.status(200).json({
        reviews: reviews.map(({ author_name, rating, text, relative_time_description, id: reviewId, approved, source }) => ({
          id: reviewId,
          author_name,
          rating,
          text,
          relative_time_description,
          approved,
          source
        })),
        source: 'database',
        rating: stats.rating ?? 4.9,
        total_reviews: stats.count
      });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = req.query.placeId || process.env.GOOGLE_PLACE_ID;
    if (apiKey && placeId) {
      try {
        const google = await fetchGoogleReviews(placeId, apiKey, limit);
        return res.status(200).json(google);
      } catch (err) {
        console.warn('Google reviews fallback:', err.message);
      }
    }

    return res.status(200).json({
      reviews: FALLBACK_REVIEWS,
      source: 'fallback',
      rating: 4.9,
      total_reviews: 250
    });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const validation = validatePublicReview(body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }

    const result = await createManualReview({
      name: body.name.trim(),
      text: body.text.trim(),
      rating: body.rating ?? 5,
      approved: false,
      source: 'website',
      relativeTimeDescription: 'čaká na schválenie'
    });

    if (!result.ok) {
      return res.status(503).json({
        error: 'Recenziu sa nepodarilo uložiť',
        reason: result.reason,
        detail: result.detail
      });
    }

    return res.status(201).json({
      ok: true,
      message: 'Ďakujeme! Recenzia sa zobrazí po schválení administrátorom.'
    });
  }

  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    if (!id) return res.status(400).json({ error: 'Missing review id' });

    const body = req.body || {};
    const result = await updateManualReview(id, {
      name: body.name?.trim(),
      text: body.text?.trim(),
      rating: body.rating,
      approved: body.approved,
      relativeTimeDescription: body.relative_time_description
    });

    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to update review', reason: result.reason });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    if (!id) return res.status(400).json({ error: 'Missing review id' });

    const result = await deleteManualReview(id);
    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to delete review', reason: result.reason });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
