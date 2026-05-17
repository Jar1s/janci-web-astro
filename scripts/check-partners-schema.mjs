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

if (!baseUrl || !serviceKey) {
  console.error('Chýba SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY v .env');
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`
};

const res = await fetch(`${baseUrl}/rest/v1/partners?select=id,category&limit=1`, { headers });
const body = await res.json();

if (res.ok) {
  console.log('✓ Stĺpec partners.category existuje.');
  process.exit(0);
}

const msg = body?.message || JSON.stringify(body);
if (/category|PGRST204/i.test(msg)) {
  console.error('✗ Stĺpec partners.category v databáze chýba.');
  console.error('');
  console.error('Postup:');
  console.error('1. Supabase Dashboard → SQL Editor → New query');
  console.error('2. Skopíruj a spusti: supabase/migrations/20260517_partner_category.sql');
  console.error('3. Počkaj pár sekúnd (migrácia obsahuje NOTIFY pre reload cache)');
  console.error('4. Skús znova uložiť partnera v admin');
  process.exit(1);
}

console.error('✗ Neočakávaná chyba:', msg);
process.exit(1);
