# Session — 2026-10-11: the editor's scene gutter (E2, first piece)

First visible step of [the editor-on-the-graph plan](../plans/2026-10-11-editor-integration.md)
(owner chose the read-only gutter before taking the page apart; the plan is
PR #169 and may not be merged yet).

**Built:** beside each scene heading, in the script's left margin, its story day
and time (read from the headings — italic — or the person's own setting) and,
once its shoot day has a **date**, `Shoot N`. The Now Writing card in the right
panel carries the same. `lib/film/gutter.ts` (pure, tested), `SceneGutter.tsx`
(an overlay like `CutNoteMarkers`), `gutter` on the editor context. Read only —
nothing it shows is written to the script.

**Found:** `scenes.shoot_day` defaults to 1, so every scene is "on day 1" until
moved; a bare shoot day would mislead. The gutter shows it only when the day has a
date (what Readiness already counts as scheduled).

**Verified:** `npm run test` (682), eslint/typecheck, new e2e
`editor-gutter.spec.ts`, and these pass on the same build: accessibility (every
page), beat-to-script, editor-project-script, script-share, split,
studio-journey. **Not verified:** a phone-width run (the gutter hides under
720px by design; the card carries it), and the other e2e shards (CI).

**Next:** the cue hover card, location suggestions, then the full scene card
(E2); E0's safety-net specs still to do before E1/E3. BACKLOG 3.18(d) should say
E2 has started — update it once #169 is merged.
