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
  `/portfolio`, `/profile`, `/settings`, `/soundtrack`.
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
| `/projects` | protected | Projects hub | `lib/supabase/projects.ts` |
| `/projects/[id]` | protected | Project hub | project dashboard; links to editor/studio/pitch |
| `/projects/[id]/pitch` | protected | Pitch board | portfolio publish flow |
| `/editor` | protected | **ScriptOS** | `lib/scriptos/*`, `components/editor/*` — see `scriptos-engine.md` |
| `/studio` | protected | The Studio | `lib/supabase/studio.ts`, `breakdown.ts`, `casting.ts`, `components/canvas/*` — see `studio-and-preproduction.md` |
| `/soundtrack` | protected | Soundtrack | `lib/spotify/*`, `GlobalAudioWidget`, SFX/Audio Bible |
| `/lounge` | protected | **The Lounge** | `lib/supabase/channels.ts`, `messages.ts`, `lib/webrtc/voice.ts` — see `lounge-and-audio.md` |
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
| `/api/discord/test` | POST | Bearer | webhook connectivity test |
| `/api/references/search` | GET | — | reference-image search for Studio boards |

`/api/discord/notify` uses `SUPABASE_SERVICE_ROLE_KEY` server-side to read
`discord_integrations.webhook_url` (no client-readable RLS by design). It must
lazily construct the admin client so `next build` survives a missing key —
**this is the current CI blocker** (tracked, not fixed here).

---

## 4. Global providers (`app/layout.tsx`)

Mounted for the whole app, in order:
`ToastProvider` → `ConfirmProvider` → `AuthProvider` → `ProjectProvider` →
`PresenceProvider` → `PillProvider` → `SpotifyProvider`.

- **ToastProvider / ConfirmProvider** — the only sanctioned feedback +
  confirmation surfaces (`useToast()`, `useConfirm()`; never native dialogs).
- **AuthProvider** (`lib/context/AuthContext`) — session + `projectAccess`.
- **ProjectProvider** — active project scope.
- **PresenceProvider** — realtime presence (avatars, typing, voice rings).
- **SpotifyProvider** — soundtrack widget state.

Chrome components always present: `Navigation` / `RoleBasedNav`,
`EcosystemTaskbar`, `LoungeDock`, `NotificationBell`, `CommandPalette`
(⌘K), `CustomCursor`, `GrainOverlay`, `NetworkStatus`.

---

## 5. Data-access layer

The app never calls `supabase.from()` ad hoc in components — every table has a
typed module in `lib/supabase/*.ts` (e.g. `projects.ts`, `channels.ts`,
`scripts.ts`, `portfolio.ts`). Add new queries there, typed against
`lib/supabase/database.types.ts` (generated — regenerate with the Supabase MCP
`generate_typescript_types` after schema changes). See `conventions.md`.
