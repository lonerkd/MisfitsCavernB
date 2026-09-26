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
  withTimeout.ts
```

Rules:
- Add a new query as an exported function in the matching module, typed against
  `Database` — no `any`, no untyped `.from()`.
- Wrap network calls that can hang with `withTimeout()`.
- Surface every failure via `useToast()` — a silent `catch` that swallows an
  error is a bug (this class of defect has shipped before; see STATE.md history).
- After any schema change, **regenerate** `database.types.ts` and let TypeScript
  find the drift. Generated types have caught real column-drift bugs repeatedly.
- Validate every untrusted boundary with **zod** (`lib/validation/`): API route
  bodies and query params, and auth/forms. Never hand-roll `typeof` checks or
  one-off regex validators — add a schema, derive its type with `z.infer`, and
  use the `parseJsonBody()` / `firstIssue()` helpers so every route returns the
  same shape of error. Schemas live in one file so the client and the route
  cannot disagree about what is valid.

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
- Client mirror (for gating UI, never for security): `lib/os/access-matrix.ts`
  (unit-tested) and `lib/os/permissions.ts`. The old `lib/permissions/` tree
  (`access-control.tsx`, `role-permissions.ts`, `usePermissions.ts`) was deleted
  in the core-state consolidation.
  Gate destructive controls (e.g. crew role dropdowns) on the matrix so they
  don't render enabled and then silently fail at RLS.

---

## 6. TypeScript & styling

- No `any`, no `@ts-ignore`. `tsconfig` is `strict: true` — `npm run build`
  fails on type errors, so fix the type rather than silencing it.
- Tailwind utilities + CSS custom properties from `app/globals.css`. Reuse
  existing classes (`.btn-primary`, `.card`, `.glass`, film-grain/chrome
  aesthetic) before writing new CSS. Full rubric: `design-tokens.md`.
- Prefer `next/image` over `<img>` (lint warns on `<img>`); always set `alt`.
- Realtime UI (co-editing, typing, voice) must be tested with **two**
  simultaneous sessions.

---

## 7. Verify before claiming

Every change: `npx tsc --noEmit && npm run lint && npm run test && npm run build`.
DB/RLS changes: persona-simulated SQL for **all three** directions —
Sam ✅ (owner), Jordan ✅ (scoped crew), Riley ❌ (outsider; any leak is P0).
The `verify` skill can drive this end-to-end.

---

## 8. Migrations

- `supabase/migrations/` is the source of truth; follow the workflow in
  `database-and-security.md` §3. Production only ever receives migration files
  that are already merged — never ad-hoc SQL.
- Never drop columns / alter definer-fn signatures / truncate on prod without
  explicit consent and a tested rollback path.

---

## 9. Git & PR

- Never commit to `main` (deny-blocked). Feature work → `claude/*` branch → PR.
- Commit code **and** its `.cavern-intelligence/` doc updates together.
- Run `npm run sync-intel` and update `STATE.md` before finishing.
- Don't merge until CI (Vercel build) is green.
