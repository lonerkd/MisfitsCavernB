# Session - 2026-11-21: the phase lock says what it takes (BACKLOG 3.52)

The owner's screenshot of Cut review & delivery before its phase: a bare "Opens in Post-Production", a stray lock glyph at the card's edge, and the buttons under the corner player; and the brief: fix the lock and the options for each phase, what each role and the project need to advance, with real assets.

- **The lock screen** now lists what is left before the tool's phase: every milestone of the current phase on (the engine's real, data-read milestones), each with its hint, its progress, who usually does it (`MILESTONE_ROLES`) and a **Go** to where it is done; what opens the tool early (`EARLY_OPENS`, the work the tool holds); which roles work in it (from the role toolkits); and "every milestone is done: move the project on from the Overview" when it is so. *Open it now* is unchanged; the bottom is padded clear of the player. The stray lock is inline with its text now (the glyph was placed at the card's left edge).
- **The phase panel** says who usually does the next milestone.
- **Guards:** a test that every milestone has roles and every role is a real craft in the toolkits, that every early-open sentence belongs to a tool that really has an early rule (and vice versa), and the lock's contents.
- **What I did not do, on purpose:** invent milestones. The engine's milestones are 21 counts; several real prerequisites (script locked, breakdown done, call sheet *issued*, locations, cast confirmed, paperwork, cut locked) have no signal, so ticking them would be a mock. 3.52 in the backlog lists them with what each needs (signals and format skip rows) and the per-role readiness gap.

**Looked at:** the lock screen on a production build (before and after: the lock glyph inline, the list, the roles, the early hint). **Verified:** typecheck, eslint, 154 unit tests, `e2e/phase-lock.spec.ts`. **Not verified:** a phone; other formats' locks by eye.
