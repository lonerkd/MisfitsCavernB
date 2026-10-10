# Inventory (generated)

> Built by `npm run bible` from the code — don't edit by hand. What each part is *for* is in the chapters (see [README](README.md)).

**35 pages · 6 API routes · 63 tables · 49 database functions · 49 e2e specs**

## Routes

| Route | Access | File (lines) | Built from | e2e |
|---|---|---|---|---|
| `/admin/analytics` | admin | `app/admin/analytics/page.tsx` (225) | 30 files · components: Toast · lib: hooks, os, push, scriptos, supabase, types, validation | accessibility |
| `/admin/audit-logs` | admin | `app/admin/audit-logs/page.tsx` (421) | 31 files · components: Toast, ui · lib: color, hooks, os, push, scriptos, supabase, types, validation | accessibility |
| `/admin/errors` | admin | `app/admin/errors/page.tsx` (132) | 31 files · components: Confirm, Toast · lib: hooks, os, push, scriptos, supabase, types, validation | errors |
| `/admin` | admin | `app/admin/page.tsx` (209) | 30 files · components: Toast · lib: hooks, os, push, scriptos, supabase, types, validation | accessibility |
| `/admin/users` | admin | `app/admin/users/page.tsx` (250) | 28 files · components: Toast · lib: os, push, scriptos, supabase, types, validation | accessibility |
| `/api/discord/notify` (api) | public | `app/api/discord/notify/route.ts` (101) | 3 files · components: — · lib: api-rate-limit, validation | **none** |
| `/api/discord/test` (api) | public | `app/api/discord/test/route.ts` (65) | 3 files · components: — · lib: api-rate-limit, validation | **none** |
| `/api/links` (api) | open (page checks) | `app/api/links/route.ts` (53) | 4 files · components: — · lib: api-rate-limit, integrations, studio | **none** |
| `/api/push/dispatch` (api) | open (page checks) | `app/api/push/dispatch/route.ts` (54) | 6 files · components: — · lib: legal, notifications, push, validation | push |
| `/api/references/search` (api) | open (page checks) | `app/api/references/search/route.ts` (61) | 3 files · components: — · lib: api-rate-limit, validation | **none** |
| `/auth/callback` | public | `app/auth/callback/page.tsx` (121) | 3 files · components: — · lib: supabase | **none** |
| `/auth` | public | `app/auth/page.tsx` (477) | 35 files · components: GrainOverlay, Toast, ui · lib: auth, hooks, os, password-strength, push, scriptos, supabase, types, validation | accessibility, account-deletion, auth-journey, auth-validation, availability, beat-to-script, breakdown, brief, call-sheets, community, credits, cut-notes, documents, editor-project-script, emphasis, errors, guides, hiring, install, island, layout, legal, locations, login-smoke, lounge, mobile, money, on-set, onboarding, onset-offline, password-recovery, phases, project-manager, readiness, real-data, route-smoke, script-share, search, shot-designer, split, studio-journey, table-read, themes, transcripts, writing-loop, your-data |
| `/auth/reset` | public | `app/auth/reset/page.tsx` (152) | 9 files · components: GrainOverlay, Toast, ui · lib: auth, password-strength, supabase | password-recovery |
| `/auth/spotify-callback` | public | `app/auth/spotify-callback/page.tsx` (77) | 32 files · components: Toast, ui · lib: hooks, os, push, scriptos, spotify, supabase, types, validation | **none** |
| `/call/[id]` | signed in | `app/call/[id]/page.tsx` (220) | 41 files · components: Toast · lib: brief, os, push, scriptos, studio, supabase, types, validation | call-sheets, push |
| `/crew/[id]` | signed in | `app/crew/[id]/page.tsx` (382) | 39 files · components: Avatar, EmptyState, Toast · lib: color, credits, hooks, os, push, scriptos, studio, supabase, types, validation | accessibility, credits |
| `/crew` | signed in | `app/crew/page.tsx` (286) | 42 files · components: Avatar, EmptyState, Toast, crafts · lib: color, crafts, crafts-core, hooks, notifications, os, push, scriptos, supabase, types, validation | accessibility, auth-journey, layout, mobile, route-smoke, your-data |
| `/editor` | signed in | `app/editor/page.tsx` (1611) | 131 files · components: Confirm, EmptyState, Toast, breakdown, editor, studio, ui · lib: breakdown, brief, color, context, formats, formats-core, guides, hooks, integrations, notifications, os, pocket, push, scriptos, split, spotify, storage, studio, supabase, themes, types, useEscapeKey, validation, writing | accessibility, auth-journey, beat-to-script, breakdown, cut-notes, editor-project-script, emphasis, layout, mobile, onboarding, phases, route-smoke, script-share, split, studio-journey, table-read, writing-loop |
| `/jobs/[id]` | signed in | `app/jobs/[id]/page.tsx` (553) | 36 files · components: Avatar, Toast, brand, ui · lib: color, hooks, notifications, os, push, scriptos, supabase, types, validation | accessibility, hiring |
| `/jobs` | signed in | `app/jobs/page.tsx` (841) | 45 files · components: Confirm, EmptyState, GrainOverlay, Toast, brand, crafts, ui · lib: color, context, crafts, crafts-core, hooks, notifications, os, push, scriptos, supabase, types, validation | accessibility, auth-journey, brief, hiring, layout, mobile, onboarding, route-smoke |
| `/lounge` | signed in | `app/lounge/page.tsx` (1511) | 55 files · components: Avatar, Confirm, GrainOverlay, Toast, brand, lounge, ui · lib: brief, color, context, hooks, lounge, notifications, os, push, scriptos, supabase, types, validation, webrtc | accessibility, auth-journey, brief, community, island, layout, lounge, mobile, route-smoke |
| `/m/[id]` (api) | open (page checks) | `app/m/[id]/route.ts` (28) | 3 files · components: — · lib: supabase | share-pages |
| `/p/[token]` | open (page checks) | `app/p/[token]/page.tsx` (54) | 38 files · components: Avatar, EmptyState, Toast · lib: color, hooks, os, push, scriptos, studio, supabase, types, validation | accessibility, share-pages, split |
| `/` | public | `app/page.tsx` (880) | 46 files · components: AnimatedSection, GrainOverlay, Navigation, NotificationBell, Toast, brand, ui · lib: brand, color, home, hooks, notifications, os, push, scriptos, supabase, types, validation | accessibility, account-deletion, home-page-crash, legal, real-data, route-smoke |
| `/portfolio/manage` | signed in | `app/portfolio/manage/page.tsx` (247) | 36 files · components: Confirm, EmptyState, Toast, ui · lib: formats, formats-core, os, push, scriptos, supabase, types, validation | accessibility |
| `/portfolio` | signed in | `app/portfolio/page.tsx` (512) | 36 files · components: AnimatedSection, GrainOverlay, SectionLabel, Toast, brand · lib: context, os, push, scriptos, studio, supabase, types, validation | accessibility, auth-journey, route-smoke |
| `/privacy` | open (page checks) | `app/privacy/page.tsx` (138) | 3 files · components: legal · lib: legal | legal |
| `/profile` | signed in | `app/profile/page.tsx` (379) | 41 files · components: Avatar, Confirm, Toast, availability, crafts · lib: availability, color, crafts, crafts-core, hooks, os, push, scriptos, supabase, types, validation | accessibility, auth-journey, availability, your-data |
| `/projects/[id]` | signed in | `app/projects/[id]/page.tsx` (1227) | 79 files · components: Confirm, GrainOverlay, Toast, brief, crafts, formats, guides, progress, ui · lib: breakdown, brief, color, context, crafts, crafts-core, formats, formats-core, guides, hooks, lounge, notifications, os, pocket, push, scriptos, studio, supabase, themes, types, validation, writing | accessibility, brief, guides, layout, mobile, phases, project-manager, table-read, themes |
| `/projects/[id]/pitch` | signed in | `app/projects/[id]/pitch/page.tsx` (620) | 36 files · components: Confirm, Toast · lib: color, notifications, os, push, scriptos, supabase, types, validation | accessibility, project-manager |
| `/projects` | signed in | `app/projects/page.tsx` (756) | 50 files · components: EmptyState, GrainOverlay, Toast, brand, formats, ui · lib: brief, color, context, formats, formats-core, lounge, onboarding, os, push, scriptos, supabase, types, useEscapeKey, validation | accessibility, auth-journey, island, layout, login-smoke, mobile, onboarding, route-smoke, search, themes |
| `/s/[token]` | open (page checks) | `app/s/[token]/page.tsx` (165) | 6 files · components: — · lib: scriptos, supabase | **none** |
| `/settings` | signed in | `app/settings/page.tsx` (344) | 46 files · components: Confirm, MotionPreference, ThemePicker, Toast, guides, settings, ui · lib: account, guides, island, notifications, os, password-strength, pocket, push, scriptos, supabase, themes, types, validation | accessibility, account-deletion, auth-journey, island, mobile, phases, route-smoke, themes, your-data |
| `/shared/[token]` | open (page checks) | `app/shared/[token]/page.tsx` (202) | 9 files · components: GrainOverlay · lib: credits, studio, supabase | accessibility, credits |
| `/showcase` | open (page checks) | `app/showcase/page.tsx` (174) | 8 files · components: AnimatedSection, GrainOverlay, ParticleBackground, PhotoGallery · lib: studio, supabase | accessibility, route-smoke |
| `/soundtrack` | signed in | `app/soundtrack/page.tsx` (462) | 35 files · components: Toast, ui · lib: context, os, push, scriptos, spotify, supabase, types, validation | accessibility, auth-journey |
| `/split` | signed in | `app/split/page.tsx` (232) | 4 files · components: — · lib: hooks, split | split |
| `/studio` | signed in | `app/studio/page.tsx` (231) | 146 files · components: Avatar, Confirm, EmptyState, GrainOverlay, SectionLabel, Toast, brand, breakdown, brief, formats, progress, studio, ui · lib: availability, breakdown, brief, color, context, formats, formats-core, guides, hooks, integrations, lounge, notifications, os, pocket, push, references, scriptos, split, studio, supabase, themes, types, useEscapeKey, validation, writing | accessibility, auth-journey, availability, beat-to-script, breakdown, call-sheets, cut-notes, documents, editor-project-script, hiring, layout, locations, mobile, money, on-set, onset-offline, phases, project-manager, readiness, real-data, route-smoke, search, shot-designer, split, studio-journey, transcripts |
| `/terms` | open (page checks) | `app/terms/page.tsx` (116) | 3 files · components: legal · lib: legal | legal |
| `/today` | signed in | `app/today/page.tsx` (260) | 46 files · components: Toast, mobile · lib: color, guides, hooks, notifications, os, pocket, push, pwa, scriptos, supabase, themes, today, types, validation | auth-journey, errors, install, island, layout, mobile |
| `/welcome` | signed in | `app/welcome/page.tsx` (236) | 56 files · components: Toast, brief, crafts, formats, guides, progress, ui · lib: brief, color, crafts, crafts-core, formats, formats-core, guides, hooks, lounge, onboarding, os, pocket, push, scriptos, supabase, themes, types, validation | accessibility, auth-journey, onboarding |

