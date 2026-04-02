import { envSummary, hasSupabase, hasServiceRole } from '../lib/supabase.js';

export default function handler(req, res) {
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
