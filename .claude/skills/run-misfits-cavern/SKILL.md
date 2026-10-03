---
name: run-misfits-cavern
description: Run, build, test, and drive the Misfits Cavern production suite locally
---

Misfits Cavern is a Next.js 14 web app for indie filmmakers with TypeScript, Tailwind, Supabase, and WebRTC. This skill documents how to build, launch, and drive the app locally.

## Prerequisites

- **Node.js** 18+ and npm (usually included)
- **Environment variables** — Supabase project credentials in `.env.local` (must already exist; the credentials cannot be added from a clean slate in this environment, but the file ships in the repo)

## Build

```bash
npm install
npm run typecheck  # Verify TypeScript
npm run test       # Run 118 unit tests (verify suite health)
npm run build      # Production build (used by CI; takes 30s, not required for dev)
```

All three verify the app compiles and the test suite passes.

## Run: Agent Path

**Launch the development server in the background and test key routes:**

```bash
# Start dev server (background, no output)
npm run dev > /tmp/dev.log 2>&1 &
sleep 5

# Health check: home page loads
curl -s http://localhost:3000 | grep -q Misfits && echo "✓ Home page loads"

# Smoke test: TypeScript + lint clean (no build needed for dev)
npm run lint && npm run typecheck && echo "✓ Code quality verified"

# Cleanup when done
pkill -f "node.*next dev"
```

The dev server listens on `http://localhost:3000`. The following routes are gated by authentication (will redirect to `/auth` if not signed in):

- `/projects` — project hub (entry point for authed users)
- `/studio/[id]` — scriptwriting & production
- `/editor/[id]` — screenplay editor (ScriptOS parser + live preview)
- `/lounge/[id]` — crew chat + WebRTC voice rooms
- `/soundtrack/[id]` — audio asset library
- `/portfolio` — public portfolio builder
- `/crew/[id]` — crew management
- `/jobs/[id]` — job board (intra-project)
- `/settings` — account & project settings
- `/profile` — public profile

**Public routes** (no auth):

- `/` — marketing home
- `/auth` — sign-in/sign-up (email + password)
- `/showcase` — featured portfolios
- `/p/[token]` — shared project link (if project has `visibility: 'link'`)
- `/shared/[token]` — public project view (if project has `visibility: 'public'`)

## Run: Human Path

```bash
npm run dev
```

The server compiles on first request, then runs hot-reload. Ctrl-C to stop. Open `http://localhost:3000` in a browser.

## Test

```bash
npm run test              # Unit tests (118 tests in ~2s)
npm run test:e2e          # Playwright e2e (requires headless browser + db; integration tests are opt-in with E2E_LIVE_AUTH=1)
npm run lint              # ESLint + prettier
npm run typecheck         # TypeScript type checking
```

## Gotchas

1. **Supabase credentials required** — The app connects to Supabase at runtime. `.env.local` must exist and contain valid `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The default `.env.example` has placeholders; the real credentials are in `.env.local` (which cannot be read or modified from this environment due to security rules).

2. **Authentication is real** — Every authed route requires a real Supabase session. You can sign up via the `/auth` page (if the Supabase project has `disable_signup: false`), or the test suite uses personas (Sam = owner, Jordan = crew, Riley = outsider). To test without signing in, hit the public routes.

3. **Dynamic imports cause SSR errors** — Some components use `next/dynamic` for lazy-loaded 3D/WebRTC modules. The error is benign — it falls back to client-side rendering. The page loads correctly in the browser.

4. **Database RLS enforced** — Every table has Row-Level Security. The app won't show data you don't have permission to see, even if you inspect the client code. Test personas in `AGENTS.md` have specific access levels.

5. **Service Worker caches static assets** — If you see stale CSS/JS after rebuilding, clear the browser cache (`DevTools → Application → Clear storage`).

6. **Discord / Spotify integrations are optional** — The app works without them; auth will route around their features if the API keys are missing.

## Troubleshooting

**Problem: Dev server never finishes building**
- Check `/tmp/dev.log` for errors
- If it's a timeout, try `npm install` again (stale or corrupt dependency)
- Verify Node.js 18+: `node --version`

**Problem: "Module not found" on `next/dynamic`**
- This is expected in SSR and triggers a fallback. The browser renders it fine. Not a blocker.

**Problem: 401 when visiting `/projects` immediately after starting**
- The app gates authed routes via session cookies. You must sign in at `/auth` first (or be in a session).
- The `/` home page is public; use it to verify the app is running.

**Problem: Supabase connection errors (503, network timeout)**
- The Supabase project URL is incorrect or the service is down. Verify `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` points to a running project.
- If the URL is correct but unreachable, the Supabase project may need to be started manually (for local development, this would use `supabase start` with the CLI).

**Problem: Tests fail with "Cannot find module"**
- Run `npm install` to ensure all devDependencies are present.

**Problem: Port 3000 already in use**
- Kill the existing process: `lsof -i :3000 | grep node | awk '{print $2}' | xargs kill -9`
- Or use `PORT=3001 npm run dev` to use a different port.

## Verification Commands

All verified in this session (as of 2026-09-27):

```bash
npx tsc --noEmit      # TypeScript: clean ✓
npm run test          # Unit tests: 118/118 pass ✓
npm run dev           # Dev server starts, responds to HTTP ✓
npm run lint          # ESLint: clean (pre-existing warnings only) ✓
```

## Environment

Paths are relative to the repo root. The dev server runs on Node.js (Windows/Linux/macOS); no Docker required.

**Key directories:**
- `app/` — Next.js App Router pages & layouts
- `components/` — React components (UI, modals, forms)
- `lib/scriptos/` — Screenplay parser, editor engine, exports
- `lib/supabase/` — Data layer & RLS helpers
- `lib/context/` — React context providers (Auth, Projects, OS state)
- `e2e/` — Playwright e2e tests

**Key environment variables (in `.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon-role API key
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side key (Discord notify route)
- `NEXT_PUBLIC_APP_URL` — App public URL (for redirects/links)
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` — Spotify integration (optional)
- `NEXT_PUBLIC_DISCORD_CLIENT_ID` — Discord integration (optional)
