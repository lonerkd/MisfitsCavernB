# 3.33 — the garbled merge's two mechanisms, fixed (2026-11-26)

The 2026-11-26 audit of BACKLOG 3.33 (and PR #774, which closed the
column↔`yjs_state` divergence and the chunk-cap mismatch) left leftover (i)
with two diagnosed mechanisms still in the code. This change fixes both.
Leftovers (ii) the ~1-in-6 cowriting flake and (iii) the two-browser live
check stay open — nothing here claims them.

## Reproduction (before the fix)

Mechanism 2 was reproduced in a scratch unit test against the old code.
Two windows seed different words under the one fixed baseline client id
(0x4d43) — "INT. HOUSE - DAY\n\nAlice enters." vs the same text with a
content-only write's change, "Alicia enters." After exchanging full state
updates both ways:

- the replicas' **state vectors are equal** (both believe they are synced),
- window A reads "Alice enters.." — a doubled full stop where the two
  baselines met — and window B reads "Alicia enters.": **the texts differ
  and neither window knows**.

A pure-append divergence (a beat appended to the column) converged cleanly;
the garble needs the write to change existing words, which is why it was
rare and silent. Mechanism 1 needed no new reproduction: the backlog's own
Playwright finding stands (a window "offline" with its websocket open
produced a garbled merge, an edit inside a heading), and the code read
confirmed `sendUpdate` checked only the local `subscribed` flag.

## What changed

- **`lib/scriptos/send-gate.ts`** (new) — `BroadcastGate`, a pure health
  gate for the live provider, and `sync.ts`'s first unit-test seam (the
  provider itself still has no test sibling; the gate is the logic that
  decides, extracted so it can be pinned). A send may go out only while
  the channel is subscribed, the browser reports online, and the last
  save attempt reached the server. A held send is not queued payload by
  payload — Yjs increments are subsumed by the full state — the gate
  records a resync debt, and `sync.ts` answers it with one full-state
  send plus a sync request when health returns (browser `online` event,
  a save landing after failures, resubscription). A failed save marks
  the connection unreachable until a save lands again, however open the
  websocket looks.
- **`lib/scriptos/sync.ts`** — `sendEncoded` asks the gate; the subscribe
  callback feeds it (any non-SUBSCRIBED status closes it, SUBSCRIBED
  spends any debt because that block already sends full state); save
  outcomes feed it; `online`/`offline` listeners feed it and flush on
  recovery; cleanup removes the listeners. The provider also tracks the
  words it seeded this session (`seededContent`) for the rebase below.
- **`lib/scriptos/cowriting.ts`** — `baselineClientIdFor(content)` derives
  the seed's client id from the seeded words (two FNV-1a passes combined
  under 2^53): same words → same id → honest seeds merge as one baseline,
  exactly as under the fixed id; different words → different ids → the
  baselines can no longer claim the same item ids. `seedScriptText` uses
  it. New `rebaseSeededDoc(doc, seededContent, serverUpdate)`: when a
  session-seeded document meets a stored state built on different words,
  and the document still holds exactly the seeded words, the seed is
  replaced wholesale by the server's state instead of merging two
  baselines. A window that has typed since seeding is refused (its edits
  are woven into its baseline) and keeps the ordinary merge. `sync.ts`
  calls it at the two places a session-seeded document meets stored
  state: setup (saved state present but unreadable, so it seeded) and
  the subscribe-time load of the latest state.

## Decisions and residuals

- **No per-payload send queue.** Considered and rejected: Yjs updates are
  incremental and order-tolerant, and the full state at recovery carries
  everything a queue would, without an unbounded buffer held for a
  window that may never reconnect. The stored-state path already carried
  oversize updates the same way ("the words are not lost: the stored
  shared state carries them").
- **A save failure of any kind closes the gate** — including the
  "stored state cannot be read" refusal, which is not a network fault.
  Deliberate: a document that cannot save must not keep broadcasting as
  if it could; the gate reopens on the next save that lands, and saves
  retry on their own.
- **Transition:** states seeded under the old fixed id stay valid —
  seeding only ever happens when no stored state exists, and any stored
  state (old id included) is applied, never re-seeded. Two windows on
  different code versions seeding one brand-new script at the same
  moment now hold distinct baselines (visible duplication, recoverable)
  instead of one silently garbled one.
- **The offline queue's merge** (`mergeServerIntoLocal`) can still meet
  a divergently seeded server state; with distinct seed ids its failure
  shape is the same visible duplication, not silent corruption. The
  live-provider rebase covers the path the garble was reported on; a
  queue-side rebase is a follow-up only if (iii) ever shows it matters.
- **(ii) and (iii) untouched.** The ~1-in-6 `editor-cowriting.spec.ts`
  flake has no isolating code evidence and this change neither targets
  nor worsens it; the two-browser live check against a preview remains
  the done-when proof for the whole leftover and is still to do.

## Verified

Tests first: the new suites failed against the unfixed code (5 failures;
the 22 pre-existing cowriting tests passed), and the mechanism-2 garble
was reproduced as above before any fix. After: `lib/scriptos` targeted
suites green (73 tests across send-gate, cowriting, chunks, broadcast,
storage merge/sync), typecheck clean, lint 0 errors, full unit suite and
build green — see the PR's Verified line for counts. Not verified: a
real two-browser session (that is leftover (iii), still open) and the
editor in a browser — this change is provider internals with no visual
surface; the nightly e2e cowriting/offline specs are its browser proof.
