# Routing & Surface Map — Misfits Cavern

Every route in the app, how it's gated, which module owns it, and the key
libs/components behind it. Auth gating is enforced in `middleware.ts` (real
`getUser()` JWT validation, **not** cookie presence).

---

## 1. Gating tiers (`middleware.ts`)

- **PUBLIC** — no auth: `/`, `/auth`, `/api/discord/*`, `/api/public/*`, plus
  everything not listed as protected/admin (this is how `/p/[token]`,
  `/s/[token]`, `/showcase` stay logged-out-accessible).
- **PROTECTED** — redirects to `/auth?redirect=<path>` if no valid session:
  `/editor`, `/lounge`, `/studio`, `/projects`, `/crew`, `/jobs`,
  `/portfolio`, `/profile`, `/settings`, `/soundtrack`, `/split`, `/welcome`,
  `/today`, `/call`.
- **ADMIN** — protected **and** server-verifies `profiles.is_admin`; non-admins
  redirect to `/`: `/admin/*`.

> Public routes still enforce data boundaries through **RLS**, not middleware.
> `/s/[token]` and `/p/[token]` only work because `anon` has a narrow SELECT
> policy gated on `shared = true` / `is_public`. Never widen those without
> persona-testing Riley (see `database-and-security.md`).

---

## 2. Page routes

| Route | Tier | Module | Key files |
|---|---|---|---|
| `/` | public | Landing | `app/page.tsx`, `components/PhotoScatter`, `ParticleBackground` |
| `/auth` | public | Auth | `app/auth/page.tsx`, `lib/supabase/auth.ts`, `lib/password-strength.ts` |
| `/auth/callback` | public | Auth | OAuth code exchange |
| `/auth/spotify-callback` | protected* | Soundtrack | `lib/spotify/*`, `SpotifyContext` |
| `/today` | protected | Today | `app/today`, `lib/today/core.ts` — the working home on a phone (first tab), fine on a desk (dock): the coming days on set with your call and the way there (maps), your tasks by urgency (tick off here), Lounge unread by channel/person (deep links), updates, your projects with Script/Studio/Schedule jumps. Crew see issued days; the owner sees drafts too. |
| `/projects` | protected | Projects hub | `lib/supabase/projects.ts` |
| `/projects/[id]` | protected | Project hub | project dashboard; links to editor/studio/pitch |
| `/projects/[id]/pitch` | protected | Pitch board | portfolio publish flow |
| `/editor` | protected | **ScriptOS** | `lib/scriptos/*`, `components/editor/*` — see `scriptos-engine.md` |
| `/studio` | protected | The Studio | `lib/supabase/studio.ts`, `breakdown.ts`, `casting.ts`, `components/canvas/*` — see `studio-and-preproduction.md` |
| `/split` | protected | Split screen | `app/split`, `lib/split/*`, `components/split/PaneShell` — two surfaces in same-origin frames; panes hide the suite chrome (`useInPane`) and talk via the split page (`postToSplit` / `useSplitMessages`): the script's caret scene ↔ Studio. Ctrl+\\, taskbar, ⌘K. |
| `/welcome` | protected | Onboarding | `app/welcome`, `lib/onboarding.ts` — a new account's first stop (sign-up and first OAuth sign-in): craft, what they came for, a first project with brief answers; opens the tool for its first step. |
| `/call/[id]` | protected | Crew call sheet | `app/call/[id]` — where call sheet notifications land: the viewer's own call, "Got it" (confirms the issued version), the day, scenes, everyone's calls; RLS-scoped to the production. |
| `/soundtrack` | protected | Soundtrack | `lib/spotify/*`, `GlobalAudioWidget`, SFX/Audio Bible |
| `/lounge` | protected | **The Lounge** | `lib/supabase/channels.ts`, `messages.ts`, `lib/webrtc/voice.ts` — see `lounge-and-audio.md`. `?channel=<id>` / `?dm=<user>` open a conversation (notifications link there). |
| `/jobs`, `/jobs/[id]` | protected | Jobs board | `lib/supabase/jobs.ts` |
| `/crew`, `/crew/[id]` | protected | Crew directory | `lib/supabase/crew-management.ts`, `CrewManagementModal` |
| `/portfolio`, `/portfolio/manage` | protected | Portfolio | `lib/supabase/portfolio.ts` |
| `/profile` | protected | Profile | `lib/supabase/profiles.ts`, `stats.ts` |
| `/settings` | protected | Settings | `profiles.notification_prefs`, leaked-password toggle |
| `/showcase` | public | Showcase | public filmmaker directory |
| `/p/[token]` | **public** | Portfolio share | logged-out; RLS-gated on `is_public`/token |
| `/s/[token]` | **public** | Script share | logged-out; RLS-gated on `shared = true` |
| `/admin` | admin | Admin | dashboard |
| `/admin/users` | admin | Admin | user management |
| `/admin/analytics` | admin | Admin | `lib/supabase/stats.ts` |
| `/admin/audit-logs` | admin | Admin | `lib/supabase/audit.ts` |

