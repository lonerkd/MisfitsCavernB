# 3.33 — the column and the shared document, reconciled (2026-11-26)

A read-only audit of BACKLOG 3.33 (2026-11-26) found the three headline builds
real — the script channel is private end to end, the offline queue merges
`content` and `yjs_state` together, broadcast chunking exists — and one genuine
hole the backlog did not name: **content-only writes diverge `scripts.content`
from `scripts.yjs_state`.**

`append_to_script` (migration `20261007020000`) updates the column alone, and
`pushBeatToScript`'s broadcast reaches only editors already open. A beat pushed
with no editor open therefore stood in the column and nowhere else. The next
device to open the script restored its saved Yjs state, applied the server's
`yjs_state` (which knew nothing of the beat), and never reconciled the column
into the document — the reconciliation in `sync.ts` setup ran only when there
was *no* saved state. It then published the document's text, and the next save
wrote it back over the column. **The beat was silently deleted.**
`e2e/beat-to-script.spec.ts` covers only the open-editor case.

## What changed

- **`lib/scriptos/cowriting.ts`** — `mergeScriptTexts(base, ours, theirs)`, a
  three-way text merge against the saved state's `baseContent`, and
  `reconcileScriptText(doc, baseContent, serverContent)`, which folds the
  merged text into the document as a remote-origin edit. Where both sides
  rewrote the same stretch of the base, the document's version stands (it is
  the living record; its next save writes the column anyway). A stretch counts
  as the same when the two overlap, or when one side's added words land inside
  the other's stretch or on its first letter — a character diff aligns the
  letters the two versions still share, so a rewritten word can present as an
  addition at its edge (the first cut of this code let exactly that through:
  "up" → "down" on one side and "up" → "out" on the other merged as "odown";
  a unit test pins it now). Words both sides only added survive from both.
- **`lib/scriptos/sync.ts`** — setup calls `reconcileScriptText` when a saved
  state exists and the server row has content, after the restore and the
  server-state application, before anything is published or saved.
  `receiveUpdate`'s two magic numbers became the shared constants, and
  `sendEncoded` refuses past the line instead of marking a sync that never
  arrives.
- **`lib/scriptos/chunks.ts`** — one size line for both sides:
  `MAX_UPDATE_BYTES` (2,000,000, the decoded cap the receiver already enforced)
  and `MAX_PAYLOAD_CHARS` (2,666,664 — that many bytes in base64, rounded down
  to a whole group of four, so anything a sender may send also passes the
  receiver's byte line). Before this, the sender chunked up to `MAX_CHUNKS`
  parts (≈9.6 MB) that the receiver silently dropped at ≈2 MB.
- **`lib/scriptos/broadcast.ts`** — `broadcastMergedUpdate` returns `'failed'`
  for a state past the line, without opening a channel, instead of `'sent'`
  for a message every receiver would drop. The merge is already saved; the
  next-save path carries it, as for any missed broadcast.
- **`backlog-detail.md` §3.33** — the stale "skipped above 200 000 characters"
  wording removed (the merged state has travelled chunked since 2026-11-16);
  the private-channel entry now cites `20261116000300_private_realtime_all.sql`
  as the current policy source; the fix above recorded; leftovers (i) the
  garbled merge and (ii) the cowriting flake stay open, and (iii) the
  two-browser live check gains an exact done-when.

One residual, recorded rather than hidden: if two devices with saved state
open the same script in the same few seconds after a content-only append —
both reconciling before either's first save lands — each folds the appended
words in as its own items, and the words can stand twice once the documents
merge. The window closes the moment one of them saves (the other's setup then
applies the stored state, and its reconcile sees the words already present).
It trades a narrow, visible duplication for the certain, silent deletion this
fix removes; leftover (iii)'s live check is where it would be seen.

Untouched, deliberately: channel privacy (holds: `private: true` in `sync.ts`,
`broadcast.ts`, `beats.ts`; migration `20261116000300`; the persona test in
`tests/integration/script-channel.test.ts`), the queue/provider merge in
`storage.ts` / `writeMerged`, and the pinned plain-upload behaviour in
`storage.merge.test.ts` — that upload path is intentional, not this bug.

## Decisions

- **One PR for both fixes.** They interlock only through `sync.ts`; the repo
  rule is one PR per batch, and the cap alignment is what makes the reconcile's
  larger merged states safe to broadcast.
- **No e2e spec added.** The unit tests simulate the exact open-and-save
  sequence (state restored, server state applied, column reconciled, document
  text is what the save writes). An e2e case for the closed-editor append
  belongs with leftover (iii)'s live check, which needs real browsers against
  the preview — named in the PR, not silently skipped.
- **This PR is left open.** It is a Large, high-care CRDT change (RULES 11):
  the manual review is documented in the PR description; it does not
  self-merge.

## Verified

Locally, in a fresh clone at `78f6c128` + this branch: `npm ci`; the three new
test groups failed before the fix (11 tests) and pass after; the full unit
suite, `npm run typecheck`, `npm run lint` and `npm run build` — results in
the PR description. Not verified: two real browsers against the preview
(backlog 3.33 leftover (iii), which also stands as the done-when for the
garbled-merge leftover (i)).
