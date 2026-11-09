---
name: run-misfits-cavern
description: Run, build, test, and drive The Cavern production suite locally — fast checks, and the real stack (local Supabase + a production build + a real browser) for specs and screenshots
---

The Cavern is a Next.js 16 / React 19 app on Supabase (Postgres + RLS, Auth, Realtime, Storage). Two ways to work, depending on what has to be true.

## 1. Fast checks (no database, a minute or two)

```bash
npm ci                 # once
npm run typecheck
npm run lint           # the ratchet: `npm run lint:ratchet` rewrites eslint-suppressions.json when a suppression is gone
npm run test           # ~2,700 unit tests, ~50 s
npm run bible          # regenerates .cavern-intelligence/bible/inventory.md (CI fails if it is stale)
npm run sync-intel     # regenerates the agent entry files from RULES.md
npm run budget         # page-weight budgets (needs a build; CI's numbers are the judge, local ones run higher)
```

`npm run build` needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (take them from section 2, or from `.env.local` if you have one) and takes about 3 minutes. Do not run it in the foreground: the shell gives up at two minutes. Start it in the background and wait for it (a Monitor with an until-loop on `pgrep -f "next build"`).

## 2. The real stack (a session in the cloud container)

Needed for: persona tests (`tests/integration`), browser specs (`e2e/`), and looking at a screen.

```bash
# Docker dies between commands in a cloud container: start the daemon as its own background task.
dockerd > /tmp/dockerd.log 2>&1 &     # then: docker info
npx supabase stop                      # if it came up from stale containers
npm run db:start                       # local Supabase, minus studio/edge/etc.; the first run pulls images
npm run db:reset                       # rebuilds the database from every migration (about a minute)
npx supabase status -o json            # API_URL, ANON_KEY, SERVICE_ROLE_KEY (local demo keys, not secrets)
```

**Persona tests** (Sam owner, Jordan crew, Riley outsider): `npx vitest run -c vitest.integration.config.ts tests/integration/<name>.test.ts`.

**A migration's whole procedure** (`database-and-security.md` §3): write it, `npm run db:reset`, `npm run db:drift -- --update` (rewrites `supabase/schema.fingerprint`), `npm run db:types`, extend a persona test, PR; after merge apply to production then staging and run the drift check.

**Build and serve the app against the local stack:**

```bash
STATUS=$(npx supabase status -o json)
export NEXT_PUBLIC_SUPABASE_URL=$(echo "$STATUS" | jq -r .API_URL)
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(echo "$STATUS" | jq -r .ANON_KEY)
export SUPABASE_SERVICE_ROLE_KEY=$(echo "$STATUS" | jq -r .SERVICE_ROLE_KEY)
npm run build          # background, ~3 min; the variables are baked in at build time
npm run start          # background; http://localhost:3000, ready when /auth answers 200
```

After a code change, rebuild: `npm run start` serves the last build. Stop the old server first (`pkill -f "next start"; pkill -f next-server`).

**Browser specs** (opt-in, they use real accounts on the local stack):

```bash
export E2E_LOCAL_STACK=1 E2E_LIVE_AUTH=1 PLAYWRIGHT_BASE_URL=http://localhost:3000
export MC_LOCAL_CHROMIUM=/opt/pw-browsers/chromium   # the pinned headless shell is not installed here
npx playwright test e2e/split.spec.ts
```

This container has Chromium but **no ffmpeg**, and the repo's config records video on failure, which then crashes the run with "Executable doesn't exist ... ffmpeg". Use a throwaway config outside the repo that spreads `playwright.config` and sets `use: { video: 'off', screenshot: 'off', trace: 'off' }` and an `outputDir` under `/tmp`, and pass it with `-c`. Pass `--trace off` otherwise. A spec run takes 10 to 20 seconds once the app is up.

**Looking at a screen:** a scratch Node script (in the scratchpad, not the repo) that creates a user with the admin client (`createUser` with `email_confirm: true`), inserts a project and a script, signs in through `/auth`, sets a theme with `localStorage.setItem('mc_theme', JSON.stringify({ id: 'slate', frosted: true }))`, visits a page, and saves a screenshot; then delete what it made. Look at the image; do not report a UI change as working from the tests alone.

**When you are done:** `pkill -f "next start"; pkill -f next-server; npx supabase stop`.

## Gotchas learned the hard way

- **A split opened by a link used to ignore its `?a=&b=`** because the page read `window.location`, which is stale during a client-side navigation. Read the address from the router (`useSearchParams`) in a page that is reached by `<Link>` / `router.push`. A spec that visits the URL directly (a full load) will not see this bug.
- **Compound shell commands**: `( cmd & ); sleep` and `nohup bash -c '...'` inside one tool call can trip the safety check (it reads them as a possible removal). Use separate calls.
- **`git push --force` is blocked by a hook.** If a branch with no PR has been rebased, push it under a new name instead. If a hook blocks a command that begins with `git add` / `git commit`, the whole command is blocked, so the commit did not happen: check `git status`.
- **Vercel previews fail on the free plan's daily deploy limit** when many PRs run in a day. That check is not required.
- **The page-weight budget (`performance-budget.json`)** fails `checks` when a route grows; raise it by the measured amount in the same PR, and keep the card-level styles of one area out of another area's bundle (the editor imports `components/studio/ui.tsx`, so anything it pulls in ships to the editor).
- **The `gate` workflow** fails a PR that adds source and no test ("tests-with-code"), and one with no session note; `check-sessions` on `main` names any merged PR with no note.
- **Generated files** (`bible/inventory.md`, `schema.fingerprint`, the agent entry files) must be regenerated in the PR; CI diffs them.
- **Only the local stack's keys are printed** by `supabase status`; never paste a production key anywhere.

`driver.mjs` in this folder starts and checks a dev server (`node driver.mjs start | health | stop | verify`); it predates the real-stack flow above and is only for a quick look at public pages without a database.
