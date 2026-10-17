# 2026-10-16-workflow-dashboard

## What changed
Reworked the suite's working dashboard (`app/(suite)/page.tsx`) into a
workflow-logical hub: stage rail (Write · Organize · Crew · Showcase · Launch)
on top, then a live "What needs your attention" action panel — each stage has
its next action (in-progress script → ScriptOS, open roles → crew board and
jobs, published work → portfolio, Lounge unread), so a returning creator lands
on the next thing to do instead of a wall of tables. Resume band, pipeline
rail, platform stats, ticker and module tiles are preserved; only the order
and the action layer changed.

## What verified
- `tsc --noEmit` passes (exit 0).
- `npm run lint` passes (0 errors, 0 warnings).
- `npm run build` was not run (no local dev stack; visual QA pending).

## Repair (2026-10-17)
`panelfix.js` (a scratch QA helper) ran multiple times and stripped closing
parens from eight places beyond its intended target, breaking the file.
Fixed: the doubled `{/* */}` comment header, the loggedIn section's extra
`)`, the naked `LIVE STATS` text fragment, eight `.map(...)` and function-call
closers (lines 58–60, 73–75, 85, 284, 372, 395), and the traffic-light
`.map` at line 429. Also: `unread`/`messages` variable references in the
"Together" card corrected to `live.messages`; `jobsRes` corrected from
`.data` to direct array (matches `listOpenJobTitles` return type). Scratch
files `scripts/panelfix.js`, `scripts/fix2.js`, `app/(suite)/page.tsx.bak`
left untracked and gitignored.

## What did not verify
- Visual layout in a real browser (would need a local Supabase stack, which
  the repo documents via `npm run stack:up`).
- Realtime subscription behavior (Lounge unread count) — frame-only change.

## What's next
- Visual QA on a local stack (`npm run stack:up`).
- BACKLOG: the activity feed (`lib/activity`) is the known gap (only some
  kinds of change are shown) — extend it to back the dashboard's "needs
  attention" signals.
