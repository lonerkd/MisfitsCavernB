# Session — 2026-10-27: guest-review comment throttle (follow-up to the flags PR)

Copilot's review of the flags-on PR (it landed after the merge) named two real
things: stale "admin-only" notes in `lib/flags.ts` (fixed) and no abuse control
on the guest comment path. Comments were already capped at 200 per link; now
`internal.notify_review` tells each recipient at most 5 "New comment"
notifications per 10 minutes (comments are all kept; decisions never throttled).
Migration `20261031000200_review_comment_throttle.sql`, persona test
(8 comments → 5 notifications, all 8 stored).

**Not done:** a per-IP limit (an edge/proxy layer); the database load of 200
comments per link is bounded but not per-visitor.

**Follow-up (Copilot, after the merge):** the count-then-insert was not atomic;
`20261031000300_review_throttle_lock.sql` serialises it per recipient with a
transaction advisory lock, and the test now fires a simultaneous burst and
asserts all 14 comments are stored while the notifications stay at 5.
