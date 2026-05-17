## Learned User Preferences

- Prefers Slovak for on-site copy and most change requests for this project.
- Often asks to push completed work to GitHub on `main`; `.cursor/` is ignored via `.gitignore` and should stay out of commits.
- Never commit `.env` or other secret files; use `.env.example` for templates only.

## Learned Workspace Facts

- `Hero.astro` uses `subtitle` (not `description`) for hero subtext; optional `secondaryText` and `secondaryHref` render a second CTA.
- Hero videos live under `public/images/` (served as `/images/...`). Defaults: `/images/main.mp4`; overrides e.g. `/images/sluzby.mp4` (EK/KO/TK), `/images/kontakt.mp4`, `/images/Recenzie.mp4` (filename casing matters on Linux); O nás uses `/images/O%20NAS.mp4` for a space in the filename.
- Minimal hero (video only, no overlays or stats): `showTitle={false}`, `showSubtitle={false}`, `showCta={false}`, `showDecorations={false}`, `stats={[]}`, plus an `sr-only` page heading where needed for accessibility.
- Hero background `<video>` uses `preload="metadata"` (not `auto`) to avoid pulling full MP4 bytes immediately; `MainLayout.astro` loads site scripts with `defer` so parsing is not blocked.
- Avoid hiding `.hero-video` with `opacity: 0` until JS “reveal” — if the script fails or races, the video can stay invisible; keep the element visible and use a dark `.hero` background plus optional `poster` only when it matches the clip.
- Re-encode large hero MP4s for web (e.g. `ffmpeg` H.264, `crf` ~27, max width 1920, no audio for muted loops, `+faststart`); commit optimized assets so deploys stay fast.
- Homepage “Výhody u nás” cards use custom PNGs in `public/images/` referenced from `src/pages/index.astro` (`odvoz-dovoz.png`, `prideme-pre-vozidlo.png`, `nonstop-nakladne-vozidla.png`, `pozicanie-spz.png`, `nabijacka.png`).
- Git remote `origin` points at `github.com/Jar1s/janci-web-astro`; default integration branch is `main`.
- Canonical site is `https://www.kontrolavozidiel.sk` (`astro.config.mjs`); live static site is on IIS—pushing `main` updates GitHub/Vercel, not IIS until separately deployed there.
- Serverless admin API runs on Vercel project `janci-web-astro` (`janci-web-astro.vercel.app`); `/api/*` routes are not served from IIS on `kontrolavozidiel.sk` unless DNS/proxy points there.
- Supabase admin data: `lib/kv.js` + `lib/supabase.js` (PostgREST via `fetch`, not `@supabase/supabase-js` in API—import can hang in Node 20); mirror copies under `public/lib/`. Run `supabase/schema.sql` in Supabase SQL Editor. Local checks: `bun run db:check`; API dev: `bun run dev:api`. Setup scripts: `scripts/vercel-connect.sh`, `scripts/link-supabase-vercel.sh`.
- `AnnouncementBar` is wired only on the homepage (`src/pages/index.astro`); it loads active items from `/api/notifications`.
