# Misfits Cavern — Agent Rules

**Misfits Cavern** is a production suite for indie filmmakers — one interconnected system, not bolted-together tools. You are its lead engineer + QA.

## Stack

Next.js 14 App Router · TypeScript · Tailwind CSS · framer-motion · Supabase (Postgres + RLS + Auth + Realtime + Storage) · WebRTC · Vercel

## Core Rules

- **No Mocks.** Every UI control must persist to real Supabase data. Cosmetic-only features must be removed.
- **Verify, Don't Claim.** After any change: `npx tsc --noEmit && npm run build` must pass. After RLS changes, test with persona-simulated SQL (owner, crew, outsider).
- **One Cohesive System.** All feedback via `useToast()`, all confirmations via `useConfirm()`. Never use `alert()`/`confirm()`. Account prefs in DB; localStorage for device-level only.
- **Security Floor.** Every table gets RLS from birth. Use `internal` schema helpers (`is_project_creator`, `is_project_member`, `can_access_script`). Wrap `auth.uid()` in scalar subqueries for InitPlan performance.

## Change Workflow

1. **Explore** — Read `.cavern-intelligence/sync-manifest.json` for file map. Read relevant source files.
2. **Check State** — Read `.cavern-intelligence/STATE.md` for current iteration context.
3. **Plan** — Identify files affected, understand RLS implications for DB changes.
4. **Implement** — Write code following conventions in `.cavern-intelligence/CLAW.md` and `.cavern-intelligence/playbook.md`.
5. **Verify** — `npx tsc --noEmit && npm run build && npm run lint`
6. **Sync** — `npm run sync-intel` to update manifest. Update `.cavern-intelligence/STATE.md`.
7. **Commit** — Clear message, branch → PR.

## Verification Commands

```bash
npm run dev        # dev server
npx tsc --noEmit   # type check
npm run build      # production build
npm run lint       # lint
npm run sync-intel # update file index
```

## Deep Context

Start at `.cavern-intelligence/INDEX.md` — the knowledge-hub front door. It
routes to everything: architecture, DB/RLS, tools & access, routing, and
conventions.

| File | When to Read |
|---|---|
| `INDEX.md` | **Session start — front door + read order** |
| `CLAW.md` | Session start — core working rules |
| `overview-and-goals.md` | Understanding product vision |
| `tools-and-access.md` | Tools, MCP servers, permissions, skills, env |
| `routing-and-surface.md` | Route map, gating tiers, providers, module ownership |
| `conventions.md` | Coding patterns usually kept inline (data layer, toast/confirm, migrations) |
| `database-and-security.md` | DB schema + RLS architecture |
| `design-tokens.md` | UI work — colors, typography, components |
| `playbook.md` | Detailed change workflow |
| `scriptos-engine.md` | ScriptOS editor work |
| `lounge-and-audio.md` | Lounge + WebRTC work |
| `studio-and-preproduction.md` | Studio module work |
| `sync-protocol.md` | Multi-agent sync rules |
| `STATE.md` | Current iteration state |

## Testing Personas

- **Sam** — project owner, full CRUD, happy path
- **Jordan** — co-writer/crew, collaborative access, restricted destructive actions
- **Riley** — outsider, must see nothing project-scoped (P0 if leaked)
