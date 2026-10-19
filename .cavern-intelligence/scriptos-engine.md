# ScriptOS — The Screenplay Engine

## 1. Syntax Parsing (Fountain Aware)
**ScriptOS** is built on the Fountain markup syntax, a plain-text standard for screenplays. The parsing engine parses a plain-text string and structures it into discrete blocks of formatted metadata.

### The Parsing Architecture (`lib/scriptos/parser.ts`)
- **Dictionary-Driven State Machine:** The parser runs through lines sequentially, categorizing each block based on a predefined set of lexical indicators:
  - **Scene Headings:** Identified by matching prefixes like `INT.`, `EXT.`, `INT/EXT`, or `EST.`.
  - **Characters:** All-uppercase lines that do not match scene headings or transitions, and are followed by dialogue.
  - **Dialogue & Parentheticals:** Lines nested immediately beneath a character block.
  - **Transitions:** Matches high-frequency patterns like `CUT TO:`, `FADE OUT:`, `DISSOLVE TO:`.
  - **Action Blocks:** The fallback line type when no other lexical rules trigger.
- **On the main thread:** there is no parser worker. Pagination, timing (`timing.ts`, eighths of a page)
  and analysis (`analyze.ts`) run from the same parsed blocks.

---

### Known gaps in the classifier and the importer

Compared 2026-10-11 with the old "Deep Brain 3.0" parser and import modal. The current parser keeps what was right about the old one (a rule-based, explainable, offline classifier) and adds a Fountain layer that is never second-guessed, lossless round-trip, other formats, and the breakdown/timing/analysis that read its output. It is *less* complete than the old one in the vocabulary of transitions and numbered headings, and shares its weakest idea: structure is guessed from capitals and neighbours. The PDF importer is the old one's algorithm, ported. Every confirmed gap is pinned as an expected-failure test (, ) and scoped in BACKLOG 3.20.

---

## 2. Realtime co-writing (`lib/scriptos/sync.ts`)

- **One channel per script** (`script_<id>`): Supabase Realtime broadcast
  (`content_update`) plus presence (who's in, their line, a colour each).
  Carets are broadcast too (`broadcastCursor`).
- **Saving**: 1.5 s after typing stops, the writer broadcasts the whole text
  and updates `scripts.content` (`last_edited_by`, `updated_at`). Others apply
  a remote version when it differs from theirs.
- **Conflict rule**: if a remote version arrives while you're typing (an edit
  in the last second) and both your text and theirs differ by more than five
  characters from the last shared version, nothing is applied: the editor
  shows **KEEP MINE / TAKE THEIRS** (`resolveConflict`, banner at the foot of
  `app/(suite)/editor/page.tsx`). Otherwise it's whole-document last-writer-wins —
  no character merge (a CRDT would be the next step).

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

