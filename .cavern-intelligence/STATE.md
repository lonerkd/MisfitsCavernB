# Misfits Cavern — Project State

## Active Iteration

Merged `claude/charming-galileo-fewe3n` (4 commits ahead of main) — Portfolio → pitch board refactor, portfolio_blocks migration fix, Supabase skill docs.

## Last Change Summary

- Merged `origin/claude/charming-galileo-fewe3n` into main (clean auto-merge, 1 file conflict resolved)
- Portfolio panel in ProductionManager replaced "Publish to Portfolio" button with "Build Pitch Board" link; published entries show "Edit Board" instead of "PUBLISHED" badge
- Removed obsolete `createPortfolioProject` import and `publishToPortfolio` function
- `sync-manifest.json` updated to 216 tracked files
- `npx tsc --noEmit && npm run build && npm run lint` all pass with zero errors

## Known Issues

1. Leaked-password protection — dashboard toggle, owner must flip it
2. README / production branding / docs polish — partial pass done, could use another round

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