## What each route touches

### `/admin/analytics`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `admin_platform_analytics`, `get_my_account`, `get_platform_stats`
- **Realtime:** `project`, `projects:list`

### `/admin/audit-logs`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin/errors`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`, `get_platform_stats`
- **Realtime:** `project`, `projects:list`

### `/admin/users`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `admin_list_users`, `get_my_account`, `set_user_admin`
- **Realtime:** `project`, `projects:list`

### `/api/discord/notify`

- **Tables:** `channels`, `discord_integrations`, `profiles`

### `/api/discord/test`

- **Tables:** —

### `/api/links`

- **Tables:** —

### `/api/push/dispatch`

- **Tables:** `notifications`, `profiles`, `push_subscriptions`

### `/api/references/search`

- **Tables:** —

### `/auth/callback`

- **Tables:** `profiles`

### `/auth`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/auth/reset`

- **Tables:** —

### `/auth/spotify-callback`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `spotify_connections`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/call/[id]`

- **Tables:** `audit_logs`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channel_presets`, `character_castings`, `character_media`, `expenses`, `media`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_documents`, `project_formats`, `project_locations`, `projects`, `push_subscriptions`, `scene_media`, `scenes`, `script_annotations`, `scripts`, `set_log`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `get_my_account`, `get_shared_lookbook`, `issue_call_sheet`, `project_context`, `set_paper_edit`, `sync_script_scenes`
- **Realtime:** `live`, `project`, `projects:list`

