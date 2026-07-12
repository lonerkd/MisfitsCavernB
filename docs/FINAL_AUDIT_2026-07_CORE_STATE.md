# Misfits Cavern — Final Audit: Core State Backbone (July 2026)

This audit supersedes the narrative history that previously lived in this repo. Every finding below was verified by reading the code itself — not comments, not STATE files, not commit messages. It deliberately excludes findings already recorded in `docs/TECHNICAL_AUDIT_2026-07.md` and focuses on the structural question: **does this suite have a unified state backbone, and if not, what does the fragmentation actually look like in the code?**

The answer: it does not. The suite has **four parallel identity systems, two parallel permission systems, and three parallel project-context resolutions**, and the most sophisticated of each is nearly unused. What follows is the evidence, then the target architecture ("the OS"), then the migration plan.

---

## 1. Executive Summary

The client-direct, RLS-backed architecture is the **right model** for this product — Figma, Linear, and Excalidraw all ship client-heavy apps where the client is trusted for UX and the backend enforces truth. The mistake was never "client-sided app"; the mistake is that **each tool re-derives who the user is and what project is active, independently, on every interaction**. The codebase contains a full state backbone's worth of parts — `AuthContext` (379 lines), `ProjectContext` (363 lines), two permission engines (536 lines), `useRequireAuth` — but they were bolted on at different times and never became the single spine. The result, measured:

- **42 files** call `supabase.auth.getUser()` directly (every page, most data-layer modules, three context providers) — each one an independent, async, fallible identity resolution.
- **`useAuth()` — the hook exposing the entire permission machine — has exactly 1 consumer** (`components/RoleBasedNav.tsx:15,114`). The 379-line AuthContext runs on every page load, fetches the profile, computes roles and permissions… and almost nothing reads it.
- `usePermissions.ts` exports 8 permission hooks; **`usePermissions()` itself has 0 consumers**.
- Data-layer functions (`lib/scriptos/storage.ts:20,68,172`, `lib/supabase/scripts.ts:19`, `lib/supabase/channels.ts:43,133`, `lib/scriptos/revisions.ts:93`…) each call `getUser()` internally per operation — so a single editor action can resolve identity 2–3 times in one flow.

Grade for the state architecture specifically: **D**. Grade for the underlying model it should converge to: already correct. This is a consolidation problem, not a rewrite-the-stack problem — and that is good news, because the RLS layer means every step of the consolidation is safe: the database keeps enforcing truth while the client is restructured above it.

---

## 2. The Evidence: Fragmentation Map

### 2.1 Four parallel identity systems

| # | System | Where | Who uses it |
|---|---|---|---|
| 1 | `AuthContext` — full state: profile, role, permissions, projectAccess | `lib/context/AuthContext.tsx` | 1 component (`RoleBasedNav`) + the `usePermissions` hooks (admin pages only) |
| 2 | `useRequireAuth` — own `getUser()` + retry + redirect | `lib/useRequireAuth.ts` | editor, lounge, studio pages |
| 3 | Raw `supabase.auth.getUser()` | 42 files across `app/`, `components/`, `lib/` | everything else, per-interaction |
| 4 | Middleware `getUser()` | `middleware.ts:59` | route gating (server) |

Consequences, concrete:

- **No single loading gate.** `AuthContext` resolves the user (`AuthContext.tsx:36-96`), and *in parallel* `useRequireAuth` resolves the same user again per page (`useRequireAuth.ts:20-48`), and *in parallel* `ProjectContext` resolves it a third time (`ProjectContext.tsx:278`), and *in parallel* `PresenceContext` a fourth (`PresenceContext.tsx:42,98`). Four concurrent `getUser()` races on every page load, each with its own loading flag and its own failure path. The 500ms-retry hack in `useRequireAuth.ts:36-40` exists precisely because these racing resolutions see different cookie states mid-OAuth — a symptom of the missing backbone, patched where it itched.
- **Event handlers re-authenticate.** Example: casting a character in the editor (`app/editor/page.tsx:424`) calls `getUser()` inside the click handler even though the page already passed `useRequireAuth` and `AuthContext` holds the profile. Same pattern in `app/lounge/page.tsx:553`, `app/studio/page.tsx` (multiple), and every save path in `lib/scriptos/storage.ts`. Each call is an async round-trip that can fail independently mid-action — this is where "converted, analyzed, modified" data flows are most at risk, because step 1 and step 3 of a pipeline may disagree about the user.
- **The data layer guesses too.** `lib/scriptos/storage.ts` filters scripts by `script.user_id === user.id` *client-side after fetching* (`storage.ts:91,125`) — identity resolved inside the storage module, ownership re-checked in JS on top of RLS, per call. A backbone would pass identity in; RLS would remain the enforcement.

