## Learned User Preferences

- Prefers Slovak for on-site copy and most change requests for this project.
- Often asks to push completed work to GitHub on `main`; `.cursor/` is ignored via `.gitignore` and should stay out of commits.

## Learned Workspace Facts

- `Hero.astro` uses `subtitle` (not `description`) for hero subtext; optional `secondaryText` and `secondaryHref` render a second CTA.
- Hero videos live under `public/images/` (served as `/images/...`). Defaults: `/images/main.mp4`; overrides e.g. `/images/sluzby.mp4` (EK/KO/TK), `/images/kontakt.mp4`, `/images/Recenzie.mp4` (filename casing matters on Linux); O nás uses `/images/O%20NAS.mp4` for a space in the filename.
- Minimal hero (video only, no overlays or stats): `showTitle={false}`, `showSubtitle={false}`, `showCta={false}`, `showDecorations={false}`, `stats={[]}`, plus an `sr-only` page heading where needed for accessibility.
- Hero background `<video>` uses `preload="metadata"` (not `auto`) to avoid pulling full MP4 bytes immediately; `MainLayout.astro` loads site scripts with `defer` so parsing is not blocked.
- Avoid hiding `.hero-video` with `opacity: 0` until JS “reveal” — if the script fails or races, the video can stay invisible; keep the element visible and use a dark `.hero` background plus optional `poster` only when it matches the clip.
- Re-encode large hero MP4s for web (e.g. `ffmpeg` H.264, `crf` ~27, max width 1920, no audio for muted loops, `+faststart`); commit optimized assets so deploys stay fast.
- Homepage “Výhody u nás” advantage cards use custom PNGs under `public/images/` referenced inline in `src/pages/index.astro` (e.g. `odvoz-dovoz.png`, `prideme-pre-vozidlo.png`, `nonstop-nakladne-vozidla.png`, `pozicanie-spz.png`).
- Canonical site URL is `https://www.kontrolavozidiel.sk` (`astro.config.mjs` `site`); `www.kontrolavozidiel.sk` is served by Microsoft IIS/ASP.NET, so pushing `main` updates GitHub/Vercel but the live domain needs a separate IIS deploy or DNS cutover to Vercel.
- Backend data uses Supabase via `lib/kv.js` when `SUPABASE_*` env vars are set; schema lives in `supabase/schema.sql`; verify locally with `bun run db:check`; run API routes locally with `bun run dev:api` (`vercel dev`).
- `AnnouncementBar` is wired only on the homepage (`index.astro` `slot="announcement"`) and loads active items from `/api/notifications`.
- Git remote `origin` points at `github.com/Jar1s/janci-web-astro`; default integration branch is `main`.
