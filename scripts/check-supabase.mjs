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
    // optional
  }
}

loadEnv();

const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Chýbajú premenné v .env:', missing.join(', '));
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

const tables = ['statistics', 'notifications', 'partners', 'reviews'];
let allOk = true;

for (const table of tables) {
  const { ok, status, json } = await restGet(`${table}?select=id&limit=1`);
  if (ok) {
    console.log(`✓ ${table}`);
  } else {
    allOk = false;
    console.error(`✗ ${table}:`, json?.message || `HTTP ${status}`);
    if (/does not exist|PGRST205/i.test(String(json?.message))) {
      console.error('  → Spusti supabase/schema.sql v SQL Editore.');
    }
  }
}

console.log(allOk ? '\nSupabase pripojené.' : '\nOprav chyby vyššie.');
process.exit(allOk ? 0 : 1);
