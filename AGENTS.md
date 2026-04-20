## Learned User Preferences

- Prefers Slovak for on-site copy and most change requests for this project.
- Often asks to push completed work to GitHub on `main`; local editor tooling (e.g. `.cursor/`) is usually left out of commits.

## Learned Workspace Facts

- `Hero.astro` uses `subtitle` (not `description`) for hero subtext; optional `secondaryText` and `secondaryHref` render a second CTA.
- Default hero background video is `public/main.mp4` (`/main.mp4`); pages override with `videoSrc` (e.g. services `/sluzby.mp4`, contact `/kontakt.mp4`, reviews `/recenzie.mp4`; about uses `/images/O%20NAS.mp4` when the filename contains a space).
- Minimal hero (video only, no overlays or stats): `showTitle={false}`, `showSubtitle={false}`, `showCta={false}`, `showDecorations={false}`, `stats={[]}`, plus an `sr-only` page heading where needed for accessibility.
- Git remote `origin` points at `github.com/Jar1s/janci-web-astro`; default integration branch is `main`.
