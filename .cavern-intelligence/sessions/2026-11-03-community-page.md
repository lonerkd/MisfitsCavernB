# Session — 2026-11-03: Community, one page

`/community` now holds what were Today, the Hub feed and the front door's previews: **Your day** (the day on set, tasks, the Lounge's unread, updates, your projects: `components/community/YourDay.tsx`, moved from Today), **What's new** (`HubFeed`, the Hub index), **Crew open to work** (`CrewStrip`, the directory's open profiles), **The Cavern** (`TheCavern`: the platform's numbers and a picker of ScriptOS / Studio / Lounge / Portfolio previews showing your own work, each with a way in) and **Music from the Cavern**. `/today` (query string kept, so the phone's share still lands) and the `/hub` index redirect to it; `/hub/<id>`, `/hub/help` and `/lounge` stay. One Community entry replaces Hub and Today in the island's apps, the top nav, the phone tab bar, the command palette, the install manifest (start page, shortcut, share target), push's fallback link and the sign-in landing.

**Found by the phone spec:** the Help link sat inside the hub's `tablist` (invalid ARIA child); it is now beside it.

**Assumed, for the owner to confirm:** signed-in `/` still shows the front door (not redirected); the Lounge keeps its own full-screen page. Home still loads its own stats (not yet shared with `TheCavern`).

**Verified:** typecheck, lint, unit suite, bundle budget (`/community` 332.5 of 482 kB), `e2e/community.spec.ts` plus island, mobile, chords, install, layout, today-owner and music specs in a real browser, `theme:scan` on `/community` (Paper, desktop and phone), looked at on both. No migration.
