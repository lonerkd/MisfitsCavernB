# ScriptOS — The Screenplay Engine

## 1. Reading and parsing (Fountain aware)

**ScriptOS** reads Fountain and imported plain text as deterministic, explainable
line types. Exact Fountain syntax is classified before inference; the document
profile and whole-document decoder handle the remaining lines. PDF import first
reconstructs lines from page geometry, then uses the same parser.

### The reading architecture (`lib/scriptos/`)

- **Evidence and profile** (`profile.ts`, `vocabulary.ts`): features include
  Unicode-aware cue names, heading-number styles, transition endings, and known
  screenplay vocabulary. Explicit Fountain cues establish document-local
  conventions.
- **Whole-document decoder** (`decode.ts`, `parser.ts`): a grammar-constrained
  best-path decoder resolves uncertain lines using surrounding speech state,
  evidence, the document profile, and supplied context. It remains deterministic
  and offline; confidence is exposed per line.
- **Project context** (`context.ts`): the editor and Studio supply castings,
  human name corrections, project locations, and repeated confident character
  cues from the previous draft. Location context canonicalizes an already
  recognized scene location; it cannot change scene boundaries. Previous-draft
  names are weaker evidence than castings. The Studio's Character Bible and
  Casting board use the same context when building their character lists.
- **Corrections**: `reading_corrections` stores project-level character verdicts.
  `script_line_overrides` stores a line type by script, exact trimmed text, and
  zero-based occurrence. These are human decisions, not feedback from the
  parser's own output. Fountain syntax and title-page rules remain authoritative.
  See `database-and-security.md` for access control.
- **Review** (`review.ts`, `components/editor/DoubtfulReads.tsx`): the editor
  asks about low-confidence reads and lets a person save or undo line decisions.
- **On the main thread**: parsing is deferred while typing; there is no parser
  worker. Pagination, timing (`timing.ts`, eighths of a page) and analysis
  (`analyze.ts`) read the same parsed blocks.

See [the deep-brain plan](plans/2026-10-12-the-deep-brain.md) for the measured
layers, corpus baselines, remaining work, and owner decisions. The generated
corpus is not an independent substitute for rights-cleared real scripts.

---

## 2. Realtime co-writing (`lib/scriptos/sync.ts`)

- **One channel per script** (`script_<id>`): Supabase Realtime broadcast
  (`content_update`) plus presence (who's in, their line, a colour each).
  Carets are broadcast too (`broadcastCursor`).
- **Saving**: 1.5 s after typing stops, the writer broadcasts the whole text
  and updates `scripts.content` (`last_edited_by`, `updated_at`). Others apply
  a remote version when it differs from theirs.
- **Conflict rule**: when a remote version arrives and both your text and
  theirs differ from the last shared version, the two are merged by line
  against that version (`mergeScript`, `lib/scriptos/merge.ts` — a pure
  three-way merge, tested in `merge.test.ts`). Edits in different places all
  survive and the merged text is applied (the normal save then carries it).
  Only when both sides changed the *same lines* differently is nothing applied:
  the editor shows **KEEP MINE / TAKE THEIRS** (`resolveConflict`, banner at
  the foot of `app/(suite)/editor/page.tsx`). With no shared version yet
  (first remote message) the remote text is taken. This is a line-level
  three-way merge, not a CRDT: no per-character merge within one line, and the
  base is the last text this client saw, so a third simultaneous writer can
  still hit the prompt. A real CRDT (BACKLOG 3.18 d, E3) would remove both limits.

---

## 3. Offline (`lib/scriptos/storage.ts`)

- **Device first**: `saveScript` writes the script to IndexedDB
  (`idb-keyval`, key `script_<id>`, `syncPending: true`), then to Supabase if
  `navigator.onLine`; on success it clears `syncPending` (unless a newer local
  save landed meanwhile).
- **Retry**: a failed save schedules `syncPendingScripts` in 15 s
  (`scheduleScriptSync`) — the `online` event alone misses failures while the
  browser still thinks it's online. A pass that fails (an upsert or a delete
  replay errors) schedules the next with backoff: 15 s, 30 s, 60 s … capped at
  5 min (`retryDelayMs`); a clean pass resets it. The `online` event cancels a
  waiting retry and syncs at once.
- **Sync status** (`getSyncStatus` / `subscribeSyncStatus`): module state in
  `storage.ts` — scripts pending, deletes queued, mid-pass, next retry time,
  failed passes in a row, `online`/`offline`. `components/editor/SyncStatusChip`
  shows it in the editor's status bar (hidden when online and nothing queued)
  with a countdown and **Sync now**; `describeSync` holds the wording.
- **Offline deletes** are tombstones (an id, never content) replayed on the
  next sync, so a deleted script never comes back and its text doesn't linger
  on the server. The local copy is removed at once, a tombstoned script is
  never re-uploaded, and the server's RLS decides whether the replayed delete
  is allowed — so a stale tombstone on a shared device can't remove anyone
  else's script. A refused delete stays queued and counts as a failed pass.
- **The open script** per project is a pointer in `localStorage`
  (`getCurrentScriptId` / `setCurrentScriptId`).
- **Revisions** are `script_revisions` (`lib/scriptos/revisions.ts`: lock a
  draft, coloured pages after it — `REVISION_COLORS`, diff view), not an
  automatic version history.

## Writing loop

- `lib/writing` + `components/editor/WritingLoop.tsx`, in the editor's right
  panel. Words are counted as they're **typed** (`typedWords`: the growth of
  one edit, 0 for deletions and for any single edit over 25 words — a paste or
  a load isn't writing), queued, and sent to `log_writing(day, words, sprint)`
  a few seconds after typing pauses, every 20s, and (best effort, `keepalive`)
  when the page is hidden or left.
- `writing_days` (one row per writer per local day: words, sprints, the goal
  that day) is readable by its owner only and written only by
  `log_writing()` (bounded; within a day of the server's date), so a streak
  can't be set by hand. The goal and sprint length are `profiles`
  columns, read back through `get_my_writing_prefs()` (profile columns are
  granted one by one).
- `summarize()` gives today against the goal, the streak (through today, or
  yesterday while today is in progress; each day judged by its own goal),
  best streak, records and a 4-week grid; `badges()` derives what's earned.
  Sprints have a length the writer sets (5–120 min), count their own words
  and log themselves when they end.
