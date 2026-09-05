#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Kontrola Vercel CLI…"
if ! vercel whoami >/dev/null 2>&1; then
  echo "Nie si prihlásený. Spusti: vercel login"
  exit 1
fi

echo "→ Prepojenie s projektom janci-web-astro…"
vercel link --yes --project janci-web-astro

echo "→ Nahratie env z .env na Vercel (production)…"
for key in ADMIN_PASSWORD SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY GOOGLE_PLACES_API_KEY GOOGLE_PLACE_ID; do
  val="$(grep -E "^${key}=" .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' || true)"
  if [[ -n "${val}" ]]; then
    printf '%s' "$val" | vercel env add "$key" production --force >/dev/null 2>&1 || \
      printf '%s' "$val" | vercel env add "$key" production >/dev/null 2>&1 || true
    echo "  ✓ $key"
  else
    echo "  ○ $key (prázdne v .env, preskočené)"
  fi
done

echo "→ Deploy na production…"
vercel deploy --prod

echo ""
echo "Hotovo. Over: https://janci-web-astro.vercel.app/api/health"
echo "Doménu www.kontrolavozidiel.sk nastav v Vercel → Settings → Domains (DNS u registrátora)."