### `/crew/[id]`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `media`, `notifications`, `portfolio_blocks`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`, `get_person_credits`
- **Realtime:** `lounge-presence`, `project`, `projects:list`

### `/crew`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `lounge-presence`, `project`, `projects:list`

### `/editor`

- **Tables:** `audit_logs`, `breakdown_categories`, `breakdown_dismissals`, `breakdown_elements`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channel_presets`, `character_castings`, `character_media`, `expenses`, `media`, `notifications`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_audio_references`, `project_beats`, `project_brief`, `project_crew`, `project_documents`, `project_formats`, `project_locations`, `projects`, `push_subscriptions`, `scene_elements`, `scene_media`, `scenes`, `script_annotations`, `script_characters`, `script_metadata`, `script_revisions`, `script_stash`, `scripts`, `set_log`, `sfx_assets`, `shots`, `spotify_connections`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`, `writing_days`
- **Functions:** `ack_call_sheet`, `add_script_annotation`, `breakdown_memory`, `get_my_account`, `get_my_ui_prefs`, `get_my_writing_prefs`, `get_shared_lookbook`, `issue_call_sheet`, `log_writing`, `project_context`, `project_progress`, `projects_progress`, `set_my_ui_prefs`, `set_paper_edit`, `sync_script_scenes`, `tag_scene_element`
- **Storage:** `sfx_library`
- **Realtime:** `live`, `presence:project`, `project`, `projects:list`, `script`

### `/jobs/[id]`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `job_applications`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`, `respond_to_application`
- **Realtime:** `project`, `projects:list`

