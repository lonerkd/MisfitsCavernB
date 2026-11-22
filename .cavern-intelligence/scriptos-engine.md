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

### Script formats (`lib/formats/script-formats.ts`, `lib/scriptos/reading-format.ts`)
The format list is one registry; a script's format picks the reading rules (`readingFormat`). Screenplay, teleplay, stage play and treatment read as screenplay grammar. The others have rules of their own in `analyzeNonScreenplayLine`, and in each a section is a "scene" so the scene index, outline and Studio work: **podcast** (`NAME: line`, segment headers), **doc-outline** (timecodes, labelled segments, soundbites), **copy** (advertising, per-piece limits), **video-script** (YouTube and kin: HOOK / CHAPTER / OUTRO sections, `[B-ROLL: …]` cues as shots, spoken lines as dialogue), **prose** (articles, blogs, newsletters: `#` and short CAPS headings are sections, paragraphs are text; Fountain's `>`, `@`, `!`, `~` and leading-dot markers are ordinary text), **game-script** (parts such as ACT / LEVEL / QUEST / NODE, choices as the player's lines, `[IF …]` / `[SET …]` logic, `-> node` jumps, other `[cues]`). A project type (`project_formats`) says which format a new script opens in; the database checks the format in `scripts` and `project_formats` (the CHECK lists must match the registry: migration `20261115000300`).

### Known gaps in the classifier and the importer

Compared 2026-10-11 with the old "Deep Brain 3.0" parser and import modal. The current parser keeps what was right about the old one (a rule-based, explainable, offline classifier) and adds a Fountain layer that is never second-guessed, lossless round-trip, other formats, and the breakdown/timing/analysis that read its output. It is *less* complete than the old one in the vocabulary of transitions and numbered headings, and shares its weakest idea: structure is guessed from capitals and neighbours. The PDF importer is the old one's algorithm, ported. Every confirmed gap is pinned as an expected-failure test (, ) and scoped in BACKLOG 3.20.

---

## 2. Realtime co-writing (`lib/scriptos/sync.ts`)

- **One channel per script** (`script_<id>`): Supabase Realtime broadcasts
  incremental Yjs `Y.Text` updates; presence still carries each writer's line
  and username, and carets use `broadcastCursor`.
- **The offline queue tells open editors** (`lib/scriptos/broadcast.ts`): after its
  compare-and-set write of a merged document it broadcasts the merged state as a
  `yjs_sync` message on the same channel, so an editor open elsewhere applies it
  at once.
- **Large updates are chunked** (`lib/scriptos/chunks.ts`, used by `sync.ts` and
  `broadcast.ts`): Realtime refuses payloads over about 250 KB, so an encoded
  update over 150,000 characters goes as `{ chunk: { id, i, n, part } }`
  messages under the same event names (`yjs_update`, `yjs_sync`); a smaller one
  keeps the plain `{ update }` shape, which an older open tab still reads (it
  ignores chunks). The receiver (`ChunkReassembler`, one per channel) applies an
  update only when every part has arrived, in any order, and drops a partial set
  after 30 s. No new channel or topic.
- **Durable state**: the editor persists the serialized text in
  `scripts.content` and the companion Yjs state in `scripts.yjs_state`. New
  sessions load the row's state, while IndexedDB keeps each device's Yjs state
  available offline. Reconnecting exchanges CRDT updates; it does not replace
  a document with a collaborator's text snapshot.
- **Undo**: a `Y.UndoManager` tracks only this writer's local transactions, so
  undoing a change cannot remove another writer's words.
- There is no conflict heuristic or keep-mine/take-theirs prompt. Independent
  edits to the same paragraph merge as text operations; the normal save keeps
  `scripts.content` current for the rest of the suite.

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
  automatic version history. The versions the editor can compare are the
  locked revisions plus the draft in hand; `script_versions` exists in the
  schema but nothing writes or reads it.
- **Comparing versions** (`lib/scriptos/compare.ts`, pure; the view is
  `components/editor/CompareVersions.tsx`; the report is
  `lib/studio/compare-print.ts` through the print kit). `compareScripts(a, b)`
  cuts both texts into scenes and pairs them: the same heading (numbering and a
  forced `.` ignored; the nth with the nth when a heading repeats), then, for
  what is left, scenes whose words are at least half the same (an edited
  heading). Paired scenes out of order (everything off a longest increasing run)
  are **moved**, not cut and added. Inside a pair the non-blank lines are diffed
  (blank lines are never a change), a run of removed and added lines is aligned
  by element type and similarity, and a paired line carries its changed words.
  A **rename** is a cue that changes the same way throughout: the old name is
  gone, the new one is new, and the changed cues are at least half the old
  name's; the rename is applied to the earlier text, so lines that differ only by
  the name are shown (with a marker) but are not changes. Lines are typed by
  structure (`typeLines`), not by `parseScript`: the decoder takes ~150 ms a
  script at 120 pages and a comparison reads two, the budget is 200 ms (a test
  holds it). It returns the scenes with their rows, the renames and the numbers
  (scenes added / cut / changed / moved, lines by kind, words, pages changed);
  `changeRefs`, `groupScenes` and `collapseRows` shape the list the view draws
  (the filter All / Dialogue / Action / Scene headings, next / previous change,
  unchanged scenes and runs of lines folded). Read-only and persists nothing.

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

## Final Draft (FDX) export and import (`lib/scriptos/export.ts` `scriptToFdx`, `lib/scriptos/import.ts` `parseFdx`)

Real elements: dual dialogue is `<DualDialogue>` holding both speakers' paragraphs (the second Character paragraph is the second speaker; the importer writes `NAME ^`); centered text is `Alignment="Center"` on an Action paragraph; the title page is a `<TitlePage>` with one paragraph per Fountain key, each labelled by an XML comment `<!--cavern:key=Title-->` (`+` continues the key above, an empty key is a generated page that is not imported; a file without labels is read by position: title, credit, author, contact); sections and synopses are `General` paragraphs that keep their `#` / `=` marker (Final Draft has no element for them). Notes, forced elements, page breaks and boneyard are still Fountain text in an Action or Transition paragraph. Pinned by `fdx-roundtrip.test.ts` (well-formed XML, `<DualDialogue>` present, no `^` or `> <` in any text). Not checked in Final Draft itself.

## The reading context, and the previous draft and places as evidence (B7b, 2026-11-21)

The reader takes what the project knows as a `ParseContext` (`lib/scriptos/parser.ts`): the cast, the names a person said are not characters, the places, a person's line overrides, a writer's private memory and the previous draft. `contextFromProject` (`context.ts`) assembles the first four; `withPreviousDraft` (`reading-context.ts`) adds the previous draft; `loadReadingContext(scriptId)` (`lib/studio/reading-context.ts`) loads all of it under the caller's own access for the surfaces that read a script outside the editor, and caches it for 30 s per script so several surfaces opening one script share one load. It leaves a writer's private memory out on purpose (those surfaces feed shared rows and screens). **Who reads with it:** the editor, the Studio's scene sync, a performer's sides (`/call`), the supervisor's lined script, the Cast tab's characters, the Sound page's scene timeline. **Who still reads without it, and why:** the public share page and the review page (an outsider has no access to the project's data, and must not), exports (text, Fountain, FDX, PDF: the element mapping for non-screenplay formats is undecided, 3.22), the pitch deck's character scan, the brief, Spotify moods, the Cavern journey, version diff, the demo builder (none of them writes the scene index or a label a person sees as a verdict, and each parses once for a summary).

