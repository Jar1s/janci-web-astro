import { cors, handleCors } from '../lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = req.query.placeId || process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    // Return fallback reviews if no API key
    return res.status(200).json({
      reviews: [
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
      ],
      source: 'fallback',
      rating: 4.9,
      total_reviews: 250
    });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews,rating,user_ratings_total&language=sk&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      throw new Error(data.status || 'Google API error');
    }

    return res.status(200).json({
      reviews: (data.result.reviews || []).slice(0, 5).map(r => ({
        author_name: r.author_name,
        rating: r.rating,
        text: r.text,
        relative_time_description: r.relative_time_description,
        profile_photo_url: r.profile_photo_url
      })),
      source: 'google',
      rating: data.result.rating,
      total_reviews: data.result.user_ratings_total
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
