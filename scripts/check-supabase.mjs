import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  const path = resolve(process.cwd(), '.env');
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const i = trimmed.indexOf('=');
      if (i === -1) continue;
      const key = trimmed.slice(0, i).trim();
      const value = trimmed.slice(i + 1).trim();
      if (value && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env optional when vars are exported in the shell
  }
}

loadEnv();

const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Chýbajú premenné v .env:', missing.join(', '));
  console.error('Skopíruj z Supabase Dashboard → Project Settings → API (service_role + Project URL).');
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`
};

async function restGet(path) {
  const res = await fetch(`${baseUrl}/rest/v1/${path}`, { headers });
  const body = await res.text();
  let json;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    json = { message: body };
  }
  return { ok: res.ok, status: res.status, json };
}

async function storageGet(path) {
  const res = await fetch(`${baseUrl}/storage/v1/${path}`, { headers });
  const body = await res.text();
  let json;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    json = { message: body };
  }
  return { ok: res.ok, status: res.status, json };
}

const tables = ['statistics', 'notifications', 'partners', 'reviews'];
let allOk = true;

for (const table of tables) {
  const { ok, status, json } = await restGet(`${table}?select=id&limit=1`);
  if (ok) {
    console.log(`✓ ${table}`);
    continue;
  }
  allOk = false;
  const msg = json?.message || json?.error || `HTTP ${status}`;
  console.error(`✗ ${table}:`, msg);
  if (status === 404 || /does not exist|PGRST205/i.test(String(msg))) {
    console.error('  → Spusti supabase/schema.sql v SQL Editore.');
  }
}

const bucket = await storageGet('bucket/partners');
if (bucket.ok) {
  console.log('✓ storage bucket partners');
} else if (bucket.status === 404) {
  console.log('○ storage bucket partners (vytvorí sa pri prvom upload-e)');
} else {
  allOk = false;
  console.error('✗ storage bucket partners:', bucket.json?.message || `HTTP ${bucket.status}`);
}

const stats = await restGet('statistics?select=id&id=eq.1');
if (stats.ok && Array.isArray(stats.json) && stats.json.length === 0) {
  console.warn('○ statistics id=1: žiadny riadok (schema insert možno nebežal)');
}

console.log(allOk ? '\nSupabase pripojené.' : '\nOprav chyby vyššie.');
process.exit(allOk ? 0 : 1);