### `/jobs`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `job_applications`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`, `respond_to_application`
- **Realtime:** `project`, `projects:list`

### `/lounge`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `discord_integrations`, `jobs`, `media`, `messages`, `notifications`, `portfolio_projects`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `script_annotations`, `scripts`, `timeline_items`
- **Functions:** `can_manage_channel`, `can_post_channel`, `edit_message`, `get_my_account`, `has_discord_webhook`, `lounge_unread`, `mark_lounge_read`, `pin_message`, `project_context`, `search_lounge`, `toggle_message_reaction`
- **Realtime:** `chan`, `dm`, `lounge-presence`, `lounge-unread`, `project`, `projects:list`, `thread`, `typing`, `voice`

### `/m/[id]`

- **Tables:** —
- **Functions:** `get_published_media`
- **Storage:** `project-media`

### `/p/[token]`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `media`, `notifications`, `portfolio_blocks`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `job_applications`, `jobs`, `media`, `messages`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `script_characters`, `scripts`, `timeline_items`
- **Functions:** `edit_message`, `get_my_account`, `get_platform_stats`, `get_recent_work`, `lounge_unread`, `mark_lounge_read`, `pin_message`, `respond_to_application`, `search_lounge`, `toggle_message_reaction`
- **Realtime:** `chan`, `notif`, `project`, `projects:list`

### `/portfolio/manage`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `media`, `portfolio_blocks`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `project_formats`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/portfolio`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `media`, `portfolio_blocks`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/privacy`

- **Tables:** —

### `/profile`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`, `unavailability`
- **Functions:** `get_my_account`, `project_availability`
- **Realtime:** `project`, `projects:list`

### `/projects/[id]`

