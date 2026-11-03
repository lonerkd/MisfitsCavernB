# Community — one page for Today, the Hub, the Lounge, crew discovery and the Cavern's front door

Owner, 2026-11-03: merge Today, the Hub and the Lounge into one place, titled **Community**; it also holds crew discovery and what the current Home page shows (a preview of each product that doubles as a picker, and the platform stats); and a section for the Cavern's own Spotify playlists with a player in the page. Answered at the time: one page with sections (not tabs), Spotify's embedded player beside the existing global player, and the playlists are the four already in `lib/spotify/house.ts`.

## What is there today

| Page | Route | What it holds | Size |
|---|---|---|---|
| Today | `/today` | your day: on set, tasks, updates, the Lounge's unread, your projects | 284 lines |
| Hub | `/hub` (+ `/hub/[id]`, `/hub/help`) | the newsletter: What's new, Learn, status incidents, help cases | 107 + detail pages |
| Lounge | `/lounge` | channels, DMs, threads, voice: a live app, not a feed | 109 + 14 components |
| Crew | `/crew` | the talent directory: filters, cards, profiles | 276 |
| Home | `/` | the front door: hero, preview of ScriptOS / Studio / Lounge / Portfolio, platform stats, a live ticker | 469 |

About 130 places refer to `/today`, `/hub` and `/lounge`, so the routes stay where a deep link needs them.

## The shape

`/community`, one page of sections, in this order (a signed-out visitor sees only the last three):
1. **Your day** (Today's cards: on set, yours to do, updates, your projects).
2. **The Lounge, compact**: unread channels, who is on voice now, Open → the full-screen chat at `/lounge` (a live chat is somewhere you stay, so it keeps its own page and its `?channel=` deep links).
3. **What's new, Learn, status and help** (the Hub's feed, with the Hub's audience filter; an open incident shows at the top; posts and cases keep `/hub/[id]` and `/hub/help`).
4. **Crew discovery**: a strip of people looking for work and a way into the full directory at `/crew` (which keeps its filters and profiles).
5. **The Cavern**: the preview of each product as a picker (ScriptOS, Studio, Lounge, Portfolio) and the stats.
6. **Music from the Cavern**: the house playlists and Spotify's player in the page (built: `components/home/HouseMusic.tsx`).

Navigation shows one entry, **Community**, where Hub and Today were; the Lounge keeps its own entry only as a way into the full-screen chat (decision for the owner: whether it stays in the island's apps). `/today` and `/hub` redirect to `/community`; signed-in `/` goes to `/community` and the public front door stays at `/` for signed-out visitors (decision for the owner). The PWA still opens on the day: `start_url` becomes `/community` and the page opens at Your day.

## How it is built (the restructure's "thin pages")

Each page's content moves into a component under `components/community/` (Today's cards, the Hub feed, the compact Lounge, the crew strip, the picker and stats), the old pages become thin wrappers or redirects, and `/community` composes them. Nothing is rebuilt: the data layers (`lib/supabase/today`, `lib/hub`, `lib/supabase/messages`, the crew and stats readers) are the ones already there.

## Slices, each its own PR

1. **Music from the Cavern** on Today (this one): the playlists and the in-page player; moves intact into Community.
2. **Extract**: Today, the Hub feed, the crew strip and the picker/stats become components (no visible change), with their tests.
3. **`/community`**: the page composed from them, the compact Lounge, the redirects, the navigation and island entries, the sign-in landing, the PWA start; e2e for each section and each redirect; docs (`routing-and-surface.md`, the bible pages, the inventory).
4. **Polish**: the phone layout (one column, the day first), the island's context for the page, the screens in Paper and Cavern (`npm run theme:scan`).

## Done when

One Community page holds all six sections, the old routes redirect, the nav shows one entry, a persona spec covers a signed-out visitor, Sam and Jordan, and `npm run theme:scan` reads clean on it in Paper and Cavern.
