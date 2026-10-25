# Session — 2026-10-25: Lounge L0 — the page split into parts

**Changed:** `app/(suite)/lounge/page.tsx` 927 → 110 lines (layout only). New in
`components/lounge/`: `useLounge.ts` (every state, effect, Realtime subscription
and handler, moved verbatim — checked line for line against the old page),
`LoungeTopBar`, `ChannelRail`, `ChatHeader`, `MessagePane`, `Composer`,
`CrewList`, `ThreadPanel` (each takes the hook's result as `l`; markup moved
verbatim, checked line for line). One added line: `ThreadPanel` returns null
without a thread (the page already only renders it with one). No behaviour change.

**Verified:** `npm run typecheck` clean; `npm run lint` 0 errors (1 old warning);
`npm run test` 1551 passed; `npm run build` succeeds (Next.js 16.4.0 prints a
known-vulnerability warning and continues — BACKLOG 3.29; one earlier run in the
container stopped on it, a rerun built). CI green; Vercel preview built.
**Not verified:** `e2e/lounge.spec.ts` (runs nightly) and a click-through.

**Docs:** `bible/06-lounge-and-sound.md` file list; plan L0 ✅; BACKLOG 3.28.
