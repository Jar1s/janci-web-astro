## Learned User Preferences

- Prefers Slovak for on-site copy and most change requests for this project.
- Often asks to push completed work to GitHub on `main`; local editor tooling (e.g. `.cursor/`) is usually left out of commits.

## Learned Workspace Facts

- `Hero.astro` uses `subtitle` (not `description`) for hero subtext; optional `secondaryText` and `secondaryHref` render a second CTA.
- Hero videos live under `public/images/` (served as `/images/...`). Defaults: `/images/main.mp4`; overrides e.g. `/images/sluzby.mp4` (EK/KO/TK), `/images/kontakt.mp4`, `/images/Recenzie.mp4` (filename casing matters on Linux); O nás uses `/images/O%20NAS.mp4` for a space in the filename.
- Minimal hero (video only, no overlays or stats): `showTitle={false}`, `showSubtitle={false}`, `showCta={false}`, `showDecorations={false}`, `stats={[]}`, plus an `sr-only` page heading where needed for accessibility.
- Hero background `<video>` uses `preload="metadata"` (not `auto`) to avoid pulling full MP4 bytes immediately; `MainLayout.astro` loads site scripts with `defer` so parsing is not blocked.
- Avoid hiding `.hero-video` with `opacity: 0` until JS “reveal” — if the script fails or races, the video can stay invisible; keep the element visible and use a dark `.hero` background plus optional `poster` only when it matches the clip.
- Re-encode large hero MP4s for web (e.g. `ffmpeg` H.264, `crf` ~27, max width 1920, no audio for muted loops, `+faststart`); commit optimized assets so deploys stay fast.
- Git remote `origin` points at `github.com/Jar1s/janci-web-astro`; default integration branch is `main`.
