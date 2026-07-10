# Misfits Cavern

**The production suite for independent filmmakers.** Write the screenplay, plan the shoot, run the crew, and market the film — in one interconnected workspace built for micro-budget productions.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel)](https://misfits-cavern-b.vercel.app)

**Live:** [misfits-cavern-b.vercel.app](https://misfits-cavern-b.vercel.app)

---

## The Suite

### ✍️ ScriptOS — the Editor
Industry-standard screenplay editing with real collaboration:
- Fountain-aware editor: scene headings, dialogue, dual dialogue, autocomplete, revision mode, script templates
- **Live co-editing** — presence avatars, shared cursors, realtime content sync, and an explicit conflict prompt when two writers collide
- Cloud revisions (lock drafts, restore any version), shared **Title Page** and **Character Bible** visible to every co-writer
- Exports: Fountain, Final Draft (.fdx), PDF, plain text
- Focus mode, typewriter mode, writing sprints, stats board

### 🎬 The Studio
Pre-production, for real:
- Concept boards with lightbox, board grouping, and scene linking
- Beat boards that push directly into ScriptOS as script scaffolds
- **Scene schedule with 1st-AD auto-scheduling** — groups by location, clusters night shoots, packs shoot days by page-count capacity
- Import the scene list straight from the screenplay; call sheets and schedule export to print/PDF
- Character bible, campaigns, and asset library with cloud uploads

### 🛋️ The Lounge
A Discord-class space wired into your projects:
- Per-project **text and voice channels** plus community channels
- Private channels with member rosters and per-member post/manage permissions; announce-only channels
- Threads, reactions, typing indicators, DMs, online presence
- **Real voice** — peer-to-peer WebRTC audio with mute and speaking indicators, no external service

### 🎯 And the rest
- **Projects hub** — kanban production board, tasks, budget, milestones, crew management
- **Jobs board** — post roles, apply, manage applications
- **Crew directory** — find collaborators by role and availability
- **Portfolio** — public portfolio pages with media, plus tokenized public **share links** for scripts (`/s/<token>`) and portfolios (`/p/<token>`) that work logged-out

## Stack

- **Next.js 14** (App Router) · React · TypeScript · framer-motion
- **Supabase** — Postgres with row-level security on every table, Auth, Realtime (live co-editing, chat, presence, WebRTC signaling), Storage
- **Vercel** — production deploys from `main`

No mock data anywhere: every feature is backed by real persistence and enforced by RLS. Access control lives in the database (SECURITY DEFINER helper functions like `is_project_member`, `can_view_channel`, `can_access_script`), not in client code.

## Getting Started

```bash
npm install
cp .env.example .env.local   # add your Supabase keys
npm run dev
```

Required environment variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (publishable) key |

Database: `supabase-schema.sql` is the schema reference (tables, RLS policies, triggers, helper functions). Live changes are applied as named Supabase migrations and mirrored there.

```bash
npm run dev         # dev server
npm run build       # production build
npx tsc --noEmit    # type check
npm run lint        # lint
npm run sync-intel  # update file index (after adds/renames/deletes)
```

## Testing

```bash
npx playwright test          # e2e smoke tests
npx playwright test --ui     # interactive mode
```

Tests use three personas: **Sam** (project owner, full CRUD), **Jordan** (crew, collaborative), **Riley** (outsider, must see nothing project-scoped). See `.cavern-intelligence/CLAW.md` for persona details.

## Architecture Notes

- **RLS-first security** — every table has row-level security; project scoping flows through recursion-safe SECURITY DEFINER helpers. Policies wrap `auth.uid()` in scalar subqueries for per-statement (not per-row) evaluation, and all foreign keys are indexed.
- **Realtime** — Supabase Realtime carries chat (`postgres_changes`), co-editing and typing (`broadcast`), online status (`presence`), and doubles as the WebRTC signaling channel for voice rooms.
- **Offline-friendly editor** — script content, revisions, title page, and character bible are DB-primary with a localStorage cache for instant paint and offline fallback.
- **Cohesive UX** — one toast system, one confirm-modal system, account-level preferences in the database, device-level preferences in localStorage.

## Repo Map

```
app/              Pages (App Router): editor, studio, lounge, projects, jobs, crew, portfolio, auth…
components/       Shared UI (Toast, Confirm, Avatar, Button, Input, command palette…)
lib/scriptos/     Editor engine: parser, exports, revisions, sync, scheduling
lib/supabase/     Data layer: auth, channels, messages, studio, notifications
lib/webrtc/       Voice room mesh (WebRTC over Supabase Realtime signaling)
e2e/              Playwright end-to-end smoke tests
supabase-schema.sql   Database schema + RLS reference
AGENTS.md         Universal AI agent rules (read by Copilot, Claude, Cline, Cursor, etc.)
.cavern-intelligence/  Knowledge hub: architecture, DB schema, design tokens, playbook, state
```

## AI Agent Development

This repo supports every major AI coding tool through a single source of truth:

| File | Read By |
|---|---|
| `AGENTS.md` | Cline, Cursor, Windsurf, Zed, Codex, OpenCode, Gemini |
| `CLAUDE.md` | Claude Code |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.cavern-intelligence/` | All tools (deep reference) |

Every agent starts by reading `AGENTS.md` for project rules, then references `.cavern-intelligence/` for architecture deep-dives. After any change, run `npm run sync-intel` to update the file index. See `.cavern-intelligence/playbook.md` for the full change workflow.
```
