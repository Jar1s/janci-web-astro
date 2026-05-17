import { loadSupabase } from './deps.js';

export default async function handler(req, res) {
  const { envSummary, hasSupabase, hasServiceRole } = await loadSupabase();
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'ok',
    supabase: {
      initialized: hasSupabase(),
      serviceRole: hasServiceRole(),
      env: envSummary()
    },
    timestamp: new Date().toISOString()
  });
}