- **Tables:** `audit_logs`, `breakdown_categories`, `breakdown_dismissals`, `breakdown_elements`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `character_castings`, `character_media`, `crafts`, `discord_integrations`, `expenses`, `guide_progress`, `job_applications`, `jobs`, `media`, `notifications`, `portfolio_projects`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_documents`, `project_formats`, `project_locations`, `project_tasks`, `projects`, `push_subscriptions`, `scene_elements`, `scene_media`, `scenes`, `script_annotations`, `scripts`, `set_log`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `breakdown_memory`, `can_manage_channel`, `can_post_channel`, `get_my_account`, `get_my_ui_prefs`, `get_shared_lookbook`, `has_discord_webhook`, `issue_call_sheet`, `project_context`, `project_progress`, `projects_progress`, `respond_to_application`, `set_my_ui_prefs`, `set_paper_edit`, `sync_script_scenes`, `tag_scene_element`
- **Realtime:** `live`, `lounge-presence`, `project`, `projects:list`

### `/projects/[id]/pitch`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `media`, `notifications`, `portfolio_blocks`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `script_annotations`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/projects`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `discord_integrations`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `can_manage_channel`, `can_post_channel`, `get_my_account`, `has_discord_webhook`, `project_context`, `project_progress`, `projects_progress`
- **Realtime:** `project`, `projects:list`

### `/s/[token]`

- **Tables:** —
- **Functions:** `get_shared_script`

### `/settings`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`
- **Functions:** `account_deletion_plan`, `delete_my_account`, `get_my_account`, `get_my_ui_prefs`, `set_my_ui_prefs`, `transfer_project`
- **Storage:** `sfx_library`
- **Realtime:** `project`, `projects:list`

### `/shared/[token]`

- **Tables:** `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `character_castings`, `character_media`, `expenses`, `media`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_crew`, `project_documents`, `project_locations`, `projects`, `scene_media`, `scenes`, `script_annotations`, `set_log`, `shots`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `get_press_kit`, `get_shared_lookbook`, `get_shared_project`, `issue_call_sheet`, `set_paper_edit`, `sync_script_scenes`

### `/showcase`

- **Tables:** —
- **Functions:** `get_public_showcase`

### `/soundtrack`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_audio_references`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `sfx_assets`, `spotify_connections`, `timeline_items`
- **Functions:** `get_my_account`
- **Storage:** `sfx_library`
- **Realtime:** `project`, `projects:list`

### `/split`

- **Tables:** —

### `/studio`

- **Tables:** `activity_feed`, `audit_logs`, `breakdown_categories`, `breakdown_dismissals`, `breakdown_elements`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `character_castings`, `character_media`, `discord_integrations`, `expenses`, `jobs`, `media`, `notifications`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_documents`, `project_formats`, `project_locations`, `project_tasks`, `projects`, `push_subscriptions`, `scene_elements`, `scene_media`, `scenes`, `script_annotations`, `script_characters`, `scripts`, `set_log`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `unavailability`, `vendors`
- **Functions:** `ack_call_sheet`, `append_to_script`, `breakdown_memory`, `can_manage_channel`, `can_post_channel`, `get_my_account`, `get_my_ui_prefs`, `get_shared_lookbook`, `has_discord_webhook`, `issue_call_sheet`, `project_availability`, `project_context`, `project_progress`, `projects_progress`, `set_my_ui_prefs`, `set_paper_edit`, `sync_script_scenes`, `tag_scene_element`
- **Realtime:** `activity`, `live`, `lounge-presence`, `project`, `projects:list`, `script`

### `/terms`

- **Tables:** —

### `/today`

- **Tables:** `audit_logs`, `budget_items`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channels`, `media`, `messages`, `notifications`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `script_annotations`, `script_characters`, `scripts`, `timeline_items`
- **Functions:** `edit_message`, `get_my_account`, `get_my_ui_prefs`, `lounge_unread`, `mark_lounge_read`, `pin_message`, `search_lounge`, `set_my_ui_prefs`, `toggle_message_reaction`
- **Realtime:** `chan`, `project`, `projects:list`

