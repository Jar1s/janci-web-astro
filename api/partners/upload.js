import { loadAuthCors, loadSupabase } from '../deps.js';

const BUCKET = 'partners';
const MAX_SIZE = 5 * 1024 * 1024;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb'
    }
  }
};

export default async function handler(req, res) {
  const { requireAdmin, getCorsHeaders, handleCorsPreflight } = await loadAuthCors();
  const { hasSupabase, hasServiceRole, storageEnsureBucket, storageUpload } = await loadSupabase();

  const corsHeaders = getCorsHeaders(req.headers.origin);
  Object.keys(corsHeaders).forEach((key) => {
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

    const { error: bucketError } = await storageEnsureBucket(BUCKET, { public: true });
    if (bucketError) {
      console.error('Bucket error:', bucketError);
      return res.status(500).json({ error: 'Bucket setup failed', detail: bucketError.message });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}_${safeName}`;

    const { error: uploadError, publicUrl } = await storageUpload(
      BUCKET,
      path,
      buffer,
      fileType || 'application/octet-stream'
    );

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Upload failed', detail: uploadError.message });
    }

    return res.status(200).json({ url: publicUrl });
  } catch (err) {
    console.error('Upload exception:', err);
    return res.status(500).json({ error: 'Upload exception', detail: err.message });
  }
}
