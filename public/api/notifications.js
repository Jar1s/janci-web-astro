import { deleteNotification, getNotifications, updateNotification, upsertNotification } from '../lib/kv.js';
import { requireAdmin, isAdminRequest } from '../lib/auth.js';
import { validateNotification } from '../lib/validation.js';
import { getCorsHeaders, handleCorsPreflight } from '../lib/cors.js';

function extractId(req) {
  // Try query param first
  if (req.query?.id) return req.query.id;
  // Fallback parse from URL path /api/notifications/123
  const path = (req.url || '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  const idx = parts.indexOf('notifications');
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
    const isAdmin = isAdminRequest(req);
    const data = await getNotifications(isAdmin ? false : true);
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    const { id: bodyId, text, backgroundColor, backgroundGradient, borderColor, textColor, active } = req.body || {};
    const validation = validateNotification({ text, backgroundColor, backgroundGradient, borderColor, textColor, active });
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }
    const result = await upsertNotification({
      id: bodyId,
      text: text?.trim(),
      backgroundColor,
      backgroundGradient,
      borderColor,
      textColor,
      active: active ?? true
    });
    if (!result.ok) {
      return res.status(500).json({
        error: 'Failed to create notification',
        reason: result.reason,
        detail: result.detail,
        code: result.code
      });
    }
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { text, backgroundColor, backgroundGradient, borderColor, textColor, active } = req.body || {};
    const validation = validateNotification({ text, backgroundColor, backgroundGradient, borderColor, textColor, active });
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }
    const result = await updateNotification(id, {
      ...(text !== undefined ? { text: text.trim() } : {}),
      ...(backgroundColor !== undefined ? { backgroundColor } : {}),
      ...(backgroundGradient !== undefined ? { backgroundGradient } : {}),
      ...(borderColor !== undefined ? { borderColor } : {}),
      ...(textColor !== undefined ? { textColor } : {}),
      ...(active !== undefined ? { active } : {})
    });
    if (!result.ok) {
      return res.status(500).json({
        error: 'Failed to update notification',
        reason: result.reason,
        detail: result.detail,
        code: result.code
      });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const result = await deleteNotification(id);
    if (!result.ok) {
      return res.status(500).json({
        error: 'Failed to delete notification',
        reason: result.reason,
        detail: result.detail,
        code: result.code
      });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
