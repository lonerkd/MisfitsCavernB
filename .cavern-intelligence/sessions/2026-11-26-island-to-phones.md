# The island is the phone's surface — Nov 26, 2026

Owner's call (Nov 26 2026): the island is the one surface at every size. It
already existed on desktop and in phone landscape; under 760px the dock hid
and a separate tab-bar pill took over. Now, where island_v2 is on (production:
admins — the owner is trying it first), a narrow touch device gets the
compact dock instead of the pill.

- `lib/island/compact.ts`: narrow + island_v2 → 'compact-dock' whatever the
  pointer; the pill remains only where the flag is off. Test updated.
- Capture moved with the surface: the island's main row carries the pill's
  round Capture button (accent dress, outbox waiting badge) on the compact
  dock, opening the same CaptureSheet; the share-sheet / home-screen
  shortcut handling (open Capture once with what was shared) moved from
  MobileTabBar into EcosystemTaskbar, gated to the compact surface.
- Fit, both orientations (owner's landscape shot, Nov 26 2026: the bell, the
  profile and Sign Out slid past the bar's end): on the compact dock the Caps
  hints row and key badges go away, the deck wraps instead of clipping, and
  titles/activity text truncate; at ≤1000px the same truncation applies to
  the full dock's activity and context fields.
- `e2e/mobile.spec.ts`: the phone journeys drive the island now (deck for the
  suite + project switcher, Capture from the island); the desk test is
  unchanged. The nightly local-stack run is this spec's proof.

Not in this PR (island-to-phones IP3): retiring MobileTabBar outright for
flag-off users, and the answer-bar/swipe field-stepping typing mode (IP4).
The island now also shows in the phone editor (the pill never did) — the
owner's phone after deploy is the check for that surface.

Verified locally: typecheck clean, eslint clean, compact + MobileTabBar
suites 6/6. Not verified: a real phone — the flag is admins-only in
production, so the owner's phone is the trial, as the flag intends.
