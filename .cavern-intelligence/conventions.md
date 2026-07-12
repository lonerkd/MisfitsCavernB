# Conventions — Misfits Cavern

The patterns that are usually implicit / inline in the code. Follow these so new
work is indistinguishable from existing work. When in doubt, read a sibling file
in the same module first.

---

## 1. Data access — always through `lib/supabase/*.ts`

Components and pages **never** call `supabase.from(...)` directly. Every table
has a typed access module:

```
lib/supabase/
  client.ts          ← createBrowserClient<Database> (cookie-backed @supabase/ssr)
  database.types.ts  ← GENERATED. regen via Supabase MCP generate_typescript_types
  projects.ts crew-management.ts scripts.ts channels.ts messages.ts
  studio.ts breakdown.ts casting.ts portfolio.ts jobs.ts profiles.ts
  notifications.ts activity.ts audit.ts stats.ts annotations.ts
  auth.ts withTimeout.ts
```

Rules:
- Add a new query as an exported function in the matching module, typed against
  `Database` — no `any`, no untyped `.from()`.
- Wrap network calls that can hang with `withTimeout()`.
- Surface every failure via `useToast()` — a silent `catch` that swallows an
  error is a bug (this class of defect has shipped before; see STATE.md history).
- After any schema change, **regenerate** `database.types.ts` and let TypeScript
  find the drift. Generated types have caught real column-drift bugs repeatedly.

---

## 2. Client vs. server

- Browser client: `lib/supabase/client.ts` → `createBrowserClient<Database>`.
  Cookie-backed, so the session is readable in middleware.
- Server (route handlers / middleware): `createServerClient` with the cookie
  adapter (see `middleware.ts`).
- **Service-role** client: server-only, lazily constructed, guarded against a
  missing key. Never import it into anything that ships to the browser. Only
  `NEXT_PUBLIC_*` vars are safe client-side.

---

## 3. Feedback & confirmation (non-negotiable)

- All notifications: `useToast()` / `<Toast />`.
- All confirmations: `useConfirm()` from `components/Confirm.tsx`.
- **Never** `alert()`, `confirm()`, or `window.*` dialogs. There are zero
  exceptions — a native dialog breaks the cohesive-system rule.

---

## 4. Preferences & caching

- **Account-level** prefs (notification toggles, leak-check, etc.) →
  Postgres `profiles.notification_prefs` (JSONB).
- **Device-level** only (cursor style, reduce-motion, dock collapse, offline
  script cache) → `localStorage` / IndexedDB. Namespace per project where it
  matters (e.g. ScriptOS active-script pointer) so state can't cross projects.

---

## 5. Permissions

- Server/DB truth: RLS + `internal.*` SECURITY DEFINER helpers
  (`is_project_creator`, `is_project_member`, `can_access_script`,
  `can_view/post/manage_channel`). See `database-and-security.md`.
- Client mirror (for gating UI, never for security): `lib/permissions/` —
  `access-matrix.ts` (unit-tested), `role-permissions.ts`, `usePermissions.ts`.
  Gate destructive controls (e.g. crew role dropdowns) on the matrix so they
  don't render enabled and then silently fail at RLS.

---

## 6. TypeScript & styling

- No `any`, no `@ts-ignore`. Fix the type. (`tsconfig` is `strict: false` today
  — treat it as strict anyway; tightening it is a tracked goal.)
- Tailwind utilities + CSS custom properties from `app/globals.css`. Reuse
  existing classes (`.btn-primary`, `.card`, `.glass`, film-grain/chrome
  aesthetic) before writing new CSS. Full rubric: `design-tokens.md`.
- Prefer `next/image` over `<img>` (lint warns on `<img>`); always set `alt`.
- Realtime UI (co-editing, typing, voice) must be tested with **two**
  simultaneous sessions.

---

## 7. Verify before claiming

Every change: `npx tsc --noEmit && npm run build && npm run lint`.
DB/RLS changes: persona-simulated SQL for **all three** directions —
Sam ✅ (owner), Jordan ✅ (scoped crew), Riley ❌ (outsider; any leak is P0).
The `verify` skill can drive this end-to-end.

---

## 8. Migrations

- Live DB is source of truth; change it via **named** migrations
  (`apply_migration` is allow-listed — no prompt, so be deliberate).
- Mirror every migration verbatim into `supabase-schema.sql` **in the same PR**.
- Never drop columns / alter definer-fn signatures / truncate on prod without
  explicit consent and a tested rollback path.

---

## 9. Git & PR

- Never commit to `main` (deny-blocked). Feature work → `claude/*` branch → PR.
- Commit code **and** its `.cavern-intelligence/` doc updates together.
- Run `npm run sync-intel` and update `STATE.md` before finishing.
- Don't merge until CI (Vercel build) is green.
