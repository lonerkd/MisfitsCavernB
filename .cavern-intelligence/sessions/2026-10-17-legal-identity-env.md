# Session — 2026-10-17: legal identity moves out of the code

**Changed:** `lib/legal/legal.ts` no longer holds the operator, country, province, contact labels/URLs or effective date; it reads `LEGAL_*` environment variables and throws at build if one is missing. They are server-only (no `NEXT_PUBLIC_`) — only server components import `LEGAL`, so nothing is added to the client bundle. `.env.example` lists them; CI sets fixture values at workflow level; `playwright.config.ts` loads `.env.local` (via `@next/env`) and `e2e/legal.spec.ts` asserts against the same variables instead of hard-coded names.

**Owner must:** set the eight `LEGAL_*` variables in Vercel (all environments) before the next production deploy, or the build fails (BACKLOG §1).

**Verified:** see the PR (typecheck, lint, test, build with the variables set; build without them fails with a clear message). **Not verified:** the e2e spec run, CI (Actions blocked), the Vercel build.
