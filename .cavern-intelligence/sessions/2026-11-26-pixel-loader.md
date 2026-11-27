# 2026-11-26 — The pixel loader: the mark, a star on an orbit, every wait on brand

The owner's loader direction (Nov 26): the stamp as a spinning loader, the
star twinkling, the star spinning around the mountains, the 3D cavern for
the big waits — as a pixel-art loader.

`components/brand/PixelLoader.tsx` is the family in one component, built
from the Mark's own small cut with crisp edges:

- **orbit** (full waits): the star rides a stepped orbit around the peaks,
  twinkling as it goes.
- **twinkle** (beside a skeleton): the mark stands, the star twinkles in
  place.
- **spin** (inline): the stamp in an 8-frame stepped turn.

Every motion is stepped (`steps()` timing) — pixel feel is a timing choice
as much as a shape one. Theme tokens only; `prefers-reduced-motion` stands
it still; the wrapper is a named progressbar and the art is hidden from
assistive tech.

Swapped into all eleven loading surfaces: the generic ring spinners
(root, ScriptOS, Projects) are gone wholesale; the Lounge's pulse dot
became the twinkling mark over its skeleton; the skeleton screens (Crew,
Jobs, Portfolio, Settings, Profile, Studio, Soundtrack) keep their
skeletons and gain the twinkling mark above them. The boot screen (L2,
the 3D mark) is a later slice. No database changes.
