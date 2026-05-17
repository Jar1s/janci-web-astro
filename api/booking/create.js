import { randomUUID } from 'node:crypto';
import { loadKvAuthCorsValidation } from '../deps.js';
import { createExternalBooking } from '../../lib/booking-provider.js';

export default async function handler(req, res) {
  const { getCorsHeaders, handleCorsPreflight, validateBookingCreate, upsertBookingRequest } =
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

  const payload = req.body || {};
  const validation = validateBookingCreate(payload);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
  }

  const clientRequestId = randomUUID();
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
      errorMessage: error?.message || 'Unknown error'
    });

    return res.status(502).json({
      error: 'Rezerváciu sa nepodarilo odoslať',
      detail: error?.message || 'Unknown error',
      requestId: clientRequestId
    });
  }
}
