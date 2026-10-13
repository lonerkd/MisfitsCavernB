# Session — 2026-10-13: /admin/channel-presets

Admins can add and remove the channels the Lounge suggests to a production by phase, without a deploy: `/admin/channel-presets` (CHANNELS in the admin nav). Name → the channel's name, type, who sees it, who posts, phase, topic, and one line on why a production wants it — checked in words before saving (`lib/lounge/presetCheck.ts`, 6 unit tests), a name already in use refused, removal confirmed; channels already made from a suggestion are untouched. Database calls in `lib/supabase/admin-presets.ts`.

**Verified:** typecheck, eslint, unit tests; the `admin-channel-presets` spec on a real build (add, see it under its phase, refused duplicate, remove; a member is turned away and the database refuses their insert). **Not verified:** CI (billing).

**Left (BACKLOG 3.14):** project formats and brief questions admin screens; acting from the reports queue.
