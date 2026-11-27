# 2026-11-26 — Two dials for the film grain

The owner asked for sliders: how much grain, and how fast it moves.

The grain over everything was two numbers baked into `GrainOverlay` —
opacity 0.025, a 0.5s cycle — with no way to touch them. Now they live in
`lib/ui/grain.ts`, a per-device preference in localStorage built exactly
like the island's size (`lib/island/scale.ts`): clamped reads and writes,
a window event, and defaults that are precisely the old look, so nobody's
screen changes until they go looking for the dials.

Settings › Appearance gains two rows under Island size. **Film grain** is
the amount: the slider runs the overlay's opacity from 0 (gone) to 0.08
(full strength), shown as a percentage. **Film grain speed** is a
multiplier on the stock cadence — 1x is the 0.5s cycle as it always was,
0.25x slows it to a 2s drift, 3x runs it frantic at about 0.17s, still in
steps(6). Both answer as you drag: the overlay subscribes to the change
event and the storage event, like the island answers its size slider.

The `.grain-overlay` class in globals.css (unused by any page today, but
the same idea) now reads the same two dials through CSS variables the
component publishes on :root, with its own old values as fallbacks — one
set of dials, whichever surface renders the grain.

No database changes. `lib/ui/grain.test.ts` covers the clamps, the
speed-to-cycle mapping, the defaults matching the shipped look, and the
write/read/event round-trip.