**The previous draft** is the script's latest locked revision (`script_revisions`; the editor already loads them, the Studio and the others fetch only the newest row; RLS limits it to people who can open the script). It is read once with the same context (`readPreviousDraft`, cached by text, format and context, so a keystroke re-reads only the text being typed), kept to the lines it was read at 90 or more (or a person settled: a line override finds its line in the earlier text by what it says, `override-anchor.ts`), and aligned with the later text by a diff (`previous-draft.ts`, `alignPreviousDraft`: identical lines, then lightly edited ones that share 70% of their words; a repeated line pairs with its own counterpart). A line in the later draft that was in it gets a bounded prior in the decoder (`Params.previousDraft`, 7 cost units: the line is cheaper as what it was last time). It is never given to a line the person forced, a heading (so it never changes where scenes begin), a rejected name, or a "cue" that reads as a sentence; and a label the line's own evidence rules out stays ruled out. The reading says why (`Same as in the previous draft (action)` or `The previous draft read this line as X`, in `reasoning` and in the doubt's explanation, and the Script tab's *What the reader knows* counts both), and a line read as the earlier draft read it is at least 80 sure, so the review does not ask about what the earlier draft already answered.

**Places** (`project_locations`) are evidence about headings that move confidence, never a label: a heading in a known place is at least 97 sure and says `Known place: X`; a caps `PLACE - TIME` line naming a known place that was read as action is capped at 60 and offered as "could be a scene heading" (a one-tap *Read as slug* if the person agrees). Neither changes where scenes begin, so the editor and the Studio keep agreeing on the scene index.

**Measured** (ratchet in `lib/scriptos/corpus/previous.test.ts`; the surface is the script pasted with no blank lines, read with and without an earlier draft derived from it by seeded edits; `previous.ts`, `previous-hand.ts`, `places.ts`): see the session note `sessions/2026-11-21-deep-brain-previous-draft.md` for the table. The earlier draft's own reading comes in three kinds (the engine alone on a blank-free paste, the draft as it was kept with its blank lines, and a person's settled reading) and none reads worse than without it.

## Character checks and the relationship map (2026-11-22, BACKLOG 4.8 slices 1 and 3)

Pure reads of the parse, no schema. `lib/scriptos/character-checks.ts` `checkCharacters(lines, scenes, {rejectedNames})` returns warnings, each with a stable `id` (rule plus names), a sentence, a stated reason and a line: a name spelled two ways (same letters apart from case, spacing or punctuation; or one letter apart, rare and never in a scene with the common one), speaks before the action introduces them in capitals, speaks after a clear death beat (no doubt words, no V.O./O.S., no flashback or dream heading), exactly one line, and introduced with an age but never speaks. Extensions such as (V.O.) and (CONT'D) are not misspellings; a name the project rejected is never flagged. `lib/scriptos/relationships.ts` `relationships()` weights pairs: 2 points per turn (adjacent cues in a scene) plus 1 per shared scene. Dismissals are device-local (`warning-dismissals.ts`, localStorage per script), because project settings are owner-only. Surfaces: the editor's Character Bible modal (`components/editor/CharacterWarnings.tsx`; `/editor?script=&line=N` puts the caret on a line) and the Studio's Character bible (`components/studio/CharacterInsights.tsx`: pair list, SVG diagram of the top twelve, Print / PDF of the bible via `lib/studio/character-bible-print.ts`).

## The parser reference (generated)

Every word list, pattern and decoder weight the reader uses is written out in [`parser-reference.md`](parser-reference.md), generated from the code (`npm run parser:reference`). `lib/scriptos/reference.test.ts` fails when the committed copy is stale, and a new decoder weight with no description in `PARAM_DOCS` fails it too, so changing the reader's vocabulary or weights means regenerating the reference in the same change.
