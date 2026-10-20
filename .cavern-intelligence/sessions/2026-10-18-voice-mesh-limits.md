# Session — 2026-10-18: the voice mesh at ten people

**Found:** with ten simulated people, two who join in the same instant each offer the other (glare) and neither link completes; an offer arriving while our own `dial` was mid-flight made `setLocalDescription` throw and the link was closed; a `failed` connection was closed and never redialed, leaving "connecting…" forever; past ~8 people nothing told anyone the mesh gets heavy.

**Changed:** `lib/webrtc/voice.ts` — glare tie-break (lower user id keeps its offer, higher answers), `dial` stands down when the other side's offer is already in, offer/answer errors close that one link instead of throwing, a failed link is redialed by the lower id up to `MAX_REDIALS` (2) then reported `failed`; `MESH_COMFORT_LIMIT` (8), `meshCost(n)` and a `crowded` flag. `VoiceRoom.tsx` shows a notice when crowded and "couldn't connect" on a given-up peer. `lounge-and-audio.md` says why 8 and records glare, drops and the tests.

**Tests:** `lib/webrtc/voice.test.tsx` — the real hook for 10 people against an in-memory Realtime hub and a fake `RTCPeerConnection` that enforces offer/answer state: sequential joins (45 offers, one per pair), simultaneous joins, late/out-of-order delivery (3 seeds), a peer leaving, a link redialed, a link given up on. The glare test fails with the tie-break removed.

**Verified:** typecheck, lint (0 warnings), 1017 unit tests, production build. **Not verified:** real audio — jsdom has no media pipeline, so degradation at 9+ people is modelled (`meshCost`) and warned about, not measured; no run against real browsers or networks. 8 is a rule of thumb, not a measurement.
