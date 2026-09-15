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
- **`studio_boards` & `studio_assets`**: Backs the collaborative canvas board and visual pinboards.
- **`scenes` & `shots`**: The backbone of pre-production scheduling, elements tracking, and call-sheet generation.
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

---

## 3. Database Syncing and Migration Rules
1. **The Live DB is Source of Truth:** Live changes are applied directly as named migrations on Supabase.
2. **Schema Mirroring:** Every live schema modification must be mirrored verbatim into the repository's `supabase-schema.sql` file. This allows local development environments to be bootstrapped from scratch.
3. **No Destructive Operations:** Never drop columns, alter tables, truncate data, or modify existing `SECURITY DEFINER` function parameters on production databases without explicit user consent and testing the rollback paths.
