# Misfits Cavern

Production suite for independent filmmakers: script, breakdown, schedule, call
sheets, money, paperwork, the Lounge and the day on set as one connected
system. Next.js 16 (App Router, React 19) · TypeScript · Tailwind · Supabase
(Postgres + RLS + Auth + Realtime + Storage) · Vercel.

**Live:** [misfits-cavern-b.vercel.app](https://misfits-cavern-b.vercel.app)

## Setup

```bash
npm install
cp .env.example .env.local   # add Supabase keys
npm run dev
```

Or run everything locally — Docker, Supabase with every migration applied, and
the app built against it on :3000:

```bash
npm run stack:up             # start what's missing
npm run stack:up -- build    # also rebuild the app after code changes
```

## Commands

```bash
npm run dev                # dev server
npm run build              # production build
npm run typecheck          # tsc --noEmit
npm run lint               # eslint (React Compiler rules are errors)
npm run test               # vitest unit tests (incl. hooks, in jsdom)
npm run test:integration   # RLS/persona tests against the local database
npm run test:e2e           # playwright (E2E_LOCAL_STACK=1 for the local stack)
npm run budget             # page-weight budget, after a build
npm run db:types           # regenerate lib/supabase/database.types.ts
npm run sync-intel         # refresh .cavern-intelligence/sync-manifest.json
```

## Map

```
app/                   Pages (App Router)
components/            UI, by module (studio/, editor/, lounge/, mobile/, …)
lib/os/                Session, projects, permissions — the core state
lib/supabase/          Typed data access, one module per table group
lib/scriptos/          Editor engine: Fountain parser, exports, revisions, sync
lib/studio/            Studio data: live rows, scene sync, shoot days, on-set offline
lib/hooks/             Shared React hooks (useLoad, useOnChange, useDeviceValue, …)
lib/webrtc/            Voice room mesh
supabase/              Migrations (schema source of truth), fingerprint, local config
tests/integration/     Database tests as owner, crew and outsider
e2e/                   Playwright tests
.cavern-intelligence/  The knowledge hub — start at INDEX.md; open work in BACKLOG.md
docs/                  Design direction and dated audits (historical snapshots)
```
