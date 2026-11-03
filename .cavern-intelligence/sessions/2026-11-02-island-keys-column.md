# Session — 2026-11-02: the deck keys in the coverage reference

`island-coverage.md` gains the Caps Lock key each toggle and action gets today (`deckKeys` in `lib/island/coverage.ts`, from the island's own `CONTROL_KEYS` and its toggles-then-actions order), with `~` where a conditional control before it moves the key. Tested on sample descriptors; the staleness test keeps the file current. No behaviour change.

**Finding (it drives the design):** keys are by position, so Q is Focus in the editor, Post Position on Jobs, New Project on Projects, Next tab in the Studio and Search messages in the Lounge, and keys move when a conditional control appears. Pages register 0–2 actions each. The island plan's ten-slot fast path (fixed keys by meaning) is the fix, and needs a `slot` on the registration API first (BACKLOG 4.1).

**Verified:** unit tests, typecheck, lint, the full unit suite. No migration.

**Found in review (Copilot) and fixed:** an action under `posted ? [] : [{ … }]` (the production manager's Post as Job) was read from the empty branch and missed; every top-level branch is now read and its controls marked conditional (tested) — which also marks Jobs' and Projects' create buttons, shown only when signed in. The route's own links (`lib/island/routes.ts`) take the keys after the actions but are not listed in this table, and the reference now says so.