### `/welcome`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `crafts`, `discord_integrations`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `can_manage_channel`, `can_post_channel`, `get_my_account`, `get_my_ui_prefs`, `has_discord_webhook`, `project_context`, `project_progress`, `projects_progress`, `set_my_ui_prefs`
- **Realtime:** `project`, `projects:list`

## Tables → routes

| Table | Used by |
|---|---|
| `activity_feed` | `/crew/[id]`, `/crew`, `/jobs`, `/lounge`, `/p/[token]`, `/profile`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/studio`, `/welcome` |
| `audit_logs` | `/admin/analytics`, `/admin/audit-logs`, `/admin/errors`, `/admin`, `/admin/users`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `breakdown_categories` | `/editor`, `/projects/[id]`, `/studio` |
| `breakdown_dismissals` | `/editor`, `/projects/[id]`, `/studio` |
| `breakdown_elements` | `/editor`, `/projects/[id]`, `/studio` |
| `brief_questions` | `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `budget_items` | `/admin/analytics`, `/admin/audit-logs`, `/admin/errors`, `/admin`, `/admin/users`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/shared/[token]`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `call_sheet_acks` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `call_sheet_calls` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio`, `/today` |
| `call_sheets` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio`, `/today` |
| `campaigns` | `/admin/analytics`, `/admin/audit-logs`, `/admin/errors`, `/admin`, `/admin/users`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `channel_members` | `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `channel_presets` | `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `channels` | `/api/discord/notify`, `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/today`, `/welcome` |
| `character_castings` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `character_media` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `client_errors` | **no route** (server-side, triggers or functions only) |
| `crafts` | `/crew`, `/jobs`, `/profile`, `/projects/[id]`, `/welcome` |
| `discord_integrations` | `/api/discord/notify`, `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `expenses` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `guide_progress` | `/projects/[id]` |
| `job_applications` | `/jobs/[id]`, `/jobs`, `/`, `/projects/[id]` |
| `jobs` | `/crew/[id]`, `/crew`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/profile`, `/projects/[id]`, `/settings`, `/studio`, `/welcome` |
| `lounge_reads` | **no route** (server-side, triggers or functions only) |
| `media` | `/call/[id]`, `/crew/[id]`, `/editor`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/projects/[id]`, `/projects/[id]/pitch`, `/shared/[token]`, `/studio`, `/today` |
| `messages` | `/lounge`, `/`, `/today` |
| `notifications` | `/api/push/dispatch`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/settings`, `/studio`, `/today`, `/welcome` |
| `portfolio_blocks` | `/crew/[id]`, `/p/[token]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]/pitch` |
| `portfolio_media` | `/crew/[id]`, `/p/[token]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]/pitch` |
| `portfolio_projects` | `/crew/[id]`, `/lounge`, `/p/[token]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]`, `/projects/[id]/pitch`, `/today` |
| `post_cuts` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `post_items` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `post_notes` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `profiles` | `/admin/analytics`, `/admin/audit-logs`, `/admin/errors`, `/admin`, `/admin/users`, `/api/discord/notify`, `/api/push/dispatch`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/shared/[token]`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `project_audio_references` | `/editor`, `/soundtrack` |
| `project_beats` | `/admin/analytics`, `/admin/audit-logs`, `/admin/errors`, `/admin`, `/admin/users`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `project_brief` | `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `project_crew` | `/admin/analytics`, `/admin/audit-logs`, `/admin/errors`, `/admin`, `/admin/users`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/shared/[token]`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `project_documents` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `project_formats` | `/call/[id]`, `/editor`, `/lounge`, `/portfolio/manage`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `project_locations` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `project_tasks` | `/lounge`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/studio`, `/today`, `/welcome` |
| `projects` | `/admin/analytics`, `/admin/audit-logs`, `/admin/errors`, `/admin`, `/admin/users`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/shared/[token]`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `push_subscriptions` | `/admin/analytics`, `/admin/audit-logs`, `/admin/errors`, `/admin`, `/admin/users`, `/api/push/dispatch`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `scene_elements` | `/editor`, `/projects/[id]`, `/studio` |
| `scene_media` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `scenes` | `/call/[id]`, `/crew/[id]`, `/editor`, `/lounge`, `/p/[token]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/shared/[token]`, `/studio`, `/today`, `/welcome` |
| `script_annotations` | `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects/[id]/pitch`, `/shared/[token]`, `/studio`, `/today` |
| `script_characters` | `/editor`, `/`, `/studio`, `/today` |
| `script_metadata` | `/editor` |
| `script_revisions` | `/editor` |
| `script_stash` | `/editor` |
| `scripts` | `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `set_log` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `sfx_assets` | `/editor`, `/soundtrack` |
| `shots` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `spotify_connections` | `/auth/spotify-callback`, `/editor`, `/soundtrack` |
| `timeline_items` | `/admin/analytics`, `/admin/audit-logs`, `/admin/errors`, `/admin`, `/admin/users`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/p/[token]`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `timesheets` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `transcript_lines` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `unavailability` | `/profile`, `/studio` |
| `vendors` | `/call/[id]`, `/editor`, `/projects/[id]`, `/shared/[token]`, `/studio` |
| `writing_days` | `/editor` |

