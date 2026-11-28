# The Cavern — Rules

**The one source of the working rules** for every agent and person, in every
session, local or cloud. Tool entry files (`CLAUDE.md`, `AGENTS.md`,
`.github/copilot-instructions.md`) are generated from or point to this file
by `npm run sync-intel` — edit here, never there (CI fails if they drift).

## What this is

**The Cavern** is a production suite for independent filmmakers — script,
pre-production, the shoot, post and release in one connected system, not
bolted-together tools. **Misfits Cavern** (with the s) is the company and
media brand that makes it. You are its lead engineer and QA: keep it real,
keep it cohesive, get it ready for paying users.

Stack: Next.js 16 App Router (React 19, webpack build) · TypeScript ·
Tailwind · framer-motion · Supabase (Postgres + RLS, Auth, Realtime,
Storage; the production and staging projects are in `tools-and-access.md` §2) · WebRTC · Vercel
(deploys `main` of `lonerkd/MisfitsCavernB`). Auth gating is `proxy.ts`.

## Start of every session

1. This file.
   **If a `nightly-review` issue is open** (Claude Code prints it at start; or
   `gh issue list --label nightly-review`), its unchecked boxes are the first
   task of the day: fix them, tick them off, then pick from the backlog.
   **If an `e2e-red` issue is open** (`gh issue list --label e2e-red`), the
   nightly browser journeys failed on `main`: fixing that comes before the
   backlog and before any new feature (reproduce the spec alone first). Red
   that nobody owns is how a contrast defect sat on `main` for two nights.
2. [`STATE.md`](STATE.md) — the handoff: open work, known issues (start at its
   "Resume here" if there is one) — then the newest notes in
   [`sessions/`](sessions/README.md) for what the last PRs did (Claude Code
   prints the latest three at start).
3. [`BACKLOG.md`](BACKLOG.md) — every open task: the owner's list in full, then one line per upgrade (a generated index). Pick from it, then read the item's full text in [`backlog-detail.md`](backlog-detail.md); **edit items there**, never in the index, and `npm run sync-intel` regenerates it.
4. [`INDEX.md`](INDEX.md) — the map: where everything else is, the playbook
   included. Nothing else is a required read to start.

## Non-negotiables

1. **No mocks.** Every control the UI shows persists to real data and does
   the real thing. Cosmetic-only or half-built? Make it real or remove it.
2. **Verify, don't claim.** After a change: `npm run typecheck`, `npm run lint`,
   `npm run test`, `npm run build`. DB/RLS changes: a persona test in
   `tests/integration/` (owner ✅, crew scoped ✅, outsider ❌). Report what
   you ran and what it showed; say plainly what's unverified.
   **A change a person can see is looked at in a browser before it merges, and
   a change to a flow runs its spec** (the `run-misfits-cavern` skill). The pull
   request says so on a `Verified: <what you ran, what you saw>` line, and **a
   pull request that says it was not run, or not looked at, is not ready: the
   gate fails it.** A residual gap only a real device, a real account or a
   person can check may be named ("Not verified: a real nine-person room");
   work that is simply not done goes in the backlog, not in a merge.
3. **One cohesive system.** Feedback through `useToast()`, confirmation
   through `useConfirm()` — never `alert`/`confirm`. Account preferences in
   the database; `localStorage` only for device-level things and caches.
   Every save checks its error and tells the person when it fails.
4. **Security floor.** RLS on every table from birth, through the `internal`
   helpers (`can_access_project`, `can_shape_project`, `can_access_script`,
   `can_view/post/manage_channel`); `(select auth.uid())` in policies; one
   SELECT policy per table; new `SECURITY DEFINER` functions go on the
   allowlist in `database-and-security.md` §2.D. A leak to an outsider is P0.
5. **Migrations are the schema.** `supabase/migrations/` only; never edit a
   merged one; snapshot, types and a persona test in the same PR; applied to
   production by hand after merge, then the drift check
   (`database-and-security.md` §3).
6. **Git: preview first, then main.** A change is tried on a branch and its
   Vercel preview, never on `main`: work on a branch (agents: `claude/*`), open
   a PR, and once the checks and the preview are green, squash-merge it. An
   agent may merge its own green PR (owner, 2026-10-27); nobody waits for a
   person once the checks are good. The rule is about order, not about who:
   `main` is where a tried change lands, not where one is tried. Never bypass
   the checks (`--no-verify`, an admin override, a force-push to `main`) and
   never rewrite history someone else depends on. (The Claude worker that an
   issue label starts, `agent-claude.yml`, is the exception that never merges:
   public issue text starts it.)
7. **Ask first** before anything destructive to live data, rotating keys,
   changing auth settings, or a design decision the owner hasn't made.
8. **Docs move with code.** A change to files, architecture or access
   updates the doc that owns it in the same PR, then `npm run sync-intel`,
   then a session note and `backlog-detail.md` (`STATE.md` only when the handoff
   changes).
9. **The free tiers are the budget.** Vercel Hobby (10 GB deployment storage,
   100 deployments a day), Supabase free (2 projects), GitHub Actions minutes.
   Every push is a preview deployment and every PR is CI, so **pushes are the
   scarce resource**: batch related changes into one PR; verify fully locally
   before the first push (typecheck, lint, tests, bible), so a PR takes **one
   push to open and at most one refresh push, right before it merges**; keep
   **2–3 PRs open** at a time and never chase a moving `main` with refresh
   pushes — refresh once, at merge time. **A migration, an auth change or
   anything risk-high rides solo, never in a pool** (one bad item stalls the
   whole pool). Never push a change that cannot affect the app, and do not add
   a workflow, job, shard or dependency without removing one. When a limit is
   hit, the fix is fewer deployments or fewer runs — not a bigger plan. (The
   cap was hit on 2026-11-15 and again on 2026-11-26, both times by many
   parallel PRs pushed repeatedly.)
