# Database and Security — The Cavern

## 1. Schema Overview
The Cavern is powered by a relational PostgreSQL database hosted on Supabase. Row-Level Security (RLS) is enabled on every single table to enforce strict user boundaries.

### Core Tables & Relationships
- **`profiles`**: Linked directly to Supabase Auth (`auth.users`). Auto-created on user signup via a trigger on `auth.users`. Holds username, bio, location, notification preferences, and admin roles. **Column-restricted:** anon/authenticated may only select the public columns (`PUBLIC_PROFILE_COLUMNS` in `lib/supabase/profile-columns.ts`); `select('*')` fails. The owner reads `is_admin`, `notification_prefs`, `discord_id` through `get_my_account()`; admins list users through `admin_list_users()`; admin rights change only through `set_user_admin()` (trigger `profiles_guard`).
- **`projects`**: Created by profile owners (`creator_id`). Represents the workspace bounding box for all scripts, boards, and crew mappings.
- **`project_crew`**: Junction table mapping `profiles` to `projects`: `role` is the permission level only (`lead` | `contributor` | `viewer`, CHECK-constrained; the owner is `projects.creator_id`), `craft` is what they do on the project (→ `crafts`), plus status ('pending', 'confirmed', 'declined'). Hiring from a job sets `craft` to the job's craft.
- **`crafts`**: The suite's one list of film crafts (name PK, department, colour, position). Readable by everyone (anon too), written only by admins (`internal.caller_is_admin()`). `profiles.role`, `jobs.role` and `project_crew.craft` reference it by name with `ON UPDATE CASCADE`, so a rename follows through; a craft still used by a job can't be deleted. Client: `lib/crafts/crafts.ts` + `components/crafts/CraftPicker`.
- **`profiles.ui_prefs`**: Private per-account interface choices — `show_all_tools` (every tool in every project), `seen_tools` (tool intros read), `dismissed` (phase suggestions waved off, `<project>:<phase>`), `guide` (how they work: `hours` 1–80, `experience` first|some|seasoned, `team` solo|small|crew, optional `depth` walkthrough|tips|light; replaced whole, `null` clears), `theme` (`{id}` — a preset id or `system` — or `{id:"custom", bg, accent}` with `#rrggbb` colours; replaced whole). Not granted as a column; read/written only via `get_my_ui_prefs()` / `set_my_ui_prefs(patch)`, which accept only those keys (typed, bounded). Client: `lib/os/uiPrefs.ts`.
- **`search_suite(p_query, p_limit)`**: invoker (every table's RLS applies) word-start search over the caller's projects' work (projects, scripts incl. content, scenes, characters, media, locations, documents, tasks, post notes — limited to projects they own or are confirmed crew on), open jobs and non-sample people. `scripts_content_search_idx` (GIN, `simple`) backs the script text. Client: `lib/search/search.ts`, the ⌘K palette.
- **`unavailability`** (a person's dates away: `starts_on`–`ends_on`, ≤366 days, private `note` ≤200): own rows only. Planners read others' dates (never notes) via `project_availability(p_project, p_from, p_to)` — definer, gated on `internal.can_shape_project`, limited to the project's owner and confirmed crew. Client: `lib/availability`.
- **`guide_progress`** (PK `user_id, project_id`): a person's guide on a project — `workflow` (a `lib/guides` id, `^[a-z][a-z-]{0,39}$`), `done` (steps ticked by hand, ≤200), `hidden`. Own rows only; insert/update also need `internal.can_access_project`. Client: `lib/guides/index.ts`.
- **`projects.archived_at`**: The owner shelves a project (the existing "Creators update projects" policy); the board and the Studio picker hide it until restored. Nothing else changes — crew still see it.
- **`projects_progress(ids uuid[])`**: `project_progress()` for up to 200 projects in one call, keyed by id — SECURITY INVOKER, so projects the caller can't see are simply absent. Feeds the projects board.
- **Call sheet issuing**: `call_sheets.version/issued_at/issued_by/issued/reminded_at` are written only by `issue_call_sheet()` (owner or leads, `can_shape_project`) and `send_call_sheet_reminders()` (service_role / pg_cron) — `call_sheets_issue_guard` rejects direct writes (the functions set the transaction-local `mc.issuing_call_sheet`). Notifications go to the owner + confirmed crew (`internal.call_sheet_recipients`). `call_sheet_acks`: read by the production, written only via `ack_call_sheet()`; in realtime.
- **Hiring**: `respond_to_application(app, status, close)` (the poster only; hiring onto a project needs `can_shape_project`) sets the status, adds the applicant to `project_crew` without changing an existing member's role, casts them for a casting call (`jobs.character_name`, stored upper-case in `character_castings`), optionally closes the job, and notifies. Job inserts linked to a project need `can_shape_project`. Applicants read jobs they applied to via `internal.applied_to()` (a definer helper — a direct subquery would recurse through job_applications' policies). `append_to_script(script, text)` is SECURITY INVOKER (the "scripts update" policy decides; 1–10000 characters) — the beat board's one-statement append. `jobs` has one SELECT policy, "Jobs readable" (poster · open and listed · applied to); `applied_to` is executable by anon too so that policy runs for signed-out readers (it's false without `auth.uid()`; `internal` isn't exposed by the API).
- **`project_locations`**: one record per location name (upper case, unique per project) — status, permit, address, contact, cost, notes. Read and written by the production (`can_access_project`), like call sheets; `created_by`/`created_at` can't be rewritten (touch trigger). In realtime. Scenes link by `scenes.location` = name.
- **Money**: `vendors` and `expenses` (committed/paid, `paid_at` stamped by `expenses_guard`; the receipt must be this project's media) are for `can_shape_project` only. Expenses reference budget lines and vendors by `(id, project_id)` so they can't cross projects; `expenses_sync_actuals` sets `budget_items.actual_cost` to the paid sum once a line has spend. `timesheets`: members insert/see their own; shapers see all and decide — `timesheets_guard` (definer: it calls `internal.*` by name, and `authenticated` has no USAGE on `internal`) blocks non-shapers from approving or setting a rate, stamps `decided_by/at`, and returns corrected approved hours to "submitted".
- **Sample data**: `profiles.is_sample` (settable only without a JWT — `profiles_guard`) and `projects.is_sample` mark the demo world. Public surfaces exclude them: `get_platform_stats`, `get_recent_work`, `get_public_showcase`, the crew directory/people search (client `.eq('is_sample', false)`), and the jobs SELECT policy (`internal.job_listed`: sample work is listed only to its project's owner and confirmed crew).
- **Lounge**: `messages` stays without an UPDATE policy — edits (`edit_message`, sender only, while they can post) and pins (`pin_message`, channel managers or either side of a DM) are definer RPCs. `lounge_reads` (own rows readable; written by `mark_lounge_read`) feeds `lounge_unread()` (definer, filters channels by `internal.can_view_channel`). `search_lounge` is invoker so the messages policy applies.
- **Paperwork**: `project_documents` (permit/insurance/release/contract/other; needed/pending/done; optional person, vendor and location — the latter two by `(id, project_id)`) — `can_shape_project` keeps them; a person reads only the ones naming them. A permit document linked to a location moves that location's permit to applied/granted (`project_documents_sync_permit`, definer). Files live in the private `project-papers` bucket at `{project}/{document}/…` (a check ties the path to its row); upload/delete for shapers, read via `internal.can_read_paper` (definer: shapers, or the person the document names).
- **`project_formats`**: What a project is (Feature, Short Film, Series, Music Video, Documentary, Commercial, Podcast, Other…): a blurb, an icon key, the script format new scripts start in, `phase_labels` (jsonb, only the five phase ids), `skip_phases` (never development/delivery) and `skip_milestones` (milestone ids from `lib/os/progress.ts`). Readable by everyone, written only by admins. `projects.project_type` and `portfolio_projects.category` reference it with `ON UPDATE CASCADE`; a format in use by a project can't be deleted. `project_progress()` returns the project's rules as `format`, so the phase engine names no format in code. Client: `lib/formats/formats.ts` + `components/formats/FormatPicker`.
- **Breakdown** (`breakdown_categories`, `breakdown_elements`, `scene_elements`, `breakdown_dismissals`): per-project categories (seeded, editable, `unit_cost`), one element per thing (unique on `lower(btrim(name))`), scene tags (composite FKs pin both ends to the project), dismissed suggestions; all `internal.can_access_project`. `tag_scene_element()` finds or creates. `breakdown_memory(p_exclude)` (invoker rights) returns what the caller tagged in their other projects — each name once, with the category key it was filed under in the most projects; the editor files suggestions by it. The parser's guesses are never stored (`scenes.elements` was dropped in `20260927040000`).
- **`scripts`**: Stores the Fountain screenplay content, linked to a project (optional) and creator. A project script belongs to the project: access follows `can_access_project` (not who created or last saved it). A personal script (`project_id` null) belongs to its `created_by`. `shared = true` makes it readable by anyone.
- **`script_metadata`**: Houses `title_page` JSONB and `character_bible` JSONB, preventing co-writers from overriding offline states.
- **`script_characters`**: Represents distinct characters in the story, mapping script character sheets to casting look-boards.
- **`brief_questions`, `project_brief`, `channel_presets`**: The project brief (see `project-brief.md`). Catalogue and presets are admin data; answers are validated against the catalogue (`internal.project_brief_guard`), read by the team, written by `internal.can_shape_project` (owner, lead, contributor — not viewers). `project_context(project)` summarises what the suite knows for the team only.
- **`channels` & `channel_members`**: The Lounge. Project channels and community (no project) channels, typed text / voice / guide. `audience` decides who sees one (community: `users`/`admins`; project: `team`/`owners`/`above`/`below`/`guests`/`public`, via `internal.in_project_audience` and `crafts.above_the_line`); `is_private` narrows to the roster. Admins create and run community channels. See `lounge-and-audio.md` §3.
- **`messages`**: Direct messages (`receiver_id`) or channel messages (`channel_uuid`, posting gated by `can_post_channel`); threads via `parent_message_id`; reactions only through `toggle_message_reaction`; deleted by the sender or whoever runs the channel. The legacy text `channel_id` is unused.
- **`notifications`**: `created_by` is recorded (defaults to the caller, can't be spoofed); you may notify only people you share a project, job, DM or channel with (`internal.can_notify`); `link` must be a site-relative path.
- **`audit_logs`**: Written in your own name only; read by admins (`internal.caller_is_admin()`).
- **`media`**: The project library — every reference photo, clip, track, PDF and link. Files live in the private `project-media` bucket at `<project_id>/<media_id>/<file>`; links use `external_url` (exactly one of the two). `shared` = included in the share link (owner-only, enforced by the `media_guard` trigger). Source and author are immutable.
- **`scenes`**: One row per scene heading of a script (`script_id`), kept in step with the text by `sync_script_scenes` (see `lib/studio/scene-sync.ts`). Ids survive rewrites; removed scenes are soft-deleted (`removed_at`) so their links come back if the heading does. Script-derived fields (heading, location, time of day, cast, length) are written only by the sync; people set `note`, `color`, `shoot_day`, `status`, and `read_seconds`/`read_at` (the last table-read time, 0 < s ≤ 10 h; the editor's runtime uses it). `est_duration` is the scene's length in eighths of a printed page ("3/8 pg", measured by `lib/scriptos/timing.ts`).
- **`scene_media` / `character_media`**: Links from scenes / `script_characters` to `media`. Composite foreign keys pin both ends to the same project.
- **Storage buckets**: `project-media` (private, project library). `sfx_library` (public read; audio ≤ 20 MB, uploads only into `<your user id>/…`). `assets`, `studio-assets`, `sfx-library` are legacy and take no uploads.
- **`shots`**: Shot list per scene (Studio › Scenes storyboard). The scene must belong to the shot's project (composite FK). Also created by "Shot" margin notes (`script_annotations.routed_id`). `frame_media_id` is the storyboard frame: a `media` row of the same project (composite FK, `ON DELETE SET NULL (frame_media_id)`). Camera fields (`shot_size`, `angle`, `movement`, `lens`) are length-bounded; their vocabulary is film grammar in `lib/studio/framing.ts`.
- **`script_annotations`**: Margin notes on script lines. Add them through `add_script_annotation()`: shot/beat/to-do notes create the shot, beat or task in the same transaction and record it in `routed_table`/`routed_id`.
- **`script_stash`**: The editor stash (snippets beside a script); access follows `can_access_script`.
- **`activity_feed`**: Project activity. Entries carry `metadata.project_id`; readable by the author and by people with access to that project only.
- **Credits** (no table — derived): `get_person_credits(p_user)` (SECURITY DEFINER) lists a person's credits from the work itself: projects they created (their profile craft), confirmed `project_crew` rows (craft) and `character_castings` (the part). A project shows to outsiders only when `visibility = 'public'`; teammates (`internal.can_access_project`) also see the team's others. `get_press_kit(p_token)` returns the share page's cast & crew (department order via `crafts.position`) and laurels (festival submissions with status `accepted`), for link/public projects only.
- **`writing_days`**: The writing loop — one row per writer per local day (words typed, sprints, the goal that day). Owner-only SELECT; no write policies: only `log_writing(p_day, p_words, p_sprint)` (SECURITY DEFINER, words 0–5000 per call, day within ±1 of the server's) adds to it. `profiles.daily_word_goal` (50–20000) / `sprint_minutes` (5–120), returned to their owner by `get_my_writing_prefs()`.
- **`set_log`**: On set (Studio › Production › On set). One row per event: the day's clock stamps (`call`/`rolling`/`lunch`/`back`/`wrap`) and `note`s belong to a call sheet (deleted with it); `continuity` belongs to a scene (optionally a shot, take 1–999, a `media` photo) and has no day, so it survives a day being deleted. Composite FKs pin every reference to the project (`shots_id_project_key` added for it). Team reads/inserts (as themselves); only `at`/`body`/`take` are updatable (column grant), by the author or the owner; same for delete. Realtime.
- **`campaigns`**: Promo campaigns (Studio › Promos), `internal.can_access_project`. `platform` is whatever the team names it (1–60 chars, no preset list — the picker suggests platforms used before); `status` is `drafting`/`live`/`wrapped`; `budget`/`spend` ≥ 0.
- **`post_cuts`, `post_notes`, `post_items`**: Post-production — cuts (link or library video, one source), timecoded notes pinned to their cut's project and optionally a scene (`ON DELETE SET NULL (scene_id)`), and optionally a line of that scene (`line_offset` from the heading + `line_text`, both or neither; the author's, like the text — `internal.post_notes_guard`), pipeline stages and deliverables. Team access via `can_access_project`; notes resolved in your own name, text editable by its author only (`internal.post_notes_guard`, which lets foreign-key actions through via `pg_trigger_depth()`).
- **`transcript_lines`**: Transcripts of library recordings — `(media_id, project_id)` → `media(id, project_id)` (cascade), `position` in the transcript, optional `start_ms`/`end_ms` (end needs a start and ≥ it), optional `speaker`, `text` 1–2000. `paper_order` marks a select in the project's paper edit; `set_paper_edit(project, ids[])` (invoker) rewrites it all or nothing (repeats, unknown or other projects' lines refused). Team access via `can_access_project` (insert as yourself); delete your own, or any as owner; a line can't move to another recording (`internal.transcript_lines_touch`). Realtime.
- **`call_sheets` & `call_sheet_calls`**: One sheet per project shoot day (date, calls, wrap, address, weather, notes); one call per person per sheet — a crew member or a character, never both. Calls carry `project_id` pinned to their sheet's.
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
3. **`internal.can_access_script(sid uuid)`**: Personal script → its author; project script → `can_access_project` of its project.
4. **`internal.can_access_project(pid uuid)`**: Owner, or crew *unless the project is private* — the same rule as the `projects` row policy. Use it for every project-scoped table. (`is_project_member` also answers false for private projects since `20260926030000`, so older `is_project_creator OR is_project_member` policies are equivalent.)

**NULL gotcha in PL/pgSQL checks:** `if not (a or b) then raise` does *not* raise when the expression is NULL (e.g. a null `receiver_id`). Write permission checks as `if (…) is not true then raise`.

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
- **Scripts** (`/s/<share_token>`): no policy reads a script for being shared. A link resolves only through `get_shared_script(token)` — the exact token while `shared` is on; title, words, format, updated, the author's public profile. The `scripts_share_guard` trigger lets only the owner (a project script: its shapers) change `shared` or `share_token`, and refuses tokens under 24 characters; a new token is a revoke (`20261006000000`; before it, anyone could list every shared script).
- **Portfolios:** every portfolio piece, its media and its pitch-board blocks are readable by everyone (`using true`) — a portfolio is public by design; there is no `is_public` column. `/p/<share_token>` is just its address.
- Private data (budgets, crew rosters, chats) must have **no** select policy granted to `anon`.
- **Project share links** (`/shared/<share_token>`) resolve only through `SECURITY DEFINER` RPCs that check the exact token and `visibility in ('link','public')`: `get_shared_project` (overview fields) and `get_shared_lookbook` (published media + the scene headings they're linked to — never notes or unpublished items).
- **Published files** are readable by anon only while `media.shared` and the project is link/public (storage policy `project-media: shared read`). `/m/<media_id>` is the stable permalink: it checks `get_published_media` and redirects to a fresh short-lived signed URL, uncached, so unpublishing takes effect at once.
- **Error log** (`client_errors`): written only through `report_client_error` (anon and authenticated — a crash on a public page counts), which trims every field, rate-limits (20/min per person, 60/min for everyone signed out) and keeps 30 days. No insert policy; admins read and clear (`internal.caller_is_admin()`).
- **Leaving** (`delete_my_account(username)`, SECURITY DEFINER, authenticated only): refused while the caller owns a project with confirmed crew (`transfer_project` hands it to a crew member first) or is the last admin; deletes their solo projects (cascade), their job posts (one on someone else's project passes to its owner) and sent DMs, then `auth.users` (profile and personal rows cascade). Links to them from other people's work are `ON DELETE SET NULL` (shown as "Deleted account") — never a blocking FK, never a cascade into someone else's project. Files go through the Storage API first (`account_deletion_plan` lists them; `storage.protect_delete` forbids SQL deletes). New FKs to `profiles` from shared content should be `ON DELETE SET NULL`.
- **Policy shape**: a table's reads are decided by one `SELECT` policy; writes get their own `INSERT` / `UPDATE` / `DELETE` policies — never a `FOR ALL` beside a `SELECT` (both would run on every read). Every foreign key has a covering index (`<table>_<fkey>_idx`). Run the Supabase advisors (security + performance) after schema changes.
- **Showcase** (`get_public_showcase`) lists published media of `public` projects only. **Platform totals** come from `get_platform_stats` (counts only) — counting through RLS shows each person their own numbers.


### D. The definer-function allowlist (reviewed 2026-10-03)

The security advisor warns about every `SECURITY DEFINER` function in
`public` that `anon` or `authenticated` can call (lints 0028/0029). These are
the app's intended RPC surface; each checks access itself, in its first
lines. **A new definer function in `public` is added here, with its gate, in
the PR that creates it** — anything the advisor lists that isn't here is
unreviewed. (`internal.*` helpers aren't callable through the API.)

Callable by **anyone** (anon + signed in) — public pages:

| Function | Gate |
|---|---|
| `get_shared_project(token)` / `get_shared_lookbook(token)` / `get_press_kit(token)` | exact `share_token` and `visibility in ('link','public')`; lookbook returns only `shared` media |
| `get_shared_script(token)` | exact `scripts.share_token`, non-empty, while `shared`; returns the words and the author's public profile only |
| `get_published_media(id)` | media `shared` on a `link`/`public` project |
| `get_public_showcase(limit)` | `shared` image/video media of `public`, non-sample projects; limit 1–100 |
| `get_recent_work(limit)` | portfolio pieces (already public), non-sample; limit 1–24 |
| `get_platform_stats()` | aggregate counts only, samples excluded |
| `get_person_credits(user)` | only projects that are `public` or that the caller can access (`internal.can_access_project`) |
| `report_client_error(…)` | validated kind, message ≤1000 chars, rate-limited (20/min signed in, 60/min signed out) |

Callable by **signed-in users**:

| Function | Gate |
|---|---|
| `get_my_account()`, `get_my_ui_prefs()`, `set_my_ui_prefs(patch)`, `get_my_writing_prefs()`, `log_writing(…)` | the caller's own row (`auth.uid()`); writes validated |
| `account_deletion_plan()`, `delete_my_account(username)` | the caller; deletion refused while they own a crewed project or are the last admin (§C) |
| `transfer_project(project, to)` | caller owns the project; recipient is confirmed crew |
| `admin_list_users()`, `admin_platform_analytics(since)`, `set_user_admin(user, admin)` | `internal.caller_is_admin()`; an admin can't remove their own rights |
| `can_manage_channel(id)`, `can_post_channel(id)` | answer for the caller only (booleans) |
| `edit_message`, `pin_message`, `toggle_message_reaction` | sender only / channel managers or either side of a DM / messages the caller can see |
| `lounge_unread()`, `mark_lounge_read(channel, partner)` | channels filtered by `internal.can_view_channel`; DMs the caller is in |
| `ack_call_sheet(sheet)`, `issue_call_sheet(sheet, note)` | `internal.can_access_project`; issuing also `can_shape_project` |
| `project_availability(project, from, to)` | `internal.can_shape_project`; dates only, never notes |
| `project_context(project)` | `internal.can_access_project`, else null |
| `respond_to_application(app, status, close)` | the job's poster |
| `has_discord_webhook(channel)` | `can_manage_channel` — false for anyone else (gated in `20261004010000`; before, it answered any signed-in user) |

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
   *Production schema drift* workflow — it must be green. From a session, MCP
   `apply_migration` (name: the file's part after the timestamp); if it times
   out, check production before retrying — a timed-out call may not have run.
   By hand: paste the file into the dashboard's SQL editor. Pasting from
   Windows stores function bodies with CRLF line endings; the fingerprint
   drops carriage returns, so that isn't drift.

**No Destructive Operations:** Never drop columns, alter tables, truncate data, or modify existing `SECURITY DEFINER` function parameters on production databases without explicit user consent and testing the rollback paths.
