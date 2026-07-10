# Misfits Cavern — Project State

## Active Iteration

Repo audit + hardening pass (Milestones 0–1 of the audit plan in `~/.claude/plans/you-are-a-world-class-typed-corbato.md`): CI pipeline, unit-test harness, Discord notify route auth, real middleware session validation.

## Last Change Summary

- **CI**: `.github/workflows/ci.yml` — typecheck + lint + vitest + build, plus unauthenticated Playwright smoke job. Needs `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` repo secrets.
- **Unit tests**: Vitest added (`vitest.config.ts`); 36 tests covering `lib/scriptos/parser.ts` and `lib/permissions/access-matrix.ts`. `npm run test`.
- **Security — notify route**: `/api/discord/notify` now requires a Bearer access token (401 otherwise), derives sender identity from the verified JWT (body `senderId` removed — spoofing closed), and 403s unless the caller can view the channel under RLS. Caller updated in `lib/supabase/messages.ts`.
- **Security — auth**: browser client migrated to cookie-backed `createBrowserClient` (`@supabase/ssr`); middleware now validates the session via `getUser()` (forged/expired cookies rejected) and gates `/admin` on server-verified `profiles.is_admin`. **Existing localStorage sessions are not migrated — all users sign in once more after deploy.**
- Quick wins: `typecheck`/`test`/`test:e2e` npm scripts; `updateProject` errors now surface via toast; debug `console.log` removed from ParticleBackground; Supabase image host in `next.config.js` derived from env.
- Fixed broken `e2e/auth-validation.spec.ts` (targeted nonexistent `/auth/signup` + label selectors that never matched) — now passes against the real `/auth` signup mode.
- `sync-manifest.json` at 220 tracked files.

## Second Pass (same session) — DB verification, types, drift fixes

- **Live RLS verified**: every public table has RLS enabled; anon (Riley) sees 0 rows in channels/channel_members/discord_integrations/messages.
- **Recovered + committed** the uncommitted `project_channels_system` DDL as `supabase-migration-project-channels-system.sql`.
- **Fixed a live production outage**: `can_post_channel` / `can_view_channel` / `can_manage_channel` referenced helpers by their old `public.*` names after they moved to `internal`, so all three raised 42883 — breaking the channels SELECT policy and every channel message insert. Fixed via prod migrations `fix_can_post_channel_schema_reference` + `fix_channel_helpers_internal_schema_references`; committed SQL matches.
- **Generated Supabase types** (`lib/supabase/database.types.ts`), client is now `createBrowserClient<Database>`; `Database = any` gone.
- Types immediately caught **4 schema-drift bugs**, all fixed: `scripts.page_count` (broke hub script count), `projects.is_public` (broke projectAccess loading in AuthContext), `sfx_assets` insert used 4 nonexistent columns + missing required `project_id` (every SFX upload failed), CommandPalette queried nonexistent `assets` table (now `project_assets`).

## Third Pass — full-suite logic audit (every page/button/query)

Three parallel audits verified ~180 buttons/actions and every `supabase.from()`
call across all 27 routes against the generated schema. Sign-in redirect loop
fixed and verified live in production (cookie-backed session + validating
middleware, commit 9e68493). Additional defects found and fixed:

- soundtrack SFX panel (5): consumed nonexistent `bucket_path`/`file_name`/
  `category` columns — uploads were unplayable, untitled, and unsavable to the
  Audio Bible. Now reads `audio_url`/`title`/`tags`.
- profile page: `jobs.company/location` don't exist — the select error blanked
  ALL profile lists and stat counts. Now selects `role`/`status`.
- jobs board: failed job post was silent — now toasts the error.
- CrewManagementModal: role dropdown now gated by `manage_crew` (was enabled
  for viewers and silently failed at RLS).
- admin/users: removed duplicate ANALYTICS tab link.

Clean areas: home, projects, project hub, pitch board, portfolio (+manage),
p/[token], s/[token], showcase, studio, editor + ScriptOS libs, Spotify,
lounge + channels + voice, jobs, crew, settings, admin ×4, auth ×3, taskbar/
nav/notifications.

## Known Issues

1. Leaked-password protection — dashboard toggle, owner must flip it (also flagged by security advisor)
2. README / production branding / docs polish — partial pass done, could use another round
3. `tsconfig.json` still `strict: false` (audit plan M2.2)
4. `npm audit`: 5 vulnerabilities (1 moderate, 4 high) reported at install — triage pending
5. Security advisor WARNs: public buckets (`sfx-library`, `studio-assets`) allow listing; `has_discord_webhook` executable by anon — review intent

## Last Session

Merged `claude/charming-galileo-fewe3n` (4 commits ahead: Pitch board refactor, Supabase skill install, portfolio_blocks migration fix, merge back). Only conflict was `app/projects/[id]/page.tsx` — replaced the `publishToPortfolio` + manual publish button with a "BUILD PITCH BOARD" link to `/projects/[id]/pitch`. Removed `createPortfolioProject` import, `publishing` state, and `publishToPortfolio` function. Published portfolio entries now show "EDIT BOARD" link instead of "PUBLISHED" badge. All verification passes.

Prior: Polished README with badges, testing section, agent dev section, updated repo map. Created full Sam-persona e2e smoke test suite. Fixed pre-existing ESLint errors across 7 files (unescaped entities) and restructured lounge/page.tsx to fix conditional hooks violation. Consolidated 14 tables with overlapping permissive RLS policies — dropped redundant SELECT policies (project_tasks, project_beats, timeline_items, budget_items, beats, concept_assets, scenes, campaigns, character_castings, script_metadata), converted overlapping ALL policies to specific INSERT/UPDATE/DELETE on portfolio_projects/portfolio_media/portfolio_blocks, scoped scripts SELECT to authenticated role. PR #7 already closed. Implemented leaked-password protection: HIBP k-anonymity check in `lib/password-strength.ts`, toggle in Settings → Data & Privacy (persisted to `profiles.notification_prefs.leak_check`), wired into auth signup and settings password change flows.
- `AGENTS.md` at repo root — universal entry point (read by all AI tools natively)
- `CLAUDE.md` — Claude Code adapter (refs AGENTS.md + MCP config)
- `.github/copilot-instructions.md` — VS Code Copilot adapter
- `.cavern-intelligence/design-tokens.md` — full visual rubric from globals.css
- `.cavern-intelligence/playbook.md` — detailed 7-step change workflow
- `.cavern-intelligence/STATE.md` — iteration tracking file
- `.eslintrc.json` — initialized ESLint with Next.js core-web-vitals
- `sync-protocol.md` — expanded to cover all agent types (Codex, Cursor, Cline, etc.)

## Verification Results

```bash
npx tsc --noEmit    # TypeScript: clean
npm run build       # Next.js build: clean (warnings only)
npm run lint        # ESLint: configured (pre-existing warnings only)
npm run sync-intel  # Manifest: 216 files
```

## Pre-existing Lint Warnings (non-blocking)

- `react/no-unescaped-entities` — all fixed
- `react-hooks/rules-of-hooks` in lounge/page.tsx — fixed (hooks hoisted above guard)
- `@next/next/no-img-element` — 20+ occurrences, use <Image /> when refactoring
- `react-hooks/exhaustive-deps` — 15+ occurrences across files, add deps when refactoring
- `jsx-a11y/alt-text` — 3 occurrences, add alt text when refactoring
