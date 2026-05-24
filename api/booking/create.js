import { randomUUID } from 'node:crypto';
import { loadKvAuthCorsValidation } from '../deps.js';
import { createExternalBooking, getAvailableSlots } from '../../lib/booking-provider.js';
import { getRecaptchaMode, isRecaptchaEnabled, verifyRecaptchaToken } from '../../lib/recaptcha.js';

export default async function handler(req, res) {
  const {
    getCorsHeaders,
    handleCorsPreflight,
    validateBookingCreate,
    upsertBookingRequest,
    getBookingRequestByClientRequestId,
    countRecentBookingRequestsByPhone
  } =
    await loadKvAuthCorsValidation();

  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach((key) => {
    res.setHeader(key, corsHeaders[key]);
  });

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nepodporovaná HTTP metóda' });
  }

  const payload = req.body || {};
  const validation = validateBookingCreate(payload);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Neplatné vstupné údaje', errors: validation.errors });
  }

  const incomingClientRequestId = payload.clientRequestId ? String(payload.clientRequestId).trim() : null;
  const clientRequestId = incomingClientRequestId || randomUUID();
  const normalizedPayload = {
    slotId: String(payload.slotId).trim(),
    slotStartAt: payload.slotStartAt ? String(payload.slotStartAt) : null,
    serviceType: payload.serviceType ? String(payload.serviceType).toLowerCase() : 'tk_ek',
    name: String(payload.name).trim(),
    phone: String(payload.phone).trim(),
    email: payload.email ? String(payload.email).trim() : null,
    vehiclePlate: payload.vehiclePlate ? String(payload.vehiclePlate).trim().toUpperCase() : null,
    vehicleVin: payload.vehicleVin ? String(payload.vehicleVin).trim().toUpperCase() : null,
    note: payload.note ? String(payload.note).trim() : null,
    clientRequestId
  };

  if (incomingClientRequestId) {
    const existing = await getBookingRequestByClientRequestId(incomingClientRequestId);
    if (existing?.bookingRequest) {
      const prev = existing.bookingRequest;
      if (prev.status === 'confirmed') {
        return res.status(200).json({
          ok: true,
          deduplicated: true,
          requestId: prev.clientRequestId,
          bookingId: prev.externalBookingId || null,
          source: 'idempotent'
        });
      }
      if (prev.status === 'pending') {
        return res.status(202).json({
          ok: true,
          deduplicated: true,
          requestId: prev.clientRequestId,
          detail: 'Požiadavka sa už spracováva.'
        });
      }
      if (prev.status === 'failed') {
        return res.status(409).json({
          error: 'Táto požiadavka už bola spracovaná s chybou',
          detail: 'Skúste odoslať nový formulár pre vytvorenie novej rezervácie.'
        });
      }
    }
  }

  if (isRecaptchaEnabled()) {
    const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const remoteIp = forwardedFor || req.socket?.remoteAddress || '';
    const expectedAction = getRecaptchaMode() === 'v3' ? 'booking_submit' : null;
    const recaptcha = await verifyRecaptchaToken(payload.recaptchaToken, remoteIp, expectedAction);
    if (!recaptcha.ok) {
      return res.status(400).json({
        error: 'Nepodarilo sa overiť reCAPTCHA',
        detail: recaptcha.message
      });
    }
  }

  const rateLimit = await countRecentBookingRequestsByPhone(normalizedPayload.phone, 1);
  if ((rateLimit?.count || 0) >= 5) {
    return res.status(429).json({
      error: 'Príliš veľa pokusov o rezerváciu',
      detail: 'Skúste to prosím znova o chvíľu alebo nám zavolajte na 0948 888 088.'
    });
  }

  try {
    const slotProbeFrom = normalizedPayload.slotStartAt && !Number.isNaN(Date.parse(normalizedPayload.slotStartAt))
      ? normalizedPayload.slotStartAt
      : new Date().toISOString();
    const { slots } = await getAvailableSlots({
      serviceType: normalizedPayload.serviceType,
      fromDate: slotProbeFrom,
      days: 2
    });
    const matchedSlot = Array.isArray(slots)
      ? slots.find((slot) => slot?.id === normalizedPayload.slotId || slot?.startAt === normalizedPayload.slotStartAt)
      : null;
    if (!matchedSlot || matchedSlot.available === false) {
      return res.status(409).json({
        error: 'Vybraný termín už nie je dostupný',
        detail: 'Obnovte tabuľku termínov a vyberte si prosím iný voľný čas.'
      });
    }
  } catch (error) {
    const statusCode = error?.status === 503 ? 503 : 502;
    return res.status(statusCode).json({
      error: 'Nepodarilo sa overiť dostupnosť termínu',
      detail: error?.message || 'Neznáma chyba'
    });
  }

  await upsertBookingRequest({
    clientRequestId,
    status: 'pending',
    serviceType: normalizedPayload.serviceType,
    slotId: normalizedPayload.slotId,
    slotStartAt: normalizedPayload.slotStartAt,
    customerName: normalizedPayload.name,
    customerPhone: normalizedPayload.phone,
    customerEmail: normalizedPayload.email,
    vehiclePlate: normalizedPayload.vehiclePlate,
    vehicleVin: normalizedPayload.vehicleVin,
    note: normalizedPayload.note
  });

  try {
    const external = await createExternalBooking(normalizedPayload);

    await upsertBookingRequest({
      clientRequestId,
      status: 'confirmed',
      serviceType: normalizedPayload.serviceType,
      slotId: normalizedPayload.slotId,
      slotStartAt: normalizedPayload.slotStartAt,
      customerName: normalizedPayload.name,
      customerPhone: normalizedPayload.phone,
      customerEmail: normalizedPayload.email,
      vehiclePlate: normalizedPayload.vehiclePlate,
      vehicleVin: normalizedPayload.vehicleVin,
      note: normalizedPayload.note,
      externalBookingId: external.externalBookingId,
      externalResponse: external.rawResponse
    });

    return res.status(201).json({
      ok: true,
      requestId: clientRequestId,
      bookingId: external.externalBookingId || null,
      source: external.source
    });
  } catch (error) {
    await upsertBookingRequest({
      clientRequestId,
      status: 'failed',
      serviceType: normalizedPayload.serviceType,
      slotId: normalizedPayload.slotId,
      slotStartAt: normalizedPayload.slotStartAt,
      customerName: normalizedPayload.name,
      customerPhone: normalizedPayload.phone,
      customerEmail: normalizedPayload.email,
      vehiclePlate: normalizedPayload.vehiclePlate,
      vehicleVin: normalizedPayload.vehicleVin,
      note: normalizedPayload.note,
      errorMessage: error?.message || 'Neznáma chyba'
    });

    const statusCode = error?.status === 503 ? 503 : 502;
    return res.status(statusCode).json({
      error: 'Rezerváciu sa nepodarilo odoslať',
      detail: error?.message || 'Neznáma chyba',
      requestId: clientRequestId
    });
  }
}
