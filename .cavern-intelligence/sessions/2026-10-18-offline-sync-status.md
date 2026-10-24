# Session — 2026-10-18: the editor shows its offline queue

**Added:** a status-bar chip (`components/editor/SyncStatusChip.tsx`) for `syncPendingScripts`: scripts and deletes waiting, "Offline — saved on this device", "Syncing…", and "Can't reach the server … retry in 12 s (try 3)" with a **Sync now** button. It is hidden when online with nothing queued. `lib/scriptos/storage.ts` now keeps a small observable status (`getSyncStatus`, `subscribeSyncStatus`, `refreshSyncStatus`) and tracks `online`/`offline`.

**Behaviour changes in storage.ts:** a failed pass (upsert or tombstone replay) now schedules its own retry — before, only a failed `saveScript` did — with backoff 15 s → 30 s → … → 5 min (`retryDelayMs`); a clean pass resets it. The `online` event cancels a waiting retry and syncs at once. A tombstone the server refuses stays queued.

**Tombstones reviewed:** they hold an id only, never content; the local copy is deleted at once; a tombstoned script is never re-uploaded (test); the replayed delete runs under the person's own session, so RLS decides — a stale tombstone on a shared device cannot delete someone else's script. No schema or policy change, so no persona test.

**Verified:** typecheck, lint (0), production build, 1026 unit tests, including new `storage.sync.test.ts` (backoff, retry succeeds, `online` cancels the timer, one timer at a time, tombstone replay/refusal) and `SyncStatusChip.test.tsx` (wording per state, render, Sync now, live update). **Not verified:** a look in the browser (no dev stack run); the real offline reload path.

**Open:** the same store could feed the island's network/sync live activity (BACKLOG 4.1/4.13).
