# 2026-11-22 — the Sound button matches the others, one popover at a time

**What.** The owner's screenshot showed Notifications and the Sound player open at once, and the Sound button as a green ring disc unlike its neighbours.
- `GlobalAudioWidget` now uses the island's shared `.btn` in a `.slot` (same size, radius, stroke, hover, focus and open state, the shared tooltip); playing shows as the small green dot the project button also uses. Label is "Sound" / "Sound, playing"; "Connect Spotify" is unchanged.
- New `lib/island/popover.ts` (`useIslandPopover`): one popover at a time via a `window` event, Escape and press-outside close, Escape returns focus to the button. Used by Notifications, Sound and the project switcher. No central state. The live-activity chip lives inside the island and was never overlapped by these popovers (they sit above it, capped by `--island-room`), so nothing else changed.

**Ran.** `npm run typecheck` clean; eslint on the changed files clean; `npx vitest run components lib` 3434 passed. New `e2e/island-one-popover.spec.ts` (Sound button size and radius equal the project button's; Notifications then Sound leaves one popover; Escape closes and focuses the button) plus `island-back-popovers.spec.ts`, via `run-e2e-in.sh`.

**Not verified.** Not looked at by eye in the browser; a real Spotify connection (the spec fakes a stored token with Spotify's network blocked); the phone pill (untouched).

Budget: /studio and /projects/[id]/pitch each raised by 1 kB for the shared popover hook (a few hundred bytes on the island's shared chunk).
