# Session — 2026-11-15: voice seats ordered by the server's clock (BACKLOG 3.24b)

**Found:** the 9th-joiner rule used each client's `Date.now()` as `joinedAt`, so a laptop with a slow clock always looked earliest and two clients could disagree who was refused only in the sense that the order was unfair (the cap itself held).

**Changed:** `app/api/time/route.ts` (new, public, `{ now }`, no-store) is the server's clock. `lib/webrtc/serverClock.ts` (new, pure parts unit-tested): `clockOffset` (server time minus the round trip's midpoint), `bestOffset` (shortest of up to three samples), `serverTime`, and `fetchServerOffset` (never throws: offline or slow gives offset 0, the old behaviour). `lib/webrtc/voice.ts` starts the fetch alongside the microphone prompt and publishes `joinedAt = serverTime(offset)`. No migration. Chosen over the Supabase REST `Date` header (not readable cross origin without an exposed header, one-second resolution) and over presence metadata (carries no timestamp).

**Verified:** `serverClock.test.ts` (midpoint, best sample, two clients with a two-minute skew agree on the order once corrected and disagree uncorrected, fetch success and failure); existing `voice.test.tsx` and `mesh.test.ts` unchanged. Typecheck, lint, tests, build, bible, sync-intel: see PR.

**Not verified:** two real browsers with a skewed clock (no e2e); the order is accurate to about half a round trip, so joins within that window are still settled by id, which every client computes identically. If `/api/time` is unreachable a client falls back to its own clock.
