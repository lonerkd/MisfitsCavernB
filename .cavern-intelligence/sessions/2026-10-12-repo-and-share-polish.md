# Session — 2026-10-12: the front door — README, contributing, share card

**Built:**
- `README.md` rewritten on brand: the mark, what the suite is, a quick start (hosted Supabase or the local stack), commands, the map, the licence.
- `CONTRIBUTING.md` (the rules that matter, the change cycle, how to report) and GitHub issue templates (bug, idea; security goes to the private advisory form).
- `.env.example` now lists every variable the app reads (Web Push, the Spotify redirect rule), each marked required or optional.
- `package.json` metadata (description, repository, homepage, `UNLICENSED`).
- Share previews: Open Graph and Twitter metadata, and a generated share card (`app/opengraph-image.tsx`, the R13 mark on night ink); `/opengraph-image` is public in `proxy.ts`.

**Verified:** typecheck, eslint, a production build; the card served as a 1200×630 PNG and looked right; the tags appear in the landing's HTML. **Not verified:** CI; how a real messenger renders the card (needs the deployed URL).

**Left:** a designer's redraw of the mark before investors (brand README); the domain.
