# Session - 2026-11-22: print a past review version of an ad deliverable (BACKLOG 3.32, its last small item)

Each deliverable card on Share gains a **Past version…** picker (only when the piece has sent versions). Choosing one prints that version through the same campaign print as the rest, from `item_versions.snapshot` (the database's immutable copy, readable by anyone on the project under the existing RLS), titled `(vN)` and carrying that version's state, never today's text. `getVersionSnapshot` in `lib/review/versions.ts`. No migration. Also fixed a stale line in 3.20: no classifier gap is pinned any more.

**Verified:** typecheck; `e2e/ad-export.spec.ts` (2 of 2) against the local stack and a production build, including a new case: propose and send a version, change the piece, print the past version, and the printout has the sent text, not the new text, and `(v1)`. **Not looked at:** the picker by eye (the card's layout with the extra select, desktop and phone).
