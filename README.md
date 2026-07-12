# Misfits Cavern

Production suite for independent filmmakers. Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + RLS + Auth + Realtime + Storage) · Vercel.

**Live:** [misfits-cavern-b.vercel.app](https://misfits-cavern-b.vercel.app)

## Setup

```bash
npm install
cp .env.example .env.local   # add Supabase keys
npm run dev
```

## Commands

```bash
npm run dev         # dev server
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # vitest
npm run test:e2e    # playwright
```

## Map

```
app/                  Pages (App Router)
components/           Shared UI
lib/scriptos/         Editor engine: parser, exports, revisions, sync, scheduling
lib/supabase/         Data layer
lib/context/          React context providers
lib/permissions/      Client-side access gating
lib/webrtc/           Voice room mesh
e2e/                  Playwright tests
supabase-schema.sql   Database schema + RLS reference
docs/                 Audit reports
```
