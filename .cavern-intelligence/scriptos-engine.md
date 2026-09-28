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
- **Worker Isolation:** For extremely large scripts (120+ pages), parsing is delegated to a background web worker (`parser.worker.ts`) to keep the React rendering loop fully interactive (60fps) and prevent blocking the main UI thread.

---

## 2. Realtime Co-Editing & Caret Sync
Multiple writers can co-edit the same screenplay simultaneously. The synchronization engine is designed to handle network latency and write collisions cleanly.

### Realtime Pipeline (`lib/scriptos/sync.ts`)
- **Transport Layer:** Leverages Supabase Realtime `broadcast` channels.
- **Shared States Broadcasted:**
  - **Content Sync:** Broadcasts lightweight text updates.
  - **Presence Avatars:** Renders where other co-writers are active on the page.
  - **Caret Tracking:** Renders colored remote cursors with named labels directly inside the editor area.

### Conflict Resolution Strategy
When two users write to the exact same line at the exact same millisecond:
- **Client Locks:** The UI immediately stops compiling and freezes inputs for the affected block.
- **Conflict Banner:** A modal/banner prompts: **"KEEP MINE" or "TAKE THEIRS"**.
- This avoids automated character-by-character merging that typically corrupts screenplay layout elements (like dual-dialogue configurations or action alignments).

---

## 3. Offline Caching Strategy
Filmmakers often work in locations without reliable internet access (e.g., sound stages, remote scouting spots). ScriptOS implements a robust offline fallback mechanism.

- **Primary DB Sync:** While online, content auto-saves directly to the Supabase `scripts` table with a throttled debounce (default: 1000ms).
- **Offline Caches:** All scripts, character bibles, and metadata updates are copied synchronously to:
  - **IndexedDB (`idb-keyval`)**: For storing the raw content and version histories.
  - **`localStorage`**: Stores active editing configurations, typewriter mode flags, and focus settings.
- **Reconciliation:** When the client detects network restoration (monitored via `lib/hooks/useNetworkStatus.ts`), the caching module triggers a background sync, publishing any offline revisions back to the database as new incremental versions inside `script_versions`.

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

