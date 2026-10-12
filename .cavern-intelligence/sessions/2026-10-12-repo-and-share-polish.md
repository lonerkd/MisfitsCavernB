# Session — 2026-10-12: the front door — README, contributing, share card

**Built:**
- `README.md` rewritten on brand: the mark, what the suite is, a quick start (hosted Supabase or the local stack), commands, the map, the licence.
- `CONTRIBUTING.md` (the rules that matter, the change cycle, how to report) and GitHub issue templates (bug, idea; security goes to the private advisory form).
- `.env.example` now lists every variable the app reads (Web Push, the Spotify redirect rule), each marked required or optional.
- `package.json` metadata (description, repository, homepage, `UNLICENSED`).
- Share previews: Open Graph and Twitter metadata, and a generated share card (`app/(suite)/opengraph-image.tsx`, landing only so share pages keep their own, the R13 mark on night ink); `/opengraph-image*` is public in `proxy.ts`.

**Verified:** typecheck, eslint, a production build; the card served as a 1200×630 PNG and looked right; the tags appear in the landing's HTML. **Not verified:** CI; how a real messenger renders the card (needs the deployed URL).

**Left:** a designer's redraw of the mark before investors (brand README); the domain.

**CI (owner: stop re-running 25 minutes of checks):** the `changes` job now decides per job — `database` only when the schema, the data layer, the integration tests, package files or workflows change; `e2e-local` (five shards) only when app, components, lib, public, e2e, supabase, config or workflows change; docs, templates and notes run `checks` only; a push to main runs the database tests but not the journeys (the PR already ran them). A change to the workflow itself runs everything.
