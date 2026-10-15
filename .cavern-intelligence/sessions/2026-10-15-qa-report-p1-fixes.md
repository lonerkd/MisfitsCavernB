# Session — 2026-10-15: four of the QA report's five P1s

Peter's Oct 15 QA report flagged 5 P1s. Fixed four; the fifth needs a
product decision, not code — see below.

**#1 co-writing sync was one-way.** The editor's sync is a broadcast
channel (`lib/scriptos/sync.ts`) with no delivery guarantee; `scripts` was
never added to the realtime publication, so a missed broadcast left the
other party stale until a refresh. Migration
`20261015071033_scripts_realtime_backup_sync.sql` adds it; `useScriptSync`
now also listens for `postgres_changes` UPDATE on its own script row as a
backup path, applying the remote content if the broadcast never arrived
(skips its own writes via `last_edited_by`).

**#2 editor header overflowed under ~1460px**, Share/Export off-screen,
tabbing into them jumped the whole page ~370px. The header's
`overflow-x: auto` was gated behind a `max-width: 820px` media query —
far narrower than the header's actual content width — so anywhere in that
gap had no overflow handling at all (clipped, and the browser's default
`scrollIntoView` fell back to scrolling the page instead of the header).
Made the header scrollable unconditionally (`app/globals.css`).

**#3 Paper/Editorial themes were unreadable in the editor** (dark page,
dark text, headings nearly invisible). `app/(suite)/editor/page.tsx`
hardcoded the writing column's background to `#050505`/`#000` regardless
of theme, while the text colors correctly followed theme tokens — so a
light theme's dark text landed on a background that never left near-black.
Now `var(--sunken)` / `var(--bg)`. Also fixed the caret color
(`WriteView.tsx`), hardcoded to a light gray invisible on a light page.

**#4 Tab after Enter inserted a scene heading instead of advancing to
Character.** `cycleLine` (`lib/scriptos/typing.ts`) treated *every* blank
line as "insert a scene" — including the ordinary blank line Enter leaves
you on after typing something. That was deliberate, tested behavior for a
blank line *between* existing content (quick scene insert in a gap) and
for a wholly blank script (start one with a template) — both still work
and are still tested. Narrowed it: a blank line is only "insert scene"
when there's more content after it, or the whole document is empty;
otherwise (the ordinary post-Enter case) it cycles types like any other
line, landing on Character first since blank lines parse as `action`.
Three tests in `typing.test.ts` now cover all three cases.

**#5 (design) the island's keyboard layer.** Investigated, not changed.
`kbActive` tracks `CapsLock` globally (`lib/os/PillContext.tsx`) and the
window keydown handler in `EcosystemTaskbar.tsx` doesn't gate on hover —
keyboard commands already work without hovering. What QA is actually
describing is the two-step gesture itself (hover to see the deck, CapsLock
to drive it) not reading as "a keyboard and mouse command layer" the way
the island's own description implies. That's an interaction-model
decision, not a bug to silently redesign — flagging for the owner rather
than guessing.

**Verified:** local `supabase db reset` + `npm run db:drift` (one new
object, the publication membership; fingerprint updated); typecheck,
lint, 1009 unit tests (2 new), full integration suite (56 files, 377 + 1
expected-fail), production build — all clean. **Not verified:** a live
multi-browser co-writing session (the realtime fix is code-level verified,
not watched live); the editor theme fix by eye in a running browser
(verified by tracing the exact CSS values, not a screenshot).

## Still open from the QA report

P2 (~25) and P3 (~10) items are untouched this session — the report lists
them individually; none addressed here. The P0 (crew permissions) and its
correction are in PR #230, separate from this one. The QA report's
cleanup checklist (deleting QA- prefixed test data) is the owner's to run,
not code.
