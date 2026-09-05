#!/usr/bin/env bash
# Prepojí Supabase → Vercel pre projekt janci-web-astro.
# Pred spustením: vercel login + vyplnený .env (Supabase kľúče z dashboardu).
set -euo pipefail
cd "$(dirname "$0")/.."

missing=()
for key in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  val="$(grep -E "^${key}=" .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' || true)"
  [[ -z "${val}" ]] && missing+=("$key")
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "V .env chýbajú: ${missing[*]}"
  echo ""
  echo "1) https://supabase.com/dashboard → New project (alebo otvor existujúci)"
  echo "2) SQL Editor → spusti celý súbor supabase/schema.sql"
  echo "3) Project Settings → API → skopíruj URL, anon key, service_role key do .env"
  echo "4) Spusti znova: ./scripts/link-supabase-vercel.sh"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Nie si prihlásený do Vercel. Spusti: vercel login"
  exit 1
fi

echo "→ Lokálny test Supabase…"
node scripts/check-supabase.mjs || { echo "Oprav Supabase (schema / kľúče) pred uploadom na Vercel."; exit 1; }

echo "→ Prepojenie Vercel projektu…"
vercel link --yes --project janci-web-astro 2>/dev/null || vercel link --project janci-web-astro

echo "→ Env premenné na Vercel (production + preview)…"
for env in production preview; do
  for key in ADMIN_PASSWORD SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY GOOGLE_PLACES_API_KEY GOOGLE_PLACE_ID; do
    val="$(grep -E "^${key}=" .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' || true)"
    [[ -z "${val}" ]] && continue
    printf '%s' "$val" | vercel env add "$key" "$env" --force 2>/dev/null || \
      printf '%s' "$val" | vercel env add "$key" "$env" 2>/dev/null || true
    echo "  ✓ $key ($env)"
  done
done

echo "→ Production deploy…"
vercel deploy --prod

echo ""
echo "Hotovo. Skontroluj:"
echo "  curl -s https://janci-web-astro.vercel.app/api/health | head -c 300"
echo ""
echo "Očakávané: supabase.initialized=true, serviceRole=true"
