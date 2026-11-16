# 2026-11-15 — The offline queue's merge reaches open editors at once (3.33)

- `lib/scriptos/broadcast.ts`: after `reconcileWithServer` writes the merged document (compare-and-set), it broadcasts the merged state as `yjs_sync` on `script_<id>`, the message the live provider already sends and receives. It never blocks or fails the queue.
- Over 200,000 base64 characters (under Realtime's 250 KB limit) nothing is sent; the editor merges at its next save.
- The `yjs_*` event names moved to `cowriting.ts` so the provider and the queue share them.
- Tests: `broadcast.test.ts` with a fake channel (shape, too large, no subscribe, send failure).
- **Unverified:** no two-browser e2e (an open editor receiving a queue merge from another tab) was written or run; only unit tests with a fake channel. The queue runs only where no editor is open, so a real check needs two contexts.
