# Session - 2026-11-23: the breakdown says when a scene's read is doubtful (BACKLOG 3.21, B9)

Readiness already flagged a scene the reader was unsure of; the breakdown, where the elements are tagged from the same read, did not. Each scene sheet in Breakdown › By scene now carries a note when the scene is in the Studio's `doubtfulSceneOrdinals` (the same set Readiness uses): the read is doubtful, so what is tagged may be off, review it in the editor's Doubtful reads. No new data, no migration.

**Verified:** typecheck, lint. `e2e/breakdown-doubt.spec.ts` (a doubtful scene carries the note, a plain one does not) runs in the nightly `e2e-local`.
