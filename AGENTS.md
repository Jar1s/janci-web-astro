## Learned User Preferences

- Prefers Slovak for on-site copy and most change requests for this project.
- Often asks to push completed work to GitHub on `main`; local editor tooling (e.g. `.cursor/`) is usually left out of commits.

## Learned Workspace Facts

- `Hero.astro` uses `subtitle` (not `description`) for hero subtext; optional `secondaryText` and `secondaryHref` render a second CTA.
- Hero videos live under `public/images/` (served as `/images/...`). Defaults: `/images/main.mp4`; overrides e.g. `/images/sluzby.mp4` (EK/KO/TK), `/images/kontakt.mp4`, `/images/Recenzie.mp4` (filename casing matters on Linux); O nás uses `/images/O%20NAS.mp4` for a space in the filename.
- Minimal hero (video only, no overlays or stats): `showTitle={false}`, `showSubtitle={false}`, `showCta={false}`, `showDecorations={false}`, `stats={[]}`, plus an `sr-only` page heading where needed for accessibility.
- Git remote `origin` points at `github.com/Jar1s/janci-web-astro`; default integration branch is `main`.
