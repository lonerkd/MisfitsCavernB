# Session — 2026-10-12: /admin/crafts

Admins can now add and remove film crafts without a deploy: `/admin/crafts` (a link on the admin pages' nav). Name, department (pick or type), colour, above the line; checked before saving (`lib/crafts/validate.ts`, 3 unit tests) with plain-words errors, duplicates refused ignoring case, removal confirmed. People and jobs that already use a craft keep the name — removing only stops it being offered. The database calls are in `lib/supabase/admin-crafts.ts`.

**Verified:** typecheck, eslint, unit tests; the `admin-crafts` spec on a real build (an admin adds, sees it in its department, is refused a duplicate, removes it; a member is turned away *and* the database refuses their insert). **Not verified:** CI (billing). **Note:** this checkout's `node_modules` was wiped mid-session by another session's install — `npm ci` brought it back; concurrent sessions in one folder do that.

**Left (BACKLOG 3.14):** the other catalogues (project formats, brief questions, channel presets) and moderation (report, hide, ban).
