import { supabase, hasSupabase, hasServiceRole } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { getCorsHeaders, handleCorsPreflight } from '../../lib/cors.js';

const BUCKET = 'partners';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function ensureBucket() {
  const { data: bucket, error } = await supabase.storage.getBucket(BUCKET);
  if (bucket && !error) return;
  await supabase.storage.createBucket(BUCKET, { public: true });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb'
    }
  }
};

export default async function handler(req, res) {
  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  if (!requireAdmin(req, res)) return;
  if (!hasSupabase() || !hasServiceRole()) {
    return res.status(500).json({ error: 'Missing Supabase service role' });
  }

  const { fileName, fileType, dataBase64 } = req.body || {};
  if (!fileName || !dataBase64) {
    return res.status(400).json({ error: 'fileName and dataBase64 are required' });
  }

  try {
    const base64 = dataBase64.replace(/^data:.*;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'File too large (max 5MB)' });
    }

    await ensureBucket();

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase
      .storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: fileType || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Upload failed', detail: uploadError.message });
    }

    const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return res.status(200).json({ url: publicUrl.publicUrl });
  } catch (err) {
    console.error('Upload exception:', err);
    return res.status(500).json({ error: 'Upload exception', detail: err.message });
  }
}
