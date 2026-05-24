const DEFAULT_EXTERNAL_TIMEOUT_MS = 8000;

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function formatSlotLabel(startAt) {
  const date = new Date(startAt);
  const dateLabel = new Intl.DateTimeFormat('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Bratislava'
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat('sk-SK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Bratislava'
  }).format(date);
  return `${dateLabel} ${timeLabel}`;
}

function normalizeSlot(slot) {
  if (!slot || typeof slot !== 'object') return null;
  const startAt = slot.startAt || slot.start_at || slot.from || null;
  const endAt = slot.endAt || slot.end_at || slot.to || null;
  const id = slot.id || slot.slotId || slot.slot_id || startAt;

  if (!id || !startAt) return null;
  return {
    id: String(id),
    startAt: String(startAt),
    endAt: endAt ? String(endAt) : null,
    available: slot.available !== false,
    label: slot.label || formatSlotLabel(startAt)
  };
}

function getExternalConfig() {
  const baseUrl = (process.env.BOOKING_EXTERNAL_BASE_URL || '').trim().replace(/\/$/, '');
  const apiKey = (process.env.BOOKING_EXTERNAL_API_KEY || '').trim();
  const timeoutMs = Number(process.env.BOOKING_EXTERNAL_TIMEOUT_MS) || DEFAULT_EXTERNAL_TIMEOUT_MS;
  return { baseUrl, apiKey, timeoutMs };
}

function isExternalConfigured() {
  const { baseUrl } = getExternalConfig();
  return Boolean(baseUrl);
}

function providerMode() {
  const mode = (process.env.BOOKING_PROVIDER || '').trim().toLowerCase();
  if (mode === 'mock') return 'mock';
  if (mode === 'external') return isExternalConfigured() ? 'external' : 'misconfigured';
  if (isExternalConfigured()) return 'external';
  return 'mock';
}

function assertProviderReady() {
  const mode = providerMode();
  if (mode === 'misconfigured') {
    const err = new Error(
      'Booking provider is not configured. Set BOOKING_EXTERNAL_BASE_URL or BOOKING_PROVIDER=external.'
    );
    err.status = 503;
    throw err;
  }
  return mode;
}

async function fetchExternalJson(url, options, timeoutMs) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!response.ok) {
    const message = body?.message || body?.error || `External booking API error (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.body = body;
    throw err;
  }

  return body;
}

function mockSlots({ fromDate, days, stepMinutes, serviceType }) {
  const now = new Date();
  const from = fromDate ? new Date(fromDate) : now;
  const slots = [];
  const openingHour = serviceType === 'ko' ? 8 : 7;
  const closingHour = serviceType === 'ko' ? 15 : 16;

  for (let day = 0; day < days; day += 1) {
    const date = addDays(from, day);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    for (let h = openingHour; h <= closingHour; h += 1) {
      for (let m = 0; m < 60; m += stepMinutes) {
        const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m, 0));
        if (start < now) continue;
        const slotId = `mock-${toIsoDate(start)}-${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
        slots.push({
          id: slotId,
          startAt: start.toISOString(),
          endAt: new Date(start.getTime() + stepMinutes * 60 * 1000).toISOString(),
          available: true,
          label: formatSlotLabel(start.toISOString())
        });
      }
    }
  }

  return slots.slice(0, 120);
}

export async function getAvailableSlots(options = {}) {
  const serviceType = options.serviceType || 'tk_ek';
  const fromDate = options.fromDate || new Date().toISOString();
  const days = Math.max(1, Math.min(31, Number(options.days) || 14));
  const stepMinutes = Math.max(5, Math.min(60, Number(options.stepMinutes) || 15));

  const mode = assertProviderReady();
  if (mode === 'mock') {
    return { source: 'mock', slots: mockSlots({ fromDate, days, stepMinutes, serviceType }) };
  }

  const { baseUrl, apiKey, timeoutMs } = getExternalConfig();
  const query = new URLSearchParams({
    from: fromDate,
    days: String(days),
    serviceType
  });
  const headers = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : {};

  const body = await fetchExternalJson(
    `${baseUrl}/slots?${query.toString()}`,
    { method: 'GET', headers },
    timeoutMs
  );

  const rawSlots = Array.isArray(body?.slots) ? body.slots : [];
  const slots = rawSlots.map(normalizeSlot).filter(Boolean);
  return { source: 'external', slots };
}

export async function createExternalBooking(payload) {
  const mode = assertProviderReady();
  if (mode === 'mock') {
    return {
      source: 'mock',
      externalBookingId: `mock-${payload.clientRequestId}`,
      rawResponse: { ok: true, mode: 'mock' }
    };
  }

  const { baseUrl, apiKey, timeoutMs } = getExternalConfig();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const body = await fetchExternalJson(
    `${baseUrl}/bookings`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        slotId: payload.slotId,
        serviceType: payload.serviceType,
        customer: {
          name: payload.name,
          phone: payload.phone,
          email: payload.email || null
        },
        vehicle: {
          plate: payload.vehiclePlate || null,
          vin: payload.vehicleVin || null
        },
        note: payload.note || null,
        clientRequestId: payload.clientRequestId
      })
    },
    timeoutMs
  );

  return {
    source: 'external',
    externalBookingId: body?.bookingId || body?.id || null,
    rawResponse: body
  };
}