\* `/auth/spotify-callback` isn't in the protected list but is only reached
mid-OAuth from an authed session.

---

## 3. API routes (`app/api/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/discord/notify` | POST | **Bearer access token** (401 without); derives sender from verified JWT; 403 unless caller can view the channel under RLS | posts a channel message to a Discord webhook |
| `/api/discord/test` | POST | **Bearer access token** (401 without) + rate limited | webhook connectivity test |
| `/api/references/search` | GET | — (public; IP rate limited) | reference-image search for Studio boards |

`/api/discord/notify` uses `SUPABASE_SERVICE_ROLE_KEY` server-side to read
`discord_integrations.webhook_url` (no client-readable RLS by design). Both
Discord routes construct their clients lazily *inside* the handler and return a
clean 500 when env vars are missing, so `next build` never needs a runtime
secret. The stored webhook URL is re-validated before every fetch (SSRF guard).

---

## 4. Global providers (`app/layout.tsx`)

Mounted for the whole app, in order (`app/layout.tsx`):
`ToastProvider` → `ConfirmProvider` → `OSProvider` → `PresenceProvider` →
`PillProvider` → `SpotifyProvider`.

- **ToastProvider / ConfirmProvider** — the only sanctioned feedback +
  confirmation surfaces (`useToast()`, `useConfirm()`; never native dialogs).
- **OSProvider** (`lib/os/OSProvider.tsx`) — boots the core state backbone
  (`bootOS`): identity, active project, permissions, and the project-scoped
  realtime channel. `AuthContext` / `ProjectContext` were deleted, not shimmed.
- **PresenceProvider** — realtime presence (avatars, typing, voice rings).
- **PillProvider** — ScriptOS stage/pill UI state.
- **SpotifyProvider** — soundtrack widget state.

Chrome lives in two places, and nothing else mounts itself globally:
- `components/ClientShell.tsx` (root layout) renders `CustomCursor`,
  `CommandPalette` (⌘K), `ShortcutsOverlay`, `ThemeInitializer`,
  `EcosystemTaskbar` (the desktop dock; embeds `NotificationBell`) and
  `MobileTabBar`. CSS decides which navigation shows: at ≤760px the dock
  (`.mc-dock`) is hidden and the tab bar shows — Today · Projects · Capture ·
  Lounge (unread badge) · More (a sheet with Search, every tool, the active
  project, and the page's dock context actions as "On this page"). The tab bar
  hides on the editor (full-screen writing), split, auth and public pages, and
  slides away while a field has focus (the keyboard needs the room).
- Pocket (`components/mobile/Capture.tsx`, `Continue.tsx`, `lib/pocket/*`),
  also from `ClientShell`: `OutboxFlusher` sends captures kept on the device
  (IndexedDB) when online / back in front; `PlaceTracker` saves the last
  resumable place per device kind to `ui_prefs.places`; `ContinueOffer`
  offers the other device's place (a card on Today, a note on the first page
  of a visit elsewhere). `/today?capture=1` (home-screen shortcut) and
  `/today?url=|text=|title=` (the manifest's `share_target`) open Capture.
- Phones, suite-wide (`app/globals.css`): no sideways scroll, fields at 16px
  (no iOS zoom), room for the tab bar and the home indicator
  (`viewport-fit=cover`, `env(safe-area-inset-*)`), `.mc-phone-only` /
  `.mc-hide-phone` helpers; controls sized for touch under
  `(pointer: coarse)`. `e2e/mobile.spec.ts` guards it.
- The landing page (`app/page.tsx`) additionally renders `Navigation`.
- `GrainOverlay` is rendered per-page, not globally.

---

## 5. Data-access layer

The app never calls `supabase.from()` ad hoc in components — every table has a
typed module in `lib/supabase/*.ts` (e.g. `projects.ts`, `channels.ts`,
`scripts.ts`, `portfolio.ts`). Add new queries there, typed against
`lib/supabase/database.types.ts` (generated — regenerate with the Supabase MCP
`generate_typescript_types` after schema changes). See `conventions.md`.

## Framing

`next.config.js` sends `Content-Security-Policy: frame-ancestors 'self'` and
`X-Frame-Options: SAMEORIGIN` on every page except the public share pages
(`/p`, `/s`, `/shared`) and media permalinks (`/m`): only the split screen may
frame the app; nobody else can (clickjacking).
