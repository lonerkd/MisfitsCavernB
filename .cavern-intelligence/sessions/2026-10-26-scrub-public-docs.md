# Session — 2026-10-26: operational details out of the public repo

**Why:** the owner keeps the repository public (GitHub Actions minutes), so the
docs must not carry operational or personal detail (gating design, part 3).

**Removed from prose** (`STATE.md`, `BACKLOG.md`, `RULES.md`, `STATE-history.md`,
`tools-and-access.md`, `database-and-security.md`, `bible/10-platform.md`,
`bible/audit-2026-10-06.md`, `adr/0006`, three 2026-10-25 session notes):
GitGuardian incident numbers, a drift run id, the staging project's ref and
region, the push dispatch URL, the Vercel team slug, the Supabase org name,
throwaway test-account addresses, the owner's name and province from BACKLOG,
the production ref from `RULES.md` and ADR 0006 (it stays in the §2 MCP table
agents need), the drift role's name where a doc didn't need it.

**Changed:** `e2e/auth-journey.spec.ts` generates its password per run (was a
fixed shared one). New `tools-and-access.md` §6a: what never goes in this repo.

**Left on purpose:** the production ref and URL in code (`preview-env-guard`,
`next.config.js`, tests, the Spotify redirect) and the browser bundle; the drift
role's name in its setup runbook (§7) and workflow, which need it; the
owner's name in `lib/legal/legal.ts`, the legal pages, `e2e/legal.spec.ts` and
`bible/08-public.md` (the public footer shows it); "Alberta" in brand docs (the
brand's origin story, not an address). Git history is not rewritten.
