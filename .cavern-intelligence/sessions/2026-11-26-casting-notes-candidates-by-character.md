# Casting notes and candidates keyed by character (2026-11-26)

The follow-up PR #775 recorded: casting notes and candidates were the last
name-keyed readers, and keying them by id needed a migration. This is that slice.

**Migration `20261126000100_casting_notes_candidates_by_character.sql`**, in the
`20261102100000` pattern (the calls cutover):

- `casting_notes.character_id` and `casting_candidates.character_id`: composite
  FK to `characters(id, project_id)`, `ON DELETE SET NULL (character_id)`, plus a
  `(character_id, project_id)` index on each table.
- Backfill: characters are made for every distinct name on the two tables, then
  the rows link by `upper(btrim(character_name))`, triggers off. **Orphans, honestly:**
  a name that is blank or longer than 200 characters cannot be a character (the
  `characters` check refuses it), so those rows keep `character_id` null and keep
  their name — nothing is deleted, nothing is rewritten, and the readers fall back
  to the name for an unlinked row, so the note or candidate still reads under its role.
- `internal.casting_notes_link_character()` / `internal.casting_candidates_link_character()`:
  the `calls_link_character` body — a write naming a character links to it (made if
  new); an explicit unlink with an unchanged name is left alone. RLS is otherwise
  untouched: every policy on both tables keys on `project_id`, and persona tests
  cover the linked rows (owner writes, crew reads, outsider nothing).
- `internal.characters_rename()` gains both tables: a rename rewrites the label on
  linked notes and candidates (neither table has a name uniqueness rule, so every
  linked row follows — no per-sheet exception like calls need). **The first CI run
  caught what a read of the schema missed:** the rename trigger runs as whoever
  renames, and `casting_notes` had no UPDATE policy at all, so the rename carried
  zero notes (candidates, which already had a creator update policy, carried
  fine). The migration now also gives `casting_notes` the creator UPDATE policy
  `casting_candidates` already has — no wider than the delete-and-re-add the
  creator could always do — and the notes persona suite pins that crew still
  cannot rewrite a note.

**Readers and writers** (`lib/supabase/casting.ts`, the board, the shortlist):
`listCastingNotes` / `listCandidates` take the character id when the board knows
it and read by id, merged with the unlinked rows of the same name; without an id
they read by name as before. Writers send the id when it is a real one and the
name as the label (a name in the id's place would fail the uuid column — the
trigger links by name instead, as with castings). The printed casting sheet
groups by id first, name as fallback. `lib/supabase/casting-links.test.ts` pins
the keying (it fails on the old lib: 4 of 5); the persona suites for both tables
gain link / rename / unlink coverage.

**Not applied by this PR.** The migration reaches production, then staging, by
hand after merge, then the drift check — the owner's step, as with every
migration. `STATE.md`'s migration line is deliberately untouched here.
`schema.fingerprint` and `database.types.ts` were updated by hand in this
environment (no Docker, so no local stack): the fingerprint's function lines use
the `md5(pg_get_functiondef)` the drift script computes, reproduced from the
migration text and verified byte-for-byte against three existing functions
(`calls_link_character`, `castings_link_character`, `characters_rename`) before
being trusted for the new ones. CI's `database` job is the real check of both.

**Found, not done:** `casting_auditions` and `casting_history` are still
name-keyed in the schema — recorded in backlog-detail 3.18 for the same
treatment when they next change. Shoot days by `shoot_day_id` stays an owner
design question, untouched.
