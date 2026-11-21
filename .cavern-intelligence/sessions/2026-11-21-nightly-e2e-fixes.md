# 2026-11-21 — nightly e2e fixes (issue #658)

Six specs failed in nightly run 44900810588. Each was reproduced alone on the local stack (production build of `main`, `db:reset`), then fixed in the spec; no app code changed. No test was skipped or retried away.

| Spec | Cause | Fix |
|---|---|---|
| `themes.spec.ts:77` | Stale: System in a dark device resolves to `misfit` (`DEFAULT_THEME_ID`), not `default`. | Expect `misfit`; title renamed. |
| `ad-export.spec.ts:39` | Stale: the PDF button became "Print / PDF" through the print kit (`printDocument`, a hidden iframe and the print dialog), so no download ever fires (2 min timeout). | Click "Print / PDF" and assert the printable document handed to the frame (captured by a MutationObserver) holds the copy. Text downloads unchanged. |
| `breakdown.spec.ts:57` | Stale: `$85` now also shows in the story-day cost strip (strict-mode violation). | Scope to the panel's "Est. cost" total. |
| `story-interview.spec.ts:22` | Stale: "already in the script" matches the help paragraph and the toast. | Match the toast's full sentence. |
| `records-links.spec.ts:63` | "Sc 1" chip appears in the form and the saved row (strict mode); passed on retry only. | Scope to the list item. |
| `lounge.spec.ts:51` | axe `label-content-name-mismatch` on a channel row's unread count; already gone on `main` after the Lounge redesign (count is `aria-hidden`). | None needed; passes repeatedly. |

Verified: production build against the local stack; the six specs, alone (`--workers=1`) first and then `--repeat-each=2` in one combined run: 20 of 20 passed. `npx tsc --noEmit` and eslint on the five changed specs: clean. No unit area touched. Not verified: the print dialog itself (headless Chromium).
