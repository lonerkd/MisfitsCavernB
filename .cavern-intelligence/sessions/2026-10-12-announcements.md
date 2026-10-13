# Session — 2026-10-12: project announcements

The owner's project hub has a **Tell the team** box (owner view only — hidden for crew and while previewing as crew). Posting:
- puts the message in the project's `announcements` channel (made on first use: team audience, only managers post — so crew read it in the Lounge);
- sends each **confirmed** crew member a bell notification (`type: announcement`, links to the Lounge) — not the owner, not pending or declined crew, not outsiders.

`lib/supabase/announcements.ts` (+ a unit test for the notice text), `components/projects/AnnouncementBox.tsx`. Errors are said out loud (toast); an empty or over-2,000-character text is refused before anything is sent.

**Verified:** typecheck, eslint, unit tests; the new `announcements` spec on a real build (the channel and message, the crew notification, nobody else notified, crew have no box) and `view-as` pass. My first spec run failed because its own crew insert used an invalid role and the insert's error was not checked — the app was right; the spec now checks it. **Not verified:** CI (billing); Web Push delivery (not configured yet).

**Found:** `notify()` ignores a failed insert (BACKLOG 3.23).
