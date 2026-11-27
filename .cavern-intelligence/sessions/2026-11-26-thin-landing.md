# 2026-11-26 — Thin pages, third page: the landing page (restructure phase 7)

**Owner's queue (2026-11-26):** phase 7, one page per PR, the landing
page fourth in the owner's order (editor #771, Lounge already thin,
project hub #772). The page was 443 lines; it is 109 after this PR.
Moved verbatim; no behaviour changes.

**What moved out of `app/(suite)/page.tsx`:**

- `components/home/useHomeData.ts` — the page's whole data load: the
  public platform totals, who's hiring and what was just published, and
  for a signed-in person the live preview data (latest script lines,
  recent media, recent channel messages). `loggedIn` stays null until
  the session is known, so a signed-in person never sees the signed-out
  page flash by.
- `lib/supabase/portfolio.ts` gained `listRecentWork(limit)` — the page
  called `supabase.rpc('get_recent_work')` directly, the one
  grandfathered violation in its lint baseline (conventions §1: queries
  go through `lib/supabase/*`). The hook calls the wrapper now, so the
  page's suppressions entry is deleted outright — the baseline shrank
  again.
- `components/landing/Hero.tsx` — the cinematic hero: the mark, the
  tagline, the scroll cue, and the one call to action (Enter for a
  guest, your project for a signed-in person). The scroll fade values
  are computed in the page and passed in as motion values.
- `components/landing/StatsSection.tsx` — the live platform numbers:
  the pulsing skeleton while they load, then the real totals, with the
  Creators tile still hiding itself until the people total is worth
  showing, and nothing rendered when every total is zero.
- `components/landing/ModuleGrid.tsx` — the suite's four doors with
  their live previews; the phone's ModulePicker (dynamic import) moved
  in with it.
- `components/landing/ClosingCta.tsx` — the signed-out closing call:
  BEGIN YOUR FILM and the doors in.

**Still in the page:** the workflow pipeline strip (already components),
the stats ticker, the signed-in home mount and the footer — the
orchestrator layout, which is what a thin page is.

**Verified:** typecheck (app + e2e), lint on every touched file, the
full unit suite and a production build locally; `npm run sync-intel` no
drift; the bible inventory regenerated for the page's new size. New unit
tests (`StatsSection.test.tsx`, 4 tests; `ClosingCta.test.tsx`, 1 test)
pin the skeleton/loaded/empty states, the Creators tile rule and the
closing links. The landing page's live proof is the page itself in
production after merge, and the nightly e2e.
