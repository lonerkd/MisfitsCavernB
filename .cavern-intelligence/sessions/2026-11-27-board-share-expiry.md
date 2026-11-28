# Mood boards: expiring link, preview, pins, board access (BACKLOG 4.5)

**What shipped (branch worktree-agent-a351c51d4d0e3e273, not pushed):**
- `20261127000500_board_share_expiry.sql`: `mood_board_shares.expires_at`; UPDATE policy plus a column grant for `expires_at` only; `get_shared_board` and `internal.is_shared_media_object` ignore an expired link (null, like an unknown token).
- `20261127000510_board_access.sql`: `mood_boards.access` (open / view / private). Board and card policies rewritten; cards read their board through its own row security, so no new definer function. A member who does not shape the project can only keep a board open.
- `20261127000520_board_pins.sql`: `mood_board_pins` (composite FK to the card, RLS from the board's access, Realtime); `get_shared_board` returns each card's pins.
- UI: share expiry choice and change, "Pin a note" mode with a numbered pin list (edit, remove), a "Who can edit" select, read-only panel for others, pins and a "Pinned notes" list on `/b/<token>`, a link preview image.
- Tests: `tests/integration/mood-board-access-pins.test.ts` (persona), unit tests in `lib/studio/boards.test.ts` and `board-preview.test.ts`, `e2e/board-pins-access.spec.ts`.

**Decisions:** three access levels, not per-person grants (the roles already say who shapes); expiry and pins are writable by people who shape the project, as the link itself is; Google Images and AI suggestions stay out (licensing, outside service).

**Not done:** pins in print and the slideshow; `supabase/schema.fingerprint` was not rewritten (the shared local database held other branches' migrations); production and staging not applied.
