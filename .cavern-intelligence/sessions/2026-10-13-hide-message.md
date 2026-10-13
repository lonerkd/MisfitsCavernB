# Session — 2026-10-13: hide a reported message

From `/admin/reports` an admin now reads the reported message (even in a channel they are not in — **only because someone reported it**) and can **hide** it: everyone in the channel then reads "[Removed by an admin]" in italic, with no edit or report controls; the admin keeps the words and can **bring it back**. Confirmed; audit-logged.

- **Design:** hiding replaces `messages.content` with the notice and keeps the original in `hidden_messages` (admin-only SELECT), so no client — not even a stale realtime payload — ever receives the words. `messages.hidden_at` marks it. `edit_message` refuses a hidden message (the sender cannot write the notice into something else); deleting the message takes the kept original with it.
- **Schema** `20261013030000_hide_message.sql`: the column, the table (RLS from birth), `admin_reported_message(report)` and `admin_hide_message(message, hidden)` (definer, admin-gated — on the allowlist in `database-and-security.md` §2.D), the `edit_message` guard. Persona test `hide-message.test.ts` (8): reading needs admin *and* a report, only admins hide, the notice replaces the words for others, the original is admin-only, the sender cannot edit it back, bring-back restores it, delete cascades. Full integration suite green. Snapshot and types regenerated.
- **App:** the queue's message block and buttons; the Lounge renders hidden messages muted without edit/report. `hide-message` e2e: the admin reads it, hides it, a member's Lounge shows the notice and not the words, the admin brings it back.

**Owner action:** apply `20261013030000_hide_message.sql` to production after `20261013020000` (STATE has the order), then the drift workflow. Worth a line in `/privacy` when the lawyer reviews it: admins can read a message that has been reported.

**Verified:** typecheck, eslint, integration, `hide-message` + `reports` + `lounge` e2e on a real build. **Not verified:** CI (billing); production.
