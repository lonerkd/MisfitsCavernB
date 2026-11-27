# Cavern game G1: a clean screen

Owner, Nov 26, 2026: "make this game actually playable … and remove
all the stuff on the screen not necessary like the beat related
stuff." First slice of CAVERN-GAME-UPGRADE (G1): the screen stops
narrating itself.

## What changed (`components/shell/CavernVisualizer.tsx`)

- The whole status block is gone from the full-screen cave: the
  distance tally, "You are steering / Exploring on its own", the
  hearing line, and the `describeSync` paragraph — plus the "Listen
  to the music" button that lived with them.
- The live-capture plumbing leaves the visualizer with the button:
  no capture state, no beat tracker, no level reads. The cave runs
  exactly as it did by default (capture was opt-in and off): seeded
  from the song, lit by the cover, paced by the journey. `lib/cavern/
  capture.ts` and `audio.ts` stay in the library — G4 brings the beat
  back from the playing track's own grid, with capture returning as
  a Player-settings opt-in, off the canvas.
- `describeSync` stays in `lib/cavern/journey.ts` as an internal
  (its lib tests stand); nothing renders its prose anymore.
- What remains on screen: the cave, the figure, the corner window
  controls (fullscreen / minimise / close), and the player strip.
  The corner (mini) window is untouched, tally included — that tally
  is the mini's own label, not canvas narration.
- The dead `.depth` / `.listen` styles left the CSS module with the
  block they dressed.

## Tests

`CavernVisualizer.test.tsx`: the sync-level test now asserts the
clean screen (no narration strings, no Listen button, close + player
present); the steering test asserts the keys steer and nothing is
said about it; the "listening to the music" describe is removed with
the feature it tested (it returns, tested at its new home, in G4).
These are the owner's ordered removals, not weakened assertions —
the replacement tests pin the absence.

## Verified

Locally: the visualizer + scene + cavern lib suites (82 tests),
eslint clean, typecheck clean. The feel of the clean cave is the
owner's eye after deploy.
