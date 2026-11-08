# 0008. Conflict-free co-writing: a CRDT for the script text

- Status: Accepted (by the owner, 2026-10-14 — the conflict prompt must go)
- Date: 2026-10-14
- Numbering: drafted on 2026-10-14 as 0006 and never merged; renumbered to 0008 because 0006 (staging) and 0007 (feature flags) were taken first.

## Context

Live co-writing today is `lib/scriptos/sync.ts`: Supabase Realtime broadcast of
whole-document `content_update` events, a 1.5 s debounced save, presence for
collaborators, and a **conflict prompt** — when two people type at once past
a 5-character heuristic, one of them is asked to throw their version away.
Last-write-wins with an apology. For "one film, one system", the script is the
spine; losing a collaborator's words to a heuristic is the worst failure mode
the suite has.

The legacy codebase (the pre-rebuild repo) shipped a true CRDT approach:
Yjs `Y.Text` over a WebSocket provider. Its implementation was crude — every
keystroke replaced the whole document (`delete(0, n)` + `insert`) and it
needed a standalone WebSocket server — but the direction was right. A survey
of all four surviving codebases (2026-10) found **nothing else left to
distil**: the parsers are supersets here, the editor crash boundary and the
per-format phase labels were already absorbed in the core-state rebuild, and
the remaining ideas are design choices, not code.

## Decision

Adopt a **CRDT for the script text only**, not for the whole app:

- The write surface keeps `Y.Text`; every other surface (breakdown, stripboard,
  call sheets) keeps reading the serialized content, exactly as today.
- Sync rides the **existing Supabase Realtime channel** (`script_${id}`) as the
  transport for CRDT updates (a Yjs provider speaking broadcast), not a new
  WebSocket server to run and secure. Presence and cursors stay as they are.
- `scripts.content` remains the persisted truth: the provider persists the
  serialized text on save; a fresh reader still boots from the row, not from
  a peer. Offline sessions reconcile through the same CRDT merge when they
  reconnect — the pocket/outbox philosophy applied to the script itself.
- The conflict prompt in `sync.ts` is then removed: the case it apologises for
  stops existing.

## Consequences

- Merging is no longer "whoever saved last"; two people writing the same
  scene keep both edits, interleaved at word level.
- The editor's undo history needs care: Yjs undo manager must stay scoped to
  the local author or one user's Ctrl+Z will eat another user's words.
- Migration is incremental: the current whole-document path stays until the
  CRDT path is proven, then the conflict prompt and its heuristic go.
- Test plan: two simulated authors editing the same paragraph (integration),
  offline capture + reconnect reconciliation, and an e2e two-browser
  co-write session in `e2e/`.
- Cost: a `yjs` dependency and a thin provider (~150 lines) — weighed
  against deleting the conflict heuristic and its UI.

## Implementation (2026-10-27)

`lib/scriptos/sync.ts` sends Yjs updates over `script_<id>`. The serialized
script remains in `scripts.content`; `scripts.yjs_state` stores the companion
CRDT state so new sessions and offline writers can merge from a shared history.
The obsolete line-merge heuristic and its prompt are removed.