## Database functions

| Function | Use |
|---|---|
| `account_deletion_plan` | called from a route |
| `ack_call_sheet` | called from a route |
| `add_script_annotation` | called from a route |
| `admin_list_users` | called from a route |
| `admin_platform_analytics` | called from a route |
| `append_to_script` | called from a route |
| `breakdown_memory` | called from a route |
| `can_manage_channel` | called from a route |
| `can_post_channel` | called from a route |
| `delete_my_account` | called from a route |
| `edit_message` | called from a route |
| `get_my_account` | called from a route |
| `get_my_ui_prefs` | called from a route |
| `get_my_writing_prefs` | called from a route |
| `get_person_credits` | called from a route |
| `get_platform_stats` | called from a route |
| `get_press_kit` | called from a route |
| `get_public_showcase` | called from a route |
| `get_published_media` | called from a route |
| `get_recent_work` | called from a route |
| `get_shared_lookbook` | called from a route |
| `get_shared_project` | called from a route |
| `get_shared_script` | called from a route |
| `handle_new_user` | internal (policies, triggers, other functions) |
| `has_discord_webhook` | called from a route |
| `issue_call_sheet` | called from a route |
| `log_writing` | called from a route |
| `lounge_unread` | called from a route |
| `mark_lounge_read` | called from a route |
| `pin_message` | called from a route |
| `project_availability` | called from a route |
| `project_context` | called from a route |
| `project_progress` | called from a route |
| `projects_progress` | called from a route |
| `report_client_error` | called (outside a route graph) |
| `respond_to_application` | called from a route |
| `rls_auto_enable` | internal (policies, triggers, other functions) |
| `search_lounge` | called from a route |
| `search_suite` | called (outside a route graph) |
| `send_call_sheet_reminders` | internal (policies, triggers, other functions) |
| `set_my_ui_prefs` | called from a route |
| `set_paper_edit` | called from a route |
| `set_user_admin` | called from a route |
| `sync_script_scenes` | called from a route |
| `tag_scene_element` | called from a route |
| `toggle_message_reaction` | called from a route |
| `transfer_project` | called from a route |
| `update_updated_at` | internal (policies, triggers, other functions) |
| `update_updated_at_column` | internal (policies, triggers, other functions) |

## e2e specs → routes

