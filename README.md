<p align="center">
  <img src="public/icon-192.png" width="96" height="96" alt="The Cavern — two mountains and a crescent moon" />
</p>

<h1 align="center">The Cavern</h1>
<p align="center"><em>by Misfits Cavern</em></p>

<p align="center">
  The production suite for independent filmmakers — script, pre-production, the shoot,
  post and release in one connected system, not bolted-together tools.
</p>

<p align="center">
  <a href="https://misfits-cavern-b.vercel.app">Open The Cavern</a> ·
  <a href=".cavern-intelligence/INDEX.md">The knowledge hub</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="SECURITY.md">Security</a>
</p>

---

## What it is

One film, one system. A scene written in the **editor** is the same scene on the
**stripboard**, the **call sheet**, the **breakdown**, the **budget** and the
**day on set** — the cast, the places, the daylight and the continuity are real
linked records, not copies.

- **Write** — a screenplay editor with a deep, explainable reader (Fountain, FDX and PDF in; every format out), live co-writing, revisions, table read.
- **Prepare** — breakdown, locations with daylight, stripboard, schedule, call sheets, casting and crew, money.
- **Shoot** — On set works offline; Capture takes notes, photos and voice from a phone.
- **Together** — the Lounge (channels and voice), jobs, portfolios and share links for people outside the project.

## Quick start

You need Node 20+ and a [Supabase](https://supabase.com) project (or Docker for the local stack).

```bash
git clone https://github.com/lonerkd/MisfitsCavernB.git
cd MisfitsCavernB
npm install
cp .env.example .env.local     # add your Supabase URL and anon key
npm run dev                    # http://localhost:3000
```

Everything on your machine instead — Supabase with every migration applied, and the app built against it:

```bash
npm run stack:up               # starts Docker, Supabase and the app
npm run stack:up -- build      # also rebuild the app after code changes
```

Every variable is explained in [`.env.example`](.env.example); only the Supabase ones are required to run.

## Commands

| | |
|---|---|
| `npm run dev` / `build` / `start` | develop, build for production, serve the build |
| `npm run typecheck` · `lint` · `test` | the three checks every change passes |
| `npm run test:integration` | database tests as the owner, the crew and an outsider |
| `npm run test:e2e` | Playwright against a real build (`E2E_LOCAL_STACK=1` for the local stack) |
| `npm run db:reset` · `db:types` · `db:drift` | local database, generated types, schema fingerprint |
| `npm run sync-intel` | regenerate the agent entry files and the file map |

## How it's built

Next.js 16 (App Router, React 19) · TypeScript · Tailwind · Supabase (Postgres with row-level security, Auth, Realtime, Storage) · WebRTC · deployed on Vercel from `main`.

```
app/                   pages (App Router) — (public) share pages, (suite) the app
components/            shell/ and ui/ primitives, then one folder per module
lib/                   data access (supabase/), the script engine (scriptos/),
                       the film graph (film/), Studio data (studio/), os/ state
supabase/migrations/   the schema — the only way it changes
tests/integration/     RLS tests as owner, crew and outsider
e2e/                   Playwright specs
.cavern-intelligence/  rules, state, backlog, the bible of every screen, ADRs
```

Security is in the database, not the app: every table has RLS from birth, and an outsider sees nothing project-scoped. See [`SECURITY.md`](SECURITY.md) and [`adr/`](adr/).

## Working here

Start at [`.cavern-intelligence/INDEX.md`](.cavern-intelligence/INDEX.md) — the rules, the open work and the map. Changes go on a `claude/*` or feature branch, through a PR with a [conventional-commit](https://www.conventionalcommits.org) title and green CI. Details in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licence

Proprietary — see [`LICENSE`](LICENSE). © Misfits Cavern.