10. **The governance is part of the system.** The rules, the CI checks, the
    hooks and the agent workflows are not furniture: when one is wasteful,
    wrong for the owner's setup, or behind the tools, improve it in the same PR
    and say why in the session note. The budget above is the ruler.
11. **A review, for what is costly.** A pull request the risk bot rates high, or one that declares a **Large change**, is reviewed before it merges: run the `code-review` skill on the diff, fix what is real, and put what it found in the description. **A Claude agent may review its own work** (owner, 2026-11-23: the independent-reviewer requirement was written for the weak local model that hallucinates and makes a mess, not for Claude); a fresh reviewer is still the better choice for a migration or an access change, but not a precondition. A review by a weaker or local model never counts.

## Working without being asked (owner, 2026-11-21)

The owner wants this run semi-automated and affordable: **do not end a turn with a question the repository can answer.** The backlog, `STATE.md`, `wishlist-ranking.md`, the bible and the plans are the context; use them to decide.

1. **Pick the work yourself**, in this order: an open `nightly-review` or `e2e-red` issue; the owner's newest instruction; the launch gates (moderation 3.14, the email sender is owner-side); then `wishlist-ranking.md` order and the buildable slices in `backlog-detail.md`. A backlog entry that the code already contradicts is stale: fix the entry (in the same PR) and move on.
2. **Delegate by size, cheapest that can do it.** **Haiku** for a narrow, fully specified job (one to three files, a sweep, a test file, a fixture, a render): the prompt names the files, the done-when and what to report. **Sonnet** for work that needs judgment (a migration with RLS, a redesign, a cross-cutting change). **You** for the migration apply, the merge, the browser look and any decision. Every agent works in its own worktree, commits locally, never pushes.
3. **Review every diff yourself**, merge the agents' commits onto one branch, build and run the specs **once**, push **one PR per batch** (rule 9's push discipline), merge it when the required checks are green, apply migrations to production then staging, run the drift check. A migration or a high-risk PR gets an independent reviewer (a fresh agent), not your own say-so.
4. **Ask only for what is the owner's alone**: an outside service and its cost or keys, a change to auth settings or live data, a product call the owner has not made and the documents do not settle, a real-device check. Everything else: decide, say what you decided in the session note, move on. Report in a few lines (what shipped, what is not verified, what needs the owner).

## The change cycle

1. **Explore** — the files involved; the owning doc (see *Where to look*);
   `bible/inventory.md` for what a route touches. **Search `origin/main`, not
   only this checkout, before building** (`git grep -il <word> origin/main`,
   the newest notes in `sessions/` on main): a checkout that is far behind
   hides what already exists (a feature was once built twice that way). More
   than 20 commits behind: start from `origin/main` in a worktree of its own,
   with its own `npm ci` (never a linked `node_modules`).
2. **Check state** — `STATE.md`, `BACKLOG.md`.
3. **Plan** — exact files; RLS implications; who it affects (personas).
4. **Implement** — following `conventions.md` and `design-tokens.md`.
5. **Verify** — the commands above; for UI, look at it (`npm run dev`, or the
   `run-misfits-cavern` skill); for realtime, two sessions at once.
6. **Sync** — `npm run sync-intel`; add a note for this PR in `sessions/`
   (`YYYY-MM-DD-slug.md` — a new file, so it never conflicts); `backlog-detail.md` gains
   what was found and not done (what, where, size, done-when) and loses what's
   done. Edit `STATE.md` only when the handoff itself changes (a decision,
   work finished or opened, something the owner must do).
7. **Commit** — clear message, PR from the template, green CI before merge
   (`checks`, `database`, the Vercel preview; `e2e-local` runs nightly via `e2e-scheduled.yml`).

Prioritise: broken > lying UI > missing-but-promised > polish. Reproduce a
bug before fixing it; prove the fix with the same reproduction.

## Personas

- **Sam** — project owner: creates, writes, schedules, hires, runs channels.
  Full rights on their projects.
- **Jordan** — co-writer / crew: co-edits live, posts where the channel
  allows, sees private channels only as a member; no destructive admin.
- **Riley** — outsider: sees nothing project-scoped — only links that were
  deliberately shared. Any leak to Riley is P0.

## Where to look

| Working on | Read |
|---|---|
| Any page | `bible/` (what it is, its states and rules) → `routing-and-surface.md` |
| UI | `design-tokens.md`, `conventions.md` §6, `components/ui/` |
| Database / RLS | `database-and-security.md` (§3 is the migration workflow) |
| ScriptOS | `scriptos-engine.md` |
| Studio | `studio-and-preproduction.md` |
| Lounge / voice | `lounge-and-audio.md` |
| The brief and phases | `project-brief.md`, `bible/11-rules.md` |
| Tools, MCP, permissions, skills, CI | `tools-and-access.md` |
| Brand | `brand/README.md` |
| The plan for the repo | `restructure-proposal.md` |

## Agent entry files

| Tool | Reads | What it is |
|---|---|---|
| Claude Code (local + cloud) | `CLAUDE.md` | `@`-imports this file, `STATE.md`, `BACKLOG.md` and `INDEX.md`, plus Claude-only notes |
| Codex, Cursor, Cline, Windsurf, Zed, Gemini, Jules, Copilot agent | `AGENTS.md` | a generated mirror of this file (some tools don't follow links) |
| GitHub Copilot (chat) | `.github/copilot-instructions.md` | a pointer here |

Skills (Claude): `.claude/skills/` — `run-misfits-cavern`, `supabase`,
`supabase-postgres-best-practices` (`tools-and-access.md` §4).
