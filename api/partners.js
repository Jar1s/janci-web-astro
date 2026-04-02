import { deletePartner, getPartners, upsertPartner } from '../lib/kv.js';
import { requireAdmin } from '../lib/auth.js';
import { validatePartner } from '../lib/validation.js';
import { getCorsHeaders, handleCorsPreflight } from '../lib/cors.js';

function extractId(req) {
  if (req.query?.id) return req.query.id;
  const path = (req.url || '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  const idx = parts.indexOf('partners');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return null;
}

export default async function handler(req, res) {
  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  const id = extractId(req);

  if (req.method === 'GET') {
    const data = await getPartners(true);
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const { id: bodyId, name, logoUrl, link, sortOrder, active } = req.body || {};
    const validation = validatePartner({ name, logoUrl: logoUrl || null, link, sortOrder, active });
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }
    const result = await upsertPartner({
      id: bodyId,
      name: name.trim(),
      logoUrl: logoUrl?.trim() || null,
      link: link?.trim() || null,
      sortOrder: sortOrder ?? 0,
      active: active ?? true
    });
    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to save partner', reason: result.reason, detail: result.detail, code: result.code });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { name, logoUrl, link, sortOrder, active } = req.body || {};
    
    // Get existing partner to preserve logoUrl if not provided
    const existing = await getPartners(false);
    const existingPartner = existing.partners.find((p) => p.id.toString() === id.toString());
    const finalLogoUrl = logoUrl !== undefined ? (logoUrl?.trim() || null) : (existingPartner?.logoUrl || null);
    
    const validation = validatePartner({ name, logoUrl: finalLogoUrl, link, sortOrder, active });
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }
    const result = await upsertPartner({
      id,
      name: name?.trim(),
      logoUrl: finalLogoUrl,
      link: link?.trim() || null,
      sortOrder: sortOrder ?? 0,
      active: active ?? true
    });
    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to update partner', reason: result.reason, detail: result.detail, code: result.code });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const result = await deletePartner(id);
    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to delete partner', reason: result.reason, detail: result.detail, code: result.code });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
