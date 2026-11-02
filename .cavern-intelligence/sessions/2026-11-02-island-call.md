# Session — 2026-11-02: the island holds a voice call, and the call outlives the Lounge page

**The catch.** A voice call lived inside the Lounge page's room component, so leaving the Lounge unmounted it and ended the call. An island activity for a call would have been a button that only existed on the page where the call already had its own buttons. So the real work was moving the call, then the island.

**The call moved up.** `lib/webrtc/VoiceCall.tsx`: `VoiceCallProvider` in the suite layout owns the one call (room, peers, mute, leave) and runs the existing `useVoiceRoom` hook above the pages. The Lounge's `VoiceRoom` is now a view of it for the channel on screen, with join, leave, mute, and "move here from #other" when you are in a call elsewhere (one call at a time; the status line says the call carries on while you use the rest of the suite). The call ends on sign-out or when another person signs in, and a full room ends it with the same message as before.

**The island.** `lib/island/callActivity.ts` (pure, tested) turns the call into an activity: "Joining #room…", then "In voice · #room" with "3 people · connecting… · muted", and **Mute / Unmute** and **Leave**; a microphone problem shows as an error with Leave. `useCallActivity` registers it from `EcosystemTaskbar`, so it shows on every page. Calls rank highest of the activities (`KIND_PRIORITY.call`), above a running sprint or a waiting queue.

**Verified:** 7 tests for the activity's wording and buttons, 9 for the provider (holds the call above the page and outlives a page unmounting; moves between rooms; leave; mute; sign-out and another person signing in end it; a full room ends it, remembers it and toasts; no call outside the provider). **A real browser** (`e2e/island-call.spec.ts`, local stack, Chromium's fake microphone): join a voice room in the Lounge, leave for Today through the island (client-side, never a reload), the island still reads "In voice · room · 1 person", Mute turns to Unmute and back, back in the Lounge the room shows LEAVE VOICE, and Leave from the island on another page ends it. 4 of 4 runs. I looked at the island in the call and muted states. Typecheck, lint, 1918 unit tests, build and bundle budget clean; the neighbouring island, Lounge and layout specs were run too.

**What the spec taught:** the navigation click can land while the island's deck is still sliding open and miss; a person clicks again, so the spec's navigation step now retries as a whole. Not a product fault (the first two of three navigations worked in the logged run).

**Not verified:** a second person in the room (the mesh itself is unchanged and covered by `voice.test.tsx`, and the e2e has one person); audio actually reaching someone (the e2e uses a fake microphone and cannot hear); a reload during a call (ends it, by design).

**Left (BACKLOG 4.1, 3.24):** who is speaking shown on the island, a "back to the room" control, a two-browser voice spec (3.24 d), the 9th-joiner spec.
