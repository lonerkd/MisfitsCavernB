# Session — 2026-10-27: link layer, slice B — attach from the card

**Built:** on every card (scene, character, location, shoot day, task, document,
media): "+ Attach" opens a search over the project's other things, offering
tasks, documents and media first; each attached item has a Remove button;
attach and remove check their errors and tell the person (RLS decides: anyone on
the project attaches; the creator or a shaper removes). Graph things (scenes,
characters, places, days) are not offered to each other — the graph joins those.
A media item's detail has a **Card** button. `attachCandidates` is pure and
unit-tested (6 tests); the data layer and RLS were already covered by slice A's
persona test.

**Flag:** `entity_cards` (on in production since the flags PR).

**Not done:** entry points from the project hub's tasks and from documents
(the card host lives in the Studio); search hits that open cards; attaching
from the stripboard. **Verified:** typecheck, lint, 1680 unit tests, build
(the known intermittent `SecurityFatalError` passed on rerun). The UI itself was
not clicked through in a browser.
