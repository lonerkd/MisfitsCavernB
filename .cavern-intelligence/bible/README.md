# The Cavern — Bible

Everything The Cavern is, top to bottom: every page and state, every feature,
system, rule and connection, with a picture of each screen. Written
2026-10-06 from the code, the database and the running app (the demo world).

> **The Cavern** is the product: a production suite for independent
> filmmakers. **Misfits Cavern** is the company and media-production brand
> that makes it (owner decision, 2026-10-06; the code still says "Misfits
> Cavern" in ~30 places — BACKLOG 3.12).

## How to read it

- **Chapters** (below) say what each part is *for*, what it looks like, the
  states it can be in, the rules that govern it and how it connects to the
  rest. They link to the deep docs in `..` for the engineering detail rather
  than repeat it.
- **[inventory.md](inventory.md)** is generated from the code: every route,
  its access tier, the files it's built from, the tables, functions, buckets
  and realtime channels it touches, and the e2e specs that open it. Trust it
  over the chapters for *what touches what*.
- **[screens/](screens/README.md)** holds a desktop (1440) and phone (390)
  picture of every page on the demo world, dark theme. Long pages are cut at
  2400 / 3200 px. Fixed chrome (the phone tab bar, the island) appears once,
  wherever the viewport was when the full-page shot was stitched — in the
  middle of a long phone page is an artefact of the shot, not the layout.
- **[audit-2026-10-06.md](audit-2026-10-06.md)** is the state check: what's
  healthy, what's drifting, what's next.

## Refreshing it

```bash
npm run bible                       # inventory.md, from the code (seconds, no stack)
npm run stack:up -- build           # local Supabase + the app on :3000
npm run bible:shots                 # every screen again (≈4 min; local only)
npm run bible:shots -- lounge editor   # just these slugs
```

Rebuild the inventory after adding, moving or rewiring a page; retake the
shots after a visible change; edit the chapter that owns the part in the same
PR (the hub contract in `../INDEX.md`).

## The ecosystem

One database, one project model, many surfaces. A project moves through five
phases; each phase opens the tools that matter then, and every tool reads and
writes the same rows, live.

```
                            ┌──────────── The Cavern ────────────┐
   signed out               │                                    │   admin
 ┌───────────────┐          │  Today · Home · Projects ── brief  │ ┌───────────┐
 │ Landing       │  /auth   │      │          │        └─ guides │ │ Dashboard │
 │ Showcase      │ ───────► │      ▼          ▼                   │ │ Users     │
 │ Privacy/Terms │ /welcome │  ScriptOS ◄──► Studio ◄──► Lounge   │ │ Analytics │
 └───────────────┘          │  (editor)  scenes │ (production,    │ │ Errors    │
 ┌───────────────┐          │     ▲   breakdown │  post, promos,  │ │ Audit log │
 │ /shared  /p   │ ◄─share──┤     └── split ────┘  share)  voice  │ └───────────┘
 │ /s  /m  (anon)│          │  Crew · Jobs · Portfolio · Profile  │
 └───────────────┘          │  Call sheets (/call) · Soundtrack   │
                            │  shell: island · tab bar · ⌘K ·     │
                            │  notifications · Pocket · themes    │
                            └──────────────┬─────────────────────┘
                                           │  supabase-js (RLS on every row)
                            ┌──────────────▼─────────────────────┐
                            │ Postgres: 62 tables, 47 functions,  │
                            │ Realtime, Storage (project-media,   │
                            │ project-papers, sfx_library), Auth  │
                            └─────────────────────────────────────┘
```

**The threads that tie it together** (each is a chapter section):

| Thread | From → to |
|---|---|
| Scenes | script headings → `scenes` → Studio scenes, breakdown, readiness, schedule, call sheets, on set, cut notes |
| Breakdown | tags in the script → elements → budget lines, readiness, call sheets |
| People | crafts → profiles, jobs, project crew → casting, call sheets, credits, Lounge audiences |
| Phases | project data → milestones → which tools are open → guides, island, Today |
| The brief | answers + `project_context` → next moves in every tool, role posts, channel suggestions |
| Sharing | visibility + `media.shared` → `/shared`, `/m`, showcase, press kit, portfolio |
| Notifications | call sheets, hiring, replies, mentions → bell, Today updates, `/call`, Lounge |

## Chapters

| # | Chapter | Pages |
|---|---|---|
| 1 | [Shell and navigation](01-shell.md) | island, phone tab bar, ⌘K, split, themes, notifications, Pocket |
| 2 | [Account: sign-in, welcome, profile, settings](02-account.md) | `/auth`, `/auth/callback`, `/welcome`, `/profile`, `/settings` |
| 3 | [Home, Today and projects](03-home-today-projects.md) | `/`, `/today`, `/projects`, `/projects/[id]`, `/projects/[id]/pitch` |
| 4 | [ScriptOS — the script editor](04-scriptos.md) | `/editor` |
| 5 | [The Studio](05-studio.md) | `/studio` (every tab and production view), `/call/[id]` |
| 6 | [The Lounge, voice and sound](06-lounge-and-sound.md) | `/lounge`, `/soundtrack` |
| 7 | [The network: crew, jobs, portfolio](07-network.md) | `/crew`, `/crew/[id]`, `/jobs`, `/jobs/[id]`, `/portfolio`, `/portfolio/manage`, `/showcase` |
| 8 | [Public pages and sharing](08-public.md) | landing, `/shared/[token]`, `/p/[token]`, `/s/[token]`, `/m/[id]`, `/privacy`, `/terms` |
| 9 | [Admin](09-admin.md) | `/admin/*` |
| 10 | [Platform systems](10-platform.md) | data layer, RLS, realtime, offline, errors, notifications, integrations, install, CI |
| 11 | [Rulesets](11-rules.md) | who can do what, phase gating, design rules, code rules |

**Counts** (inventory, 2026-10-06): 34 pages · 5 API routes · 62 tables · 47
database functions · 39 e2e specs · 472 unit tests · 289 integration tests.
