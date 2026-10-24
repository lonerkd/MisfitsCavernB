# Session — 2026-10-18: a voice room says "full" at eight instead of degrading (study:route-suite-lounge)

**Found:** the Lounge voice room is a full mesh with no limit — a 9th person made everyone open and carry 8 connections, with nothing telling anyone why audio went bad.

**Changed:** `lib/webrtc/mesh.ts` (new) — the cap (8) and the seat rule: the earliest eight by published `joinedAt`, ties by id, the same answer on every client. `lib/webrtc/voice.ts` — checks presence before opening any connection; publishes `joinedAt`; after publishing, re-checks seats (two people joining in the same instant both pass the first check, the later one loses here and again on every later presence sync); offers go only to seated people; `onFull` is called once and the session is torn down by the hook itself (mic, peers, channel); returns `live`. `components/lounge/VoiceRoom.tsx` — error toast and a persistent "room is full" line (`role="alert"`) in place of "Live"; shows "Connecting…" until a seat is held, so "Live" never flashes for someone who is then turned away.

**Verified:** `lib/webrtc/mesh.test.ts` (seat rules) and `lib/webrtc/voice.test.tsx` — drives `useVoiceRoom` against a fake Realtime channel and fake `RTCPeerConnection`: 8th person joins and offers to seven; 9th is turned away with zero connections, mic stopped and channel removed; the same-instant race (loser leaves, earlier keeps the seat and sends no offer to the rival); losing the seat on a later presence sync. Mutating the cap to 80 fails the seat tests. Typecheck, lint, tests, build: see PR.

**Not verified:** two real browsers (WebRTC and Realtime are faked in the test; the e2e suite has no multi-browser voice spec). Seat order trusts each client's clock; a badly skewed clock can win or lose a tie unfairly (the cap itself still holds). People already in a room on an old client publish no `joinedAt` and count as the oldest. The mic permission prompt still appears before a full room turns someone away.

**Open:** BACKLOG 3.24 — an SFU for rooms beyond eight.
