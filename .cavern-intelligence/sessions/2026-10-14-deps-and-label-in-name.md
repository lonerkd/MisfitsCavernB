# Session — 2026-10-14: the four Dependabot groups, and the accessible names they exposed

**Dependencies (PRs #222–#225, applied together because their lockfiles conflict):** next and eslint-config-next 16.3 → 16.4.0; supabase CLI 2.119 → 2.120; @playwright/test 1.63 → 1.64 and axe-core 4.13 → 4.14; @supabase/supabase-js 2.105 → 2.117.3, jsdom, postcss, prettier (patch).

**What axe-core 4.14 found:** its stricter "label in name" rule (WCAG 2.5.3) flagged controls whose visible text was not in their accessible name — real issues for voice-control users. Fixed: the island's handle (name now includes the page, status and lead figure; spaces between its parts), the project phase rail (`PRE 0/5, Pre-Production: …`), the Studio's "In script" button, the Lounge's suggested channels, the phone pill. E2E specs that looked these up by name are updated (`brief`, `split`).

**Needed on this machine:** Playwright 1.64 wants a newer browser build — `npx playwright install chromium`.

**Verified:** typecheck, lint (0 errors, 0 warnings), 1007 unit tests, production build, and against the local stack: accessibility (every page), brief, split, mobile, island and the keyboard audit (0 findings) — 12 passed. **Not verified:** CI (Actions is blocked), screen readers.
