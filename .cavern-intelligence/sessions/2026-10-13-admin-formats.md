# Session — 2026-10-13: /admin/formats

Admins can add and remove project formats without a deploy: `/admin/formats` (FORMATS in the admin nav). Name, one line (≤140), icon (the nine the suite draws), the script format it opens, and which phases it skips — checked in words (`lib/formats/check.ts`, 7 unit tests), duplicates refused ignoring case, removal confirmed; projects already made keep their format. Phase labels and skipped milestones are not edited here (still migrations). Database calls in `lib/supabase/admin-formats.ts`.

**Verified:** typecheck, eslint, unit tests; the `admin-formats` spec on a real build (add with a skipped phase, refused duplicate, remove; a member is turned away and the database refuses their insert). **Not verified:** CI (billing).

**Left (BACKLOG 3.14):** the brief-questions admin screen; hiding a message and suspending an account.
