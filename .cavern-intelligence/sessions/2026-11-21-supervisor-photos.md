# Session - 2026-11-21: continuity photos on a take (BACKLOG 3.51, script supervisor) and `/call` in the phone audit

- **Photos on a take:** the supervisor's take form gets **Continuity photo (from the library)**: any image in the project's library, shown as a thumbnail on the take (and kept with the record: `media_id` on the `scriptNotes` data, no migration, no new storage path: one library, one place for files). If the photo is later deleted from the library the take simply shows none.
- **`/call` in the mobile audit** (the one-line change a Haiku agent made and I reviewed): the performer's My calls page is audited in both orientations. I ran the audit on the local stack: `/call` has zero findings, so its baseline entries are zero, and two views that had improved since the last run are locked in (the ratchet only shrinks).

**How this was made:** the `/call` line was delegated to a Haiku agent (narrow, a one-line diff I read myself); the photo feature, which touches a record type and a form, I wrote and ran.

**Verified:** typecheck, lint, `e2e/script-supervisor.spec.ts` (extended: with a library image a take logged with it shows "Continuity photo for take T4: Slate photo", after a reload) green three runs in a row (the first run after a build hit the known scene-pick flake of 3.37 once), and the phone audit `--check` on a production build on the local stack. **Not verified:** a phone device; the photo is not yet on the printed take sheet or in the editor package.
