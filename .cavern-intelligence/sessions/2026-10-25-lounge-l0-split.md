# Session — 2026-10-25: Lounge L0 — the page split into parts

**Changed:** `app/(suite)/lounge/page.tsx` 927 → 110 lines (layout only). New in
`components/lounge/`: `useLounge.ts` (every state, effect, Realtime subscription
and handler, moved verbatim — checked line for line against the old page),
`LoungeTopBar`, `ChannelRail`, `ChatHeader`, `MessagePane`, `Composer`,
`CrewList`, `ThreadPanel` (each takes the hook's result as `l`; markup moved
verbatim, checked line for line). One added line: `ThreadPanel` returns null
without a thread (the page already only renders it with one). No behaviour change.

**Verified:** `npm run typecheck` clean; `npm run lint` 0 errors (1 old warning);
`npm run test` 1551 passed. **Not verified:** `npm run build` — Next.js 16.4.0
now refuses to build (`SecurityFatalError`: a known vulnerability in this Next
version; same on `main`, not this change) — upgrade Next.js (new BACKLOG item).
`e2e/lounge.spec.ts` not run here.

**Docs:** `bible/06-lounge-and-sound.md` file list; plan L0 ✅; BACKLOG 3.28.
