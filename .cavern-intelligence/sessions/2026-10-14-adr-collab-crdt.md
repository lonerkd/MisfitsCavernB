# 2026-10-14 ADR: conflict-free co-writing

Cross-codebase survey (the pre-rebuild repo, this repo's July archive branch,
and the local-first portfolio cut), then an ADR distilling what it found.

**What changed:** `adr/0006-conflict-free-co-writing.md` (Proposed). Nothing
in the app changed.

**What the survey found:** this repo's ScriptOS parser is a strict superset of
every other codebase's (same KNOWLEDGE dictionaries plus `TRANSITION_BARE`,
the decode state machine, eighths, and a lossless Fountain read where the
archive branch's import preprocessor strips sections/synopses/boneyard).
The editor crash boundary and per-format phase labels were already absorbed in
the core-state rebuild — the archive branch's versions are the earlier ones.
The one real gap is co-writing: broadcast last-write-wins with a conflict
prompt, versus the legacy repo's Yjs CRDT (crude, but the right direction).

**Verified:** by reading the four parsers/sync systems side by side and
grepping `main` for each candidate feature (`EditorErrorBoundary`,
phase labels, Openverse, jsPDF, table-read, Pill zones) — all present in
`main`, most in fuller form.

**Not verified:** no CRDT prototype was built or run; the ADR is a proposal,
not an implementation.

**Next, if the owner accepts the ADR:** a `yjs` provider over the existing
`script_${id}` Realtime channel, a scoped undo manager, and removal of the
conflict heuristic in `lib/scriptos/sync.ts`.