### 2.2 Two parallel permission systems (verified disjoint)

- **System A:** `lib/permissions/role-permissions.ts` (120 lines) — consumed by `AuthContext` (`AuthContext.tsx:6`) → effectively reaches 1 component.
- **System B:** `lib/permissions/access-matrix.ts` (416 lines) — consumed by `usePermissions.ts:5` → `usePageAccess`/`useActionAccess` → admin pages and `Navigation.tsx`.
- Plus a **third**, inline: `AuthContext.tsx:340-379` hardcodes a project-role→permission table (`getProjectPermissionsForRole`) that overlaps both.

These three tables can (and will) disagree about what a role can do. The only permission checks that actually matter today are the RLS policies — which means the client-side gating users *see* (disabled buttons, hidden nav) is driven by whichever of three tables the nearest component happens to import. The `access-matrix.test.ts` unit tests assert internal consistency of System B — they cannot catch A↔B drift because the systems don't share a source of truth.

### 2.3 Project context: one provider, three behaviors

`ProjectContext` is the closest thing to a backbone that exists — 12 components consume `useProject()`. But:

- **Pages still fetch their own project lists around it.** `app/studio/page.tsx:18` imports `getUserProjects` and maintains its own copy alongside `useProject()`'s `projects` array — two lists, two refresh cycles, no guaranteed agreement.
- **Active-project persistence is a bare localStorage key** (`mc_active_project`, `ProjectContext.tsx:203-219`) with no validation against the fetched list beyond a `find` (`:291`) — while ScriptOS persists its own *separate* notion of "current script" under `misfits_cavern_current_script` (`lib/scriptos/storage.ts:239`) with **no linkage to the active project**. Nothing prevents the editor's current script from belonging to project A while the Studio breakdown syncs against project B. For a suite whose core loop is *script → breakdown → schedule → budget*, this is the single most dangerous gap in the codebase: the conversion pipeline's two ends can silently point at different projects.
- **The realtime channel is unscoped.** `ProjectContext.tsx:310-337` subscribes to `postgres_changes` on the entire `projects`, `budget_items`, and `timeline_items` tables with no `filter:` — every change to any row the user can see anywhere triggers callbacks, and any budget/timeline change to the active project triggers `refreshProject`, which re-runs **8 parallel queries** (`ProjectContext.tsx:221-231`). Editing 10 budget rows = 80 queries. This is the sync model that must instead be: one scoped channel per active project, patching state deltas.

### 2.4 The comment/documentation delusion (now removed)

Verified concrete example of why the purge was justified: `AuthContext.tsx` carried a comment block explaining that its loading flags gate "ProtectedPage and useAuthState across the suite" — but `ProtectedPage` is used by exactly 5 pages (4 admin + portfolio) and the described suite-wide gating never existed; the suite actually gates through `useRequireAuth`, which doesn't read AuthContext at all. The comments described the *intended* architecture; the code implemented a different one. All narrative comments, the `.cavern-intelligence/` knowledge hub, `AGENTS.md`, `CLAUDE.md`, copilot instructions, vendored skill docs, and the scratch/build artifacts have been removed in this pass. Code is now the only source of truth, plus the two audit documents in `docs/`.

### 2.5 Additional verified findings (new, not in the prior audit)

