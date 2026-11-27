# 2026-11-24 — Overlaps redo (Muse takeover, owner's word)

The Nov 24 session's `claude/overlaps` branch was never pushed and its work was
lost with the session; this redoes the grounded fixes from its diagnosis, with
the owner's decision of the same day: keep the island pill, fix the overlaps.

- Island reserve: `islandReserve` counted a 42 px pill, but the resting shape
  on a project is the context handle — 46 px plus the island's two 1 px
  borders, 48. Pages reserved 64 px where 70 were taken, so the pill rode up
  over the foot of the page (the Lounge rail's settings button). `PILL` is
  now 48 and the reserve 70 at size 1; tests updated to match.
- Lounge on a phone: `.mc-lounge-body` had a fixed height that subtracted the
  top bar and the tab pill but not the "New here?" welcome banner, so with
  the banner up the document stood ~69 px taller than the window and the
  whole page scrolled. The room is now a definite height and the body flexes
  to whatever the top bar and the banner leave, in portrait, landscape and
  the typing states alike.
- Editor status bar (the line-type bar at the foot of the script): was
  `var(--surface)`, translucent under the glass themes, so script text showed
  through it as it scrolled beneath. Now `var(--bg-2)`, opaque.
- Tools sheet (`BottomSheet`): same translucency, same token; its bottom
  padding now also clears the island's reserved height.

Not redone: the scene-gutter narrowing and the studio-modal island reserve
from the lost branch — neither could be grounded from the code alone. They
want the lost session's screenshots; if the overlaps still show on a device,
capture them and the gutter is a five-minute follow-up.

Verified: see the PR. Not verified in a browser — this environment has no
Docker for the local stack and no device; the PR's preview is the look.
