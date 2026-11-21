# Session - 2026-11-21: the Lounge redesign (plan L5)

The rail is three labelled, collapsible areas (Productions, Community, People) under a pinned *Learn / What's new* link to `/hub`; each shows its unread count and remembers open or shut on the device. Rows are 44 pt on touch and show unread, private, announce-only and (when you are in it) who is in the voice room. People starts a direct message from a name search (`findPeopleByName`) and lists open, unread and this-visit conversations. A phone gets the rail as its home screen, a pushed full-screen conversation and a full-screen thread sheet inside the safe areas; held sideways, the rail and conversation share the screen only with 700 px usable (`lib/lounge/rail.ts`). Empty states teach and act (no conversation, empty channel with Manage for managers, no production with a link to Projects, no DMs with the finder, empty voice room), and a first-visit banner points to the hub.

Also: the landscape composer no longer adds the bottom inset the room above already reserves.

**Not built, on purpose:** per-channel mute and pin do not exist in the database, so the rail shows none (a migration would be its own change); a voice room's roster is only visible from inside it (peer to peer, no server-side presence). There is no Learn route yet: both links go to `/hub`, which redirects to Community. The phone's back is the button, not the browser's back gesture.

**Verified:** `npx tsc --noEmit`, eslint on the changed files, `npx vitest run components/lounge lib/lounge app lib/os components/phone` (new tests for the rail, empty states, welcome and the CSS rules). **Not verified:** looked at in a browser, on a phone or sideways.
