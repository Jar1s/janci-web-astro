import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

const supabaseKey = serviceRoleKey || anonKey;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export function hasSupabase() {
  return Boolean(supabase);
}

export function hasServiceRole() {
  return Boolean(serviceRoleKey);
}

export function envSummary() {
  return {
    url: supabaseUrl ? 'set' : 'missing',
    serviceRoleKey: serviceRoleKey ? 'set' : 'missing',
    anonKey: anonKey ? 'set' : 'missing'
  };
}
