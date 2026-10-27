# Session — 2026-10-27: Fountain round-trip property

Added a deterministic generated property test covering 32 Fountain documents
with title pages, numbered and forced scene headings, dialogue/caret dual
dialogue, forced action, transitions, centered text, lyrics, synopses, sections,
notes, boneyard, and page breaks. Each checks structural preservation through
parse/serialize/parse and canonicalization idempotence.

The private corpus and per-writer memory remain blocked on owner-provided
rights-cleared scripts and the memory-scope decision. The official Fountain
specification example suite is still a separate validation item.

The Studio now also reuses its selected script's project context for the
Character Bible and Casting board character lists, keeping those readers aligned
with the editor and scene-index sync.
