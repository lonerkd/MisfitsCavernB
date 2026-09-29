# Misfits Cavern — Project State

> Only the latest sessions and open issues live here (this file is injected into every session). Older sessions: [STATE-history.md](STATE-history.md).

## Latest Session — Type, layout and imagery tokens

Direction in `docs/DESIGN_DIRECTION_2026-09.md`. Text floor 11px, radii and container widths snapped to the scales in `globals.css`, Courier Prime loaded as `--script`, lint enforces text size and radius. **Checked in a browser** (local Supabase, production build, 1280px): breakdown and stripboard show no wrapping or overflow and pass axe; stripboard strip headings and cast lines ellipsize by design in the 256px day column. Narrower widths not yet checked.

## Latest Session — The Lounge: who each channel is for, guides, the community

Migration `20260928010000_community.sql` — **apply to production before merging**.

- **Who it’s for** (`channels.audience`, enforced by `internal.can_view_channel`).
  Project channels: *Whole team*, *Owners* (creator + leads), *Above the line*
  / *Below the line* (by the member's craft — `crafts.above_the_line`: Director,
  Producer, Writer, Story editor, Actor, Voice actor; owners see both),
  *Guests* (members added as viewers, plus owners) and *Public* (anyone signed
  in can read — a production's updates; listed under "Other productions").
  Community channels: *Everyone* or *Admins*. Chosen when creating a channel
  and changeable in Manage. "Private" stays an invite-only overlay.
- **Guides** — a channel type for FAQ, the start-here tour and tutorials. It
  reads as a document (each post a section, first line its heading); only
  whoever runs it writes (and can remove a section); no chat box for readers.
- **The community**: admins create and run site-wide channels (nobody could
  before). Starters: start-here, faq, tutorials (guides — empty until an
  admin writes them), announcements, general, craft-talk, crew-call,
  feedback, showcase, the-lounge (voice), admins. Existing ones kept.
- **Fixes**: a private community channel was visible to everyone signed in —
  now members (and admins) only. Messages can be removed by their author or
  whoever runs the channel (there was no delete policy).
- **Lounge refetch loop (live bug)**: the page reloaded messages and profiles
  in a tight loop for every signed-in user (an effect set the user object it
  depended on), eventually freezing the tab and hammering the DB. Fixed.

## Earlier — Credits & the press kit

Migration `20260928000000_credits.sql` — applied to production; PR #72 merged.

- Credits come from the work itself, never typed twice: projects someone
  created, the crew they were confirmed on (their craft) and the parts they
  were cast in.
- **Crew profiles** list them ("Salt (2026) — Gaffer · Plays MAYA"); on your
  own profile, **Add to portfolio** makes a portfolio entry linked back to the
  project (title, format, year, your credits).
- **Share page = press kit**: festival laurels ("Official selection" for
  accepted submissions) under the logline, and Cast & crew by department.
- Privacy: outsiders see a project in someone's credits only when it's
  public; teammates see their team's. The press kit only exists for
  link/public projects.

## Earlier — The writing loop

Migration `20260927110000_writing_loop.sql` — applied to production; PR #71 merged.

- The editor's daily goal and sprint were cosmetic (a goal of 1,000 fixed in
  code measured against the script's *total* size; the sprint couldn't be
  restarted without a reload; nothing was saved). Now:
- **Today**: words actually typed today (a paste or a loaded file doesn't
  count) against your own goal (click to change; saved to your profile).
- **Streak**: consecutive days you met your goal (each day judged by the goal
  you had that day), best streak, and the last four weeks as a grid.
- **Sprint**: your length (5–120 min), start / pause / reset, words this
  sprint (also in the header), logged when it ends.
- **Earned**: first goal, 7- and 30-day streaks, a 2,000-word day, 10
  sprints, 20,000 words — all derived from your real days.
- Saved a few seconds after typing pauses, every 20s, and when you leave.

## Known Issues

1. Leaked-password protection — dashboard toggle, owner must flip it (also flagged by security advisor)
2. README / production branding / docs polish — partial pass done, could use another round
3. `tsconfig.json` still `strict: false` (audit plan M2.2)
4. `npm audit`: 5 vulnerabilities (1 moderate, 4 high) reported at install — triage pending
5. Security advisor WARNs: public buckets (`sfx-library`, `studio-assets`) allow listing; `has_discord_webhook` executable by anon — review intent