- **Signup writes the profile from the client, redundantly and racily.** `AuthContext.tsx:190-196` inserts into `profiles` after `auth.signUp` from the browser. If the schema has an auth trigger creating profiles (as `supabase-schema.sql`'s trigger section indicates), this is a duplicate-insert race; if not, a user whose insert fails (network, RLS) exists in auth with no profile forever — and `AuthContext.tsx:60-70` then treats them as an unauthenticated guest despite a valid session. Either way the logic is wrong in one branch.
- **`updateProject` swallows failure into a toast and keeps stale state.** `ProjectContext.tsx:339-348` — on error it toasts but does not revert or refetch; local `activeProject` still shows the un-persisted value until the next realtime event that never comes (the write failed). Optimistic UI without rollback.
- **`signOut` clears Supabase auth but not suite state.** `AuthContext.tsx:208-223` — `ProjectContext` keeps the previous user's `projects`, `activeProject` (and the `mc_active_project` localStorage key), `PresenceContext` keeps its channel, ScriptOS keeps `misfits_cavern_current_script`. On a shared machine, the next sign-in inherits the previous user's active-project pointer. RLS prevents *data* leakage, but the client state machine is simply never reset — more backbone evidence: there is no single place where "the user changed" is handled.
- **`onAuthStateChange` and `initAuth` race on startup.** Both run from the same effect (`AuthContext.tsx:36-155`); `INITIAL_SESSION` fires the listener while `initAuth` is mid-flight, producing two concurrent profile fetches and two `setState` sequences whose last-writer wins. Harmless today only because both compute the same answer; it will not stay harmless once state carries more than identity.
- **`loadProjectAccess` is on-demand and almost never demanded.** Project-scoped permissions (`AuthContext.tsx:225-278`) populate only when someone calls `loadProjectAccess(projectId)` — and no page in `app/` calls it on navigation. `checkProjectAccess` (`:300-307`) returns `false` for any unloaded project, so any UI gated on it is permanently locked, and any UI gated on `canPerformAction` with a project context silently falls through to global-role checks (`:288-295`). The project-permission layer is effectively decorative.

### 2.6 What the fragmentation costs (why this app specifically)

In a CRUD app, four identity systems is untidy. In this suite it's structural, because the product's whole premise is *cross-tool data conversion*: parser → scenes → breakdown → schedule → budget → call sheet, plus chat/voice/presence bound to the same project. Every conversion step that independently resolves `(user, project)` is a step that can resolve them *differently* — and the failure mode isn't an error, it's silently writing derived data against the wrong scope. The two-localStorage-keys finding (§2.3) is that failure mode already latent in the code.

---

## 3. Target Architecture: the OS (Core State Backbone)

Principle: **resolve once, subscribe everywhere, enforce in the database.** The client is trusted the way Figma trusts its client — for responsiveness and UX truth — while RLS remains the actual boundary. Concretely:

### 3.1 One provider: `OSProvider`

A single provider (React Context + `useSyncExternalStore`, or a ~1KB store like Zustand — no heavy state framework needed) that owns exactly this state, resolved **once** at app boot and updated **only** by auth events and realtime deltas:

```
OS = {
  session:   { user, profile, status: 'resolving' | 'authed' | 'anon' }
  project:   { active, list, role, permissions, status }
  presence:  { online, channel }
  prefs:     { theme, device-level settings }
}
```

Rules, in priority order:

1. **Identity is resolved exactly once per session change.** `supabase.auth.getUser()` is called in exactly two places in the entire codebase: `OSProvider` boot and `middleware.ts`. Everything else — pages, components, the data layer — receives identity from the OS. Data-layer functions take `userId` as a parameter instead of fetching it (`saveScript(os.userId, …)`), which also makes them unit-testable for the first time.
2. **Active project is a validated, single pointer with derived scope.** One persisted key. On boot: restore → validate against the fetched list → resolve the user's role *in that project* → load project permissions — all before `project.status` flips to ready. The current-script pointer becomes `mc_active_script:<projectId>` — namespaced under the project so the script/breakdown pipeline *cannot* cross projects.
3. **One permission table.** `role-permissions.ts`, the inline table in `AuthContext.tsx:340-379`, and `access-matrix.ts` merge into a single `lib/os/permissions.ts` whose shape mirrors the RLS helpers (`is_project_creator`, `is_project_member`, `can_access_script`) — the client table is a *cache of what RLS will say*, kept intentionally aligned, not a third opinion. The existing matrix tests move over and gain a fixture asserting the table matches a snapshot of RLS policy intent.
4. **Sync flows through one scoped pipe.** One realtime channel per `(user, activeProject)`: `project:<id>` with `filter: project_id=eq.<id>` on the tables that matter, patching OS state with deltas instead of 8-query refetches. Presence and chat subscribe to the same channel family. Switching projects = tear down one channel, open one channel.
5. **Session transitions are events with total cleanup.** `SIGNED_OUT` and user-change reset the *entire* OS (state + namespaced localStorage), in one place. No provider retains cross-user residue.
6. **Tools subscribe with selectors.** `useOS(s => s.session.user)`, `useOS(s => s.project.active)`, `useOSGate()` (the one loading/redirect gate replacing `useRequireAuth` + `ProtectedPage` + ad-hoc checks). The Fountain parser, 3D gallery, Discord notifier, scheduler — all consume, never resolve.

### 3.2 What does NOT change

- **Supabase-direct data access stays.** No API layer is being inserted; RLS remains the enforcement boundary. The data layer's *queries* are fine — only their self-resolution of identity/project goes.
- **The App Router file structure stays.** You raised "even the idea of using an app structure in the files" — verdict: the route tree (`app/<tool>/page.tsx`) is the correct skeleton for a multi-tool suite and is not the problem; what's wrong is what lives *inside* the pages (god files, per-page state resolution). Replacing the router would burn weeks for zero architectural gain. The reorganization is: `lib/os/` (the backbone), `lib/data/` (parameterized data layer), `components/<tool>/` (extracted tool UIs), `app/` (thin route shells).
- **The DB schema and RLS stay** (modulo the profile-creation trigger decision, §2.5).

---

## 4. Migration Plan (ordered; each step ships green)

The prior audit's Milestone 0 (test safety net, persona e2e in CI) remains the precondition and its plan is unchanged. The backbone work then replaces/reorders that audit's Milestone 2:

| # | Step | What | Effort | Risk |
|---|---|---|---|---|
| B1 | **Build `lib/os/` store + `OSProvider`** wrapping current behavior: absorb AuthContext's resolution (fixing the init/listener race, §2.5), ProjectContext's list+active logic (adding restore validation), total signout cleanup. Old providers become thin adapters over the OS so nothing else changes yet. | new `lib/os/` | L | Low — adapters keep every consumer working |
| B2 | **Merge the three permission tables** into `lib/os/permissions.ts`; port tests; delete `role-permissions.ts`, the inline table, and re-point `access-matrix` consumers. | `lib/permissions/*` → `lib/os/` | M | Low |
| B3 | **Kill the 42 direct `getUser()` calls.** Pages/components: replace with OS selectors + `useOSGate` (deletes `useRequireAuth`). Data layer: add `userId` parameters, callers pass from OS. Mechanical, per-directory PRs. | ~42 files | L | Medium — touch count; typecheck + persona e2e gate each PR |
| B4 | **Unify project scope.** Namespace the script pointer under project id; remove `getUserProjects` duplication in studio (single OS list); make active-project switch an OS action that tears down/rebuilds the scoped realtime channel. | studio, editor, `lib/scriptos/storage.ts`, `lib/os/` | M | Medium — the script/breakdown pipeline must be e2e-tested across a project switch |
| B5 | **Scoped realtime + delta patching.** Replace the unscoped table-wide subscriptions and 8-query `refreshProject` with `filter: project_id=eq.<active>` channels patching OS state. | `lib/os/sync.ts` | M | Medium |
| B6 | **Fix the signup/profile-creation split** (§2.5): move profile creation to a DB trigger on `auth.users` (or confirm the existing one and delete the client insert). | schema migration + `lib/os/` | S | Low |
| B7 | **Then** the god-file splits (prior audit M2.3/M2.4) — done *after* the backbone exists, so extracted components are born subscribing to the OS rather than inheriting page-level state plumbing. | studio/editor | XL | Medium |

Order matters: B1–B3 before any page splitting, because splitting a 3,000-line page that resolves its own identity 10 ways just distributes the fragmentation into more files.

**Done means:** `grep -rn "auth.getUser()" app components lib | wc -l` returns 2 (OS boot + middleware); one permission table with tests; one persisted project pointer, script pointer namespaced under it; realtime subscriptions carry a `project_id` filter; signout leaves zero suite state behind; persona e2e green across a mid-session project switch.

---

## 5. Repo Hygiene Executed In This Pass

Done alongside this audit (all verified: `tsc`, eslint, vitest 36/36, `next build` all green after):

- Removed: `.cavern-intelligence/` (11 files), `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.agents/` (vendored skill docs), `skills-lock.json`, `scratch_chrome_audit_prompt.md`, `tsconfig.tsbuildinfo` (+ gitignored), `scripts/sync-intel.js` (+ its npm script).
- Stripped narrative comments from 135 source files (AST-based; functional directives, titles, and dividers preserved), plus narrative comments in the SQL schema/migrations and `globals.css`.
- README reduced to setup/commands/map.
- `docs/` now contains exactly the two audit documents; nothing else in the repo narrates.

## 6. Open Questions

1. Does a DB trigger currently create `profiles` rows on signup? (Determines B6's direction — needs one live-schema check.)
2. Zustand (tiny dep) vs. hand-rolled `useSyncExternalStore` store for the OS? Recommendation: Zustand — selector subscriptions prevent the whole-app re-renders a naive Context would cause under realtime patching.
3. Should the OS also own Spotify/theme state (`SpotifyContext`, `PillContext`), or do those stay as leaf providers? Recommendation: leave them as leaves in B1; fold in only if they need project/user scoping later.
