# Database and Security — Misfits Cavern

## 1. Schema Overview
Misfits Cavern is powered by a relational PostgreSQL database hosted on Supabase. Row-Level Security (RLS) is enabled on every single table to enforce strict user boundaries.

### Core Tables & Relationships
- **`profiles`**: Linked directly to Supabase Auth (`auth.users`). Auto-created on user signup via a trigger on `auth.users`. Holds username, bio, location, notification preferences, and admin roles.
- **`projects`**: Created by profile owners (`creator_id`). Represents the workspace bounding box for all scripts, boards, and crew mappings.
- **`project_crew`**: Junction table mapping `profiles` to `projects` with specific roles and status ('pending', 'confirmed', 'declined').
- **`scripts`**: Stores the Fountain screenplay content, linked to a project (optional) and creator. Features a `share_token` for public viewing.
- **`script_metadata`**: Houses `title_page` JSONB and `character_bible` JSONB, preventing co-writers from overriding offline states.
- **`script_characters`**: Represents distinct characters in the story, mapping script character sheets to casting look-boards.
- **`channels` & `channel_members`**: Drives the Lounge communications, dividing project channels (Discord-style text/voice rooms) and community channels.
- **`messages`**: Multi-use chat logs (supporting threads via `parent_message_id` and reactions via a secured JSONB column).
- **`media`**: The project library — every reference photo, clip, track, PDF and link. Files live in the private `project-media` bucket at `<project_id>/<media_id>/<file>`; links use `external_url` (exactly one of the two). `shared` = included in the share link (owner-only, enforced by the `media_guard` trigger). Source and author are immutable.
- **`scenes`**: One row per scene heading of a script (`script_id`), kept in step with the text by `sync_script_scenes` (see `lib/studio/scene-sync.ts`). Ids survive rewrites; removed scenes are soft-deleted (`removed_at`) so their links come back if the heading does. Script-derived fields (heading, location, time of day, cast, length, elements) are written only by the sync; people set `note`, `color`, `shoot_day`, `status`.
- **`scene_media` / `character_media`**: Links from scenes / `script_characters` to `media`. Composite foreign keys pin both ends to the same project.
- **`studio_boards` & `studio_assets`**: Legacy, unused by the app since the Studio rebuild (2 orphaned rows in production, no project). To be dropped once confirmed.
- **`shots`**: Shot list per scene.
- **`activity_feed`**: Project activity. Entries carry `metadata.project_id`; readable by the author and by people with access to that project only.
- **`call_sheets` & `call_sheet_calls`**: Daily call times and specific crew shifts, linked to project crew schedules.
- **`budget_items` & `timeline_items`**: Manages the production costs and milestone timelines.
- **`portfolio_projects` & `portfolio_media`**: Holds the public showcases for filmmaker directories.
- **`spotify_connections`**: Stores persistent encrypted/OAuth access and refresh tokens per user for the Soundtrack widget.

---

## 2. Row-Level Security (RLS) Architecture
RLS is our security baseline. Any table added must have RLS enabled immediately.

### A. Preventing Recursion: The `internal` Schema
In Postgres, writing policies like:
*“Allow project_crew selection if you are a member of the project”*
can easily trigger an infinite recursion loop (Postgres Error `42P17: infinite recursion`) because the engine evaluates the membership lookup by querying `project_crew`, which triggers the same policy check again.

**Solution:**
We use `SECURITY DEFINER` helper functions defined inside the `internal` schema (which bypasses RLS on execution for the targeted tables, but executes under strict system constraints):
1. **`internal.is_project_creator(pid uuid)`**: Returns true if `auth.uid()` matches the project's creator.
2. **`internal.is_project_member(pid uuid)`**: Returns true if `auth.uid()` matches a confirmed member in `project_crew` for that project.
3. **`internal.can_access_script(sid uuid)`**: Checks if the user is the script owner, collaborator, or part of the parent project.
4. **`internal.can_access_project(pid uuid)`**: Owner, or crew *unless the project is private* — the same rule as the `projects` row policy. Use it for every new project-scoped table (media, scenes, links, activity do). Older tables still use `is_project_creator OR is_project_member`, which ignores `private`; migrate them when touched.