| Spec | Opens |
|---|---|
| `accessibility.spec.ts` | `/`, `/admin`, `/admin/analytics`, `/admin/audit-logs`, `/admin/users`, `/auth`, `/crew`, `/crew/*`, `/does-not-exist`, `/editor`, `/jobs`, `/jobs/*`, `/lounge`, `/p/*`, `/portfolio`, `/portfolio/manage`, `/profile`, `/projects`, `/projects/*`, `/projects/*/pitch`, `/settings`, `/shared/*`, `/showcase`, `/soundtrack`, `/studio`, `/welcome` |
| `account-deletion.spec.ts` | `/`, `/auth`, `/settings` |
| `auth-journey.spec.ts` | `/auth`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/portfolio`, `/profile`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `auth-validation.spec.ts` | `/auth` |
| `availability.spec.ts` | `/auth`, `/profile`, `/studio` |
| `beat-to-script.spec.ts` | `/auth`, `/editor`, `/rest/v1/scripts`, `/studio` |
| `breakdown.spec.ts` | `/auth`, `/editor`, `/studio` |
| `brief.spec.ts` | `/auth`, `/jobs`, `/lounge`, `/projects/*` |
| `call-sheets.spec.ts` | `/auth`, `/call/*`, `/studio` |
| `community.spec.ts` | `/auth`, `/lounge` |
| `credits.spec.ts` | `/auth`, `/crew/*`, `/shared/*` |
| `cut-notes.spec.ts` | `/auth`, `/editor`, `/studio` |
| `documents.spec.ts` | `/auth`, `/studio` |
| `editor-project-script.spec.ts` | `/auth`, `/editor`, `/rest/v1/scripts`, `/studio` |
| `emphasis.spec.ts` | `/auth`, `/editor` |
| `errors.spec.ts` | `/admin/errors`, `/auth`, `/today` |
| `guides.spec.ts` | `/auth`, `/projects/*` |
| `hiring.spec.ts` | `/auth`, `/jobs`, `/jobs/*`, `/studio` |
| `home-page-crash.spec.ts` | `/` |
| `install.spec.ts` | `/auth`, `/today` |
| `island.spec.ts` | `/auth`, `/lounge`, `/projects`, `/settings`, `/today` |
| `layout.spec.ts` | `/auth`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/projects`, `/projects/*`, `/studio`, `/today` |
| `legal.spec.ts` | `/`, `/auth`, `/privacy`, `/terms` |
| `locations.spec.ts` | `/auth`, `/studio` |
| `login-smoke.spec.ts` | `/auth`, `/projects` |
| `lounge.spec.ts` | `/auth`, `/lounge` |
| `mobile.spec.ts` | `/auth`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/projects`, `/projects/*`, `/settings`, `/studio`, `/today` |
| `money.spec.ts` | `/auth`, `/studio` |
| `on-set.spec.ts` | `/auth`, `/studio` |
| `onboarding.spec.ts` | `/auth`, `/editor`, `/jobs`, `/projects`, `/welcome` |
| `onset-offline.spec.ts` | `/auth`, `/studio` |
| `password-recovery.spec.ts` | `/auth`, `/auth/reset` |
| `phases.spec.ts` | `/auth`, `/editor`, `/projects/*`, `/settings`, `/studio` |
| `project-manager.spec.ts` | `/auth`, `/projects/*`, `/projects/*/pitch`, `/studio` |
| `push.spec.ts` | `/api/push/dispatch`, `/call/abc` |
| `readiness.spec.ts` | `/auth`, `/studio` |
| `real-data.spec.ts` | `/`, `/auth`, `/studio` |
| `route-smoke.spec.ts` | `/`, `/auth`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/portfolio`, `/projects`, `/settings`, `/showcase`, `/studio`, `/this-path-does-not-exist` |
| `script-share.spec.ts` | `/auth`, `/editor` |
| `search.spec.ts` | `/auth`, `/editor\\`, `/projects`, `/studio` |
| `share-pages.spec.ts` | `/m/*`, `/m/not-a-uuid`, `/p/*`, `/p/not-a-real-token` |
| `shot-designer.spec.ts` | `/auth`, `/studio` |
| `split.spec.ts` | `/auth`, `/editor`, `/p/not-a-token`, `/split`, `/studio` |
| `studio-journey.spec.ts` | `/auth`, `/editor`, `/studio` |
| `table-read.spec.ts` | `/auth`, `/editor`, `/projects/*` |
| `themes.spec.ts` | `/auth`, `/projects`, `/projects/*`, `/settings` |
| `transcripts.spec.ts` | `/auth`, `/studio` |
| `writing-loop.spec.ts` | `/auth`, `/editor` |
| `your-data.spec.ts` | `/auth`, `/crew`, `/profile`, `/settings` |
