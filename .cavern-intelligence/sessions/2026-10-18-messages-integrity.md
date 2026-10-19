# Session — 2026-10-18: messages write-path audit

Audit of every RPC and policy that writes `messages` (work order from the
`/lounge` study). Migration `20261018000000_messages_integrity.sql`.

**RPCs — checked, sound:** `edit_message` (sender only, still able to post,
not hidden), `pin_message` (channel managers or either side of a DM),
`admin_hide_message` / `admin_reported_message` (`caller_is_admin`),
`mark_lounge_read` (`can_view_channel`), `lounge_unread` (counts only, the
caller's channels and DMs), `search_lounge` (invoker; RLS decides).
`toggle_message_reaction` checked visibility but lost concurrent reactions
(no row lock) and let anyone add unlimited keys — now `for update`, max 20
distinct, empty `search_path`.

**The real gap was around the RPCs, not in them:** the INSERT policy only
checked sender and target, so crew could insert a message already pinned
(pins are managers-only), with reactions in other people's names, marked
edited or hidden, back-dated, carrying the legacy `channel_id` (which made a
DM readable by every signed-in user), or replying into another channel's
thread. `internal.messages_insert_guard` (BEFORE INSERT, invoker, acts only
when `current_user = 'authenticated'`) refuses all of it and stamps
`created_at`.

**Hidden messages:** a sender could delete a message an admin hid, and the
kept original cascaded away (the report's evidence). The DELETE policy now
excludes hidden messages and messages with a hidden reply. This reverses the
last case of `hide-message.test.ts`, which asserted the old behaviour; the
file's own header already said "the sender cannot undo it". Account deletion
still removes a person's DMs (definer, outside the policies).

**Read policy:** the legacy branch (`channel_uuid IS NULL AND channel_id IS
NOT NULL` → everyone) is gone; one SELECT policy, `messages read`. This only
narrows access, so any old production row ends up readable by its sender and
receiver, never by more people. Production wasn't queried (no access granted
this session).

**Tests:** `tests/integration/messages-integrity.test.ts` (Sam / Jordan /
Riley), `hide-message.test.ts` updated.

**Not verified in this session:** `npm` and Docker weren't available, so
`npm run db:reset`, `npm run test:integration`, typecheck, lint, test and
build were **not run**, and `supabase/schema.fingerprint` is **not
regenerated** (`npm run db:drift -- --update`; function hashes can't be
written by hand). No column changed, so the types don't change. CI's
`database` job will fail on the fingerprint until it's regenerated.
