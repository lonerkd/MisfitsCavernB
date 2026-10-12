# Session — 2026-10-12: the deep brain, rung B8 — memory and corrections (first slice)

Eighth rung of [the deep-brain plan](../plans/2026-10-12-the-deep-brain.md): the project teaches the reader.

**Built:**
- **Schema** (`20261012020000_reading_corrections.sql`): `reading_corrections` — per project, one
  verdict per name (`not_character` or `character`), upper-case, who said it, when; RLS
  `can_access_project`, Realtime. Persona test (owner and crew can say it, an outsider and anon
  see and change nothing, projects are kept apart, one verdict per name, names stored upper-case);
  it failed before the migration, 7/7 after. Snapshot and types regenerated; full integration
  suite green.
- **App:** data access and a live hook in `lib/studio`; `contextFromProject` (the cast, the
  confirmed names, the rejected names) feeds the reader in both the editor and the Studio's scene
  sync; the Character Bible has a **Not a character** action on each character and a "Not read as
  characters" list with a way back (`components/editor/ReadingCorrections.tsx`). The script text is
  never touched.
- **E2E** (`reading-corrections.spec.ts`): an ALL-CAPS `DARKNESS` the reader takes for a speaker →
  Not a character → gone from the Bible, the scene's cast corrected (DB), remembered across a reload,
  restored with the way back. Plus the accessibility spec on every page and the editor/Studio specs.

**Owner action — production lacks both pending migrations** (checked read-only): `20261012010000`
(story time; Continuity errors until applied) and this `20261012020000` ("Not a character" cannot
save until applied; everything else degrades quietly). STATE's *Resume here* lists the two files
in order, with the checks to run after.

**Still to do in B8:** line overrides as rules ("this line is dialogue"); per-writer memory;
auto-learning from how scripts are edited; a "is a character" action (the verdict exists, the
button does not).

**Verified:** 349 integration tests + 885 unit tests (and one pinned gap), eslint, typecheck; 8 e2e
specs on a real build. **Not verified:** CI; the migration on production.
