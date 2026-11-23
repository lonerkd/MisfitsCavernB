# Session - 2026-11-22: The bell says what it held (BACKLOG 3.53, slice 2a)

Slice 1 records what happened to each push (`push_skipped`), but nothing showed it: a notification held for quiet hours looked the same as one that buzzed. The bell now says, under such an item, "Held for your quiet hours. It did not buzz your phone." and, when the push sender failed, "Your phone could not be reached for this one." Nothing is said for pushes that went out, ones the person switched off, or no registered device (no news in those). `lib/notifications/delivery.ts` (pure, tested) and `NotificationBell`; the `Notification` type gains the two read-only fields (`select('*')` already returned them). No migration, no new write path.

Not built, still 3.53: the batched push when quiet hours end (needs a scheduled flush, so a migration and pg_cron), the film-graph context notifications, timing from reading hours, "Why this?", the digest, email.

**Verified:** see the PR.
