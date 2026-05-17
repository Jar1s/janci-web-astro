## Learned User Preferences

- Prefers Slovak for on-site copy and most change requests for this project.
- Often asks to push completed work to GitHub on `main`; `.cursor/` is ignored via `.gitignore` and should stay out of commits.
- Never commit `.env` or other secret files; use `.env.example` for templates only.

## Learned Workspace Facts

- `Hero.astro` uses `subtitle` (not `description`); optional `secondaryText`/`secondaryHref`; minimal hero: `showTitle={false}`, `showSubtitle={false}`, `showCta={false}`, `showDecorations={false}`, `stats={[]}` plus `sr-only` heading when needed.
- `.hero-bottom` stacks stats first, then partner marquee from `/api/partners` below them (not overlapping stat numbers).
- Dynamic homepage nodes (hero partners, reviews carousel) are inserted via JS/API — use `<style is:global>` under `#hero` / `#reviews`; Astro scoped CSS will not apply; override conflicting `original.css` rules in `enhancements.css`.
- Hero videos live under `public/images/` (served as `/images/...`). Defaults: `/images/main.mp4`; overrides e.g. `/images/sluzby.mp4`, `/images/kontakt.mp4`, `/images/Recenzie.mp4` (casing matters on Linux); O nás uses `/images/O%20NAS.mp4`. Use `<video preload="metadata">`; keep `.hero-video` visible (no `opacity: 0` until JS); dark `.hero` background; re-encode large MP4s (H.264, `crf` ~27, 1920w, no audio, `+faststart`).
- `MainLayout.astro` loads site scripts with `defer`; `#site-top` wraps header+announcement—on mobile (≤768px) one fixed stack (navbar + ticker), `--site-top-height` offsets `#main` (see `enhancements.css`).
- Homepage “Výhody u nás” cards use custom PNGs in `public/images/` from `src/pages/index.astro` (`odvoz-dovoz.png`, `prideme-pre-vozidlo.png`, `nonstop-nakladne-vozidla.png`, `pozicanie-spz.png`, `nabijacka.png`).
- Git remote `origin` → `github.com/Jar1s/janci-web-astro`; branch `main`. Canonical site `https://www.kontrolavozidiel.sk`; live static on IIS—pushing `main` updates GitHub/Vercel, not IIS until deployed there.
- Serverless admin API on Vercel `janci-web-astro`; `/api/*` not on IIS unless proxied. Use lazy `api/deps.js`, Node 20; do not duplicate handlers under `public/api/` (`ERR_INTERNAL_ASSERTION`). Admin probe: `api/auth.js` with `ADMIN_PASSWORD`.
- Supabase: `lib/kv.js` + `lib/supabase.js` (PostgREST `fetch`, not `@supabase/supabase-js`); mirror under `public/lib/` only. Run `supabase/schema.sql`; `bun run db:check`; `bun run dev:api`; scripts `scripts/vercel-connect.sh`, `scripts/link-supabase-vercel.sh`.
- Reviews: Supabase `reviews` via `/api/reviews`; public POST on `/recenzie` (pending approval); admin Recenzie tab with `btn-review` action buttons. Legacy archive in `lib/data/reviews-import.json` — `npm run reviews:scrape` from kontrolavozidiel.sk/recenzie/, `reviews:import` / `reviews:sync`, or admin `POST /api/reviews/import` (Importovať archív button); Google Places only if DB empty.
- `AnnouncementBar` only on homepage (`index.astro`), loads `/api/notifications`; ticker ~90–300s.
- `CookieConsent.astro` on mobile: compact bottom strip; avoid `flex: 1 1 400px` on `.cookie-text` in column layout.