**Gotcha:** policies store function OIDs, so they can call `internal.*` without schema USAGE. PL/pgSQL resolves names at run time, so an invoker-rights plpgsql function or trigger that calls `internal.*` fails with `permission denied for schema internal`. Make such triggers `SECURITY DEFINER` (as `internal.media_guard`), or express the check through RLS (as `sync_script_scenes` does with a `projects` lookup).

These helper functions are placed in the `internal` schema to prevent them from being automatically exposed as REST API RPC endpoints via PostgREST (which would let unauthorized users probe existence of projects and scripts).

### B. High-Performance Policies (InitPlan form)
To optimize performance, every policy that checks `auth.uid()` or roles must wrap the function call in a scalar subquery. This tricks the PostgreSQL optimizer into evaluating the credential once per transaction/statement (`InitPlan`), rather than executing the lookup once for every single row scanned in a large query.

**Example Policy Design:**
```sql
-- Optimal performance using InitPlan form:
CREATE POLICY "Project members can view" ON projects FOR SELECT USING (
  creator_id = (SELECT auth.uid()) OR internal.is_project_member(id)
);
```

### C. Public Sharing Security Gutter
Anonymous, logged-out users are identified under the Postgres `anon` role. For sharing to function:
- **Scripts:** `CREATE POLICY "Shared scripts publicly viewable" ON scripts FOR SELECT TO anon USING (shared = TRUE);`
- **Portfolios:** Scoped via `share_token` or `is_public = true`.
- Private data (budgets, crew rosters, chats) must have **no** select policy granted to `anon`.
- **Project share links** (`/shared/<share_token>`) resolve only through `SECURITY DEFINER` RPCs that check the exact token and `visibility in ('link','public')`: `get_shared_project` (overview fields) and `get_shared_lookbook` (published media + the scene headings they're linked to — never notes or unpublished items).
- **Published files** are readable by anon only while `media.shared` and the project is link/public (storage policy `project-media: shared read`). `/m/<media_id>` is the stable permalink: it checks `get_published_media` and redirects to a fresh short-lived signed URL, uncached, so unpublishing takes effect at once.
- **Showcase** (`get_public_showcase`) lists published media of `public` projects only. **Platform totals** come from `get_platform_stats` (counts only) — counting through RLS shows each person their own numbers.

---

## 3. Database Changes — the migration workflow (authoritative)

`supabase/migrations/` is the **single source of truth** for the schema. It
starts from `20260926000000_baseline.sql` (production reconstructed from the
live catalog) and every change is a new, never-edited file after it. Production
is changed *only* by applying those files — never by ad-hoc SQL.

1. **Write it:** `npx supabase migration new <name>` → edit the new file.
2. **Build it locally:** `npm run db:start` (once) → `npm run db:reset`
   (rebuilds from all migrations).
3. **Snapshot it:** `npm run db:drift -- --update` rewrites
   `supabase/schema.fingerprint`; the diff shows reviewers exactly which
   columns / policies / functions / grants changed.
4. **Type it:** `npm run db:types` regenerates `lib/supabase/database.types.ts`.
   Never cast around a missing column — regenerate.
5. **Prove it:** add or extend a test in `tests/integration/` that exercises the
   change as Sam / Jordan / Riley / anon through the real API, and show it
   failing before the migration where it fixes a bug. `npm run test:integration`.
6. **PR:** CI's `database` job rebuilds from scratch and fails on schema drift,
   stale types, or any persona test.
7. **After merge:** apply the same migration file to production, then run the
   *Production schema drift* workflow — it must be green.

**No Destructive Operations:** Never drop columns, alter tables, truncate data, or modify existing `SECURITY DEFINER` function parameters on production databases without explicit user consent and testing the rollback paths.
