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
