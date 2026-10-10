# 10 · Platform systems

The machinery under every page. Each section names where it lives and the
deep doc that owns it.

## Data layer

- **One client** (`lib/supabase/client.ts`, browser) and a **public client**
  (`lib/supabase/public.ts`, server, anon) for share pages; the service role
  is used only inside `/api/discord/*` route handlers.
- **Typed modules**: `lib/supabase/*.ts` (projects, channels, messages, jobs,
  portfolio, profiles, notifications, crew, casting, studio, stats, audit…),
  `lib/studio/api.ts` (`createStudioApi(client)` — the same code runs in the
  integration tests as real personas), `lib/breakdown`, `lib/brief`,
  `lib/availability`, `lib/guides`, `lib/credits`.
- **Types**: `lib/supabase/database.types.ts`, generated (`npm run db:types`);
  CI fails if stale.
- **Reality check**: 30 files in `app/` and `components/` still call
  `supabase.from(…)` directly (editor, Lounge, jobs, projects, today,
  soundtrack, settings, welcome, crew, portfolio, profile, pitch, Studio's
  Post / Promos / PitchDeck, the palette…). BACKLOG 3.2 (L). `conventions.md` §1 states the rule; the code is partway there.

## OS core (`lib/os`)

`OSProvider` boots the session once (`bootOS`): identity, account, the active
project (`mc_active_project`), the project-scoped realtime channel, and the
project list. Hooks: `useSession`, `useCurrentUser`, `useOSGate`,
`useProject`. `progress.ts` + `phases.ts` are the phase
engine (§11); `board.ts` sorts the projects board; `uiPrefs.ts` reads and
writes `ui_prefs`. `guards.tsx` is the one page gate (`ProtectedPage`:
signed-in or admin, from the session's `isAdmin`); everything else is RLS (§11).

## Security (RLS)

Every table has RLS. Project scope through `internal.can_access_project`;
planning through `internal.can_shape_project`; scripts through
`internal.can_access_script`; Lounge through `internal.can_view_channel`.
Definer functions in `public` are an allowlist with their gates
(`database-and-security.md` §2.D — 9 callable by anyone, 24 by signed-in
users). Persona tests (Sam, Jordan, Riley, anon) run every PR:
`tests/integration/*` (289 tests, 40+ files).

## Realtime

Supabase Realtime for: the project channel (OS), Studio live rows
(`useLiveRows`: media, scenes, shots, castings, locations, set log,
transcripts, post notes, call sheet acks), script co-writing
(`script_<id>` broadcast + presence), Lounge messages and typing, voice
signalling, presence (who's online, where).

## Offline

- **Service worker** (`public/sw.js`, production only): visited pages
  network-first with a cache fallback, hashed assets cache-first; never
  intercepts Supabase or other origins; an offline notice for pages not yet
  opened on the device.
- **Scripts**: IndexedDB first, server when online, retried; offline deletes
  are tombstones (§4).
- **On set**: the day is seeded to the device and stamps queue offline
  (`e2e/onset-offline`).
- **Pocket captures**: an IndexedDB outbox, flushed when online (§1).

## Errors and observability

- `app/error.tsx`, `app/global-error.tsx`, `app/auth/error.tsx`,
  `EditorErrorBoundary`, `not-found.tsx`.
- `ErrorReporter` + `lib/errors/report.ts` send crashes and uncaught errors
  to `report_client_error` (rate-limited, trimmed, 30 days) → Admin › Errors.
- `audit_logs` (your own name only) → Admin › Audit log.
- Vercel runtime logs; Supabase logs and advisors.

## Notifications

`notifications` rows (`lib/supabase/notifications.ts`): `created_by` can't be
spoofed, you may notify only people you share a project, job, DM or channel
with (`internal.can_notify`), links are site-relative. Sources: call sheets
issued / changed / reminders (pg_cron `call-sheet-reminders`, hourly at :07),
applications and hiring, castings, replies, mentions. In-app only: no email,
no push.

## Integrations

| Service | Use | Where |
|---|---|---|
| Spotify | connect, search, play, save to project | `lib/spotify`, `/auth/spotify-callback` |
| YouTube / Vimeo | embeds, real titles via oEmbed, player seek for cut notes | `lib/integrations/links.ts`, `CutPlayer` |
| Pinterest | a public board's latest pins into the library | `/api/links` |
| Openverse | reference search with credit | `/api/references/search` |
| Discord | sign-in; channel → webhook bridge | `/auth`, `/api/discord/*` |
| Google Maps | directions from call sheets and Today | links only |
| Browser speech | table read; transcript dictation | `lib/scriptos/tableRead.ts` |

API routes are rate-limited (`lib/api-rate-limit.ts`) and validate input
(`lib/validation`).

## Install (phone)

`public/manifest.webmanifest`: standalone, starts at `/today`, shortcuts
(Capture, Today, Lounge), a `share_target` into Capture. `appleWebApp`
metadata is set, with the R13 icons: `icon.svg` and `favicon-32.png` for
tabs, a 180×180 `apple-touch-icon.png`, and 192/512 and maskable PNGs in
the manifest (iOS ignores SVG icons). **For iPhone** it still needs splash
images, an install prompt
("Share → Add to Home Screen" coaching, since iOS has no install event), and
Web Push (iOS 16.4+, home-screen apps only) for call sheets and DMs. iOS
ignores manifest shortcuts and `share_target`. BACKLOG 3.13.

## Build, test, ship

- Next.js 16 (webpack), React 19.2, TypeScript, Tailwind, framer-motion.
- `npx tsc --noEmit`, `npm run lint` (React Compiler rules as errors),
  `npm test` (472 unit), `npm run test:integration` (local Supabase),
  `npm run e2e` (39 specs).
- CI (`.github/workflows/ci.yml`): `changes` → `checks` (lint, types, unit,
  build) · `database` (rebuild from migrations, drift, types, integration,
  studio journey) · `e2e-local` (5 shards by timing). Docs-only PRs skip the
  database and e2e jobs.
- Nightly *Production schema drift* compares production with
  `supabase/schema.fingerprint` (as `drift_reader`).
- Vercel deploys `main`; previews per PR. Migrations are applied to
  production by hand after merge (`database-and-security.md` §3).

## Known gaps

- No email delivery of notifications, and auth emails use Supabase's default
  mail sender (low hourly limit) — a custom SMTP sender (Resend, Postmark) is
  needed before launch (3.15).
- No staging environment: PR previews talk to production data.
- Backups: the free plan has none you can restore yourself (Pro has daily).
- Supabase usage over the free plan (grace period) — owner to check.
