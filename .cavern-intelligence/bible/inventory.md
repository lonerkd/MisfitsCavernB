# Inventory (generated)

> Built by `npm run bible` from the code — don't edit by hand. What each part is *for* is in the chapters (see [README](README.md)).

**47 pages · 6 API routes · 81 tables · 60 database functions · 69 e2e specs**

## Routes

| Route | Access | File (lines) | Built from | e2e |
|---|---|---|---|---|
| `/p/[token]` | open (page checks) | `app/(public)/p/[token]/page.tsx` (48) | 37 files · components: ui · lib: auth, formats, hooks, os, push, studio, supabase, types, util, validation | accessibility, share-pages, split |
| `/privacy` | open (page checks) | `app/(public)/privacy/page.tsx` (138) | 3 files · components: legal · lib: legal | legal |
| `/review/[token]` | open (page checks) | `app/(public)/review/[token]/page.tsx` (40) | 6 files · components: — · lib: review, supabase | **none** |
| `/s/[token]` | open (page checks) | `app/(public)/s/[token]/page.tsx` (173) | 9 files · components: — · lib: formats, scriptos, supabase | **none** |
| `/shared/[token]` | open (page checks) | `app/(public)/shared/[token]/page.tsx` (202) | 11 files · components: ui · lib: credits, film, scriptos, studio, supabase | accessibility, credits, keyboard-audit |
| `/terms` | open (page checks) | `app/(public)/terms/page.tsx` (116) | 3 files · components: legal · lib: legal | legal |
| `/admin/analytics` | admin | `app/(suite)/admin/analytics/page.tsx` (243) | 30 files · components: ui · lib: auth, formats, hooks, os, push, supabase, types, validation | accessibility |
| `/admin/audit-logs` | admin | `app/(suite)/admin/audit-logs/page.tsx` (434) | 32 files · components: ui · lib: audit, auth, formats, hooks, os, push, supabase, types, util, validation | accessibility, suspend-user |
| `/admin/brief-questions` | admin | `app/(suite)/admin/brief-questions/page.tsx` (127) | 40 files · components: ui · lib: auth, brief, formats, hooks, os, push, scriptos, supabase, types, validation | **none** |
| `/admin/channel-presets` | admin | `app/(suite)/admin/channel-presets/page.tsx` (110) | 32 files · components: ui · lib: auth, formats, hooks, lounge, os, push, supabase, types, validation | accessibility, admin-channel-presets |
| `/admin/crafts` | admin | `app/(suite)/admin/crafts/page.tsx` (103) | 34 files · components: ui · lib: auth, crafts, formats, hooks, os, push, supabase, types, validation | accessibility, admin-crafts |
| `/admin/errors` | admin | `app/(suite)/admin/errors/page.tsx` (132) | 30 files · components: ui · lib: auth, formats, hooks, os, push, supabase, types, validation | errors |
| `/admin/formats` | admin | `app/(suite)/admin/formats/page.tsx` (118) | 35 files · components: formats, ui · lib: auth, formats, hooks, os, push, supabase, types, validation | accessibility, admin-formats |
| `/admin/hub` | admin | `app/(suite)/admin/hub/page.tsx` (185) | 39 files · components: Flag, hub, ui · lib: auth, flags, formats, hooks, hub, os, push, supabase, types, validation | **none** |
| `/admin` | admin | `app/(suite)/admin/page.tsx` (300) | 33 files · components: Flag, ui · lib: auth, flags, formats, hooks, os, push, supabase, types, validation | accessibility, keyboard-audit |
| `/admin/reports` | admin | `app/(suite)/admin/reports/page.tsx` (126) | 31 files · components: ui · lib: auth, formats, hooks, os, push, supabase, types, validation | accessibility, hide-message, reports |
| `/admin/support` | admin | `app/(suite)/admin/support/page.tsx` (93) | 31 files · components: hub, ui · lib: auth, formats, hooks, hub, os, push, supabase, types, validation | **none** |
| `/admin/users` | admin | `app/(suite)/admin/users/page.tsx` (275) | 28 files · components: ui · lib: auth, formats, os, push, supabase, types, validation | accessibility, suspend-user |
| `/auth/callback` | public | `app/(suite)/auth/callback/page.tsx` (74) | 29 files · components: ui · lib: auth, formats, os, push, supabase, types, validation | **none** |
| `/auth` | public | `app/(suite)/auth/page.tsx` (484) | 39 files · components: Flag, ui · lib: account, auth, flags, formats, hooks, logging, os, push, supabase, types, validation | accessibility, account-deletion, admin-channel-presets, admin-crafts, admin-formats, announcements, auth-journey, auth-validation, availability, beat-to-script, breakdown, brief, call-sheets, community, continuity, credits, cut-notes, daylight, documents, editor-find-cast, editor-gutter, editor-keyboard-reorder, editor-project-script, editor-safety-net, editor-undo, emphasis, errors, guides, hide-message, hiring, install, island, keyboard-audit, layout, legal, locations, login-smoke, lounge, mobile, money, on-set, onboarding, onset-offline, password-recovery, phases, project-manager, projects-keyboard-phase, readiness, reading-corrections, real-data, reports, route-smoke, script-share, search, shot-designer, split, spotify-connect, studio-journey, suspend-user, table-read, themes, today-owner, transcripts, view-as, writing-loop, your-data |
| `/auth/reset` | public | `app/(suite)/auth/reset/page.tsx` (154) | 10 files · components: ui · lib: account, auth, logging, supabase | password-recovery |
| `/auth/spotify-callback` | public | `app/(suite)/auth/spotify-callback/page.tsx` (77) | 33 files · components: ui · lib: auth, errors, formats, hooks, os, push, spotify, supabase, types, validation | **none** |
| `/call/[id]` | signed in | `app/(suite)/call/[id]/page.tsx` (226) | 50 files · components: projects, ui · lib: auth, brief, film, formats, os, push, scriptos, studio, supabase, types, validation | call-sheets, push |
| `/crew/[id]` | signed in | `app/(suite)/crew/[id]/page.tsx` (364) | 41 files · components: ui · lib: auth, credits, formats, hooks, os, push, studio, supabase, types, util, validation | accessibility, credits, suspend-user |
| `/crew` | signed in | `app/(suite)/crew/page.tsx` (277) | 41 files · components: crafts, ui · lib: auth, crafts, formats, hooks, notifications, os, push, supabase, types, util, validation | accessibility, auth-journey, keyboard-audit, layout, mobile, route-smoke, your-data |
| `/editor` | signed in | `app/(suite)/editor/page.tsx` (1193) | 164 files · components: breakdown, editor, studio, ui · lib: auth, breakdown, brief, errors, film, formats, guides, hooks, integrations, notifications, os, pocket, push, scriptos, split, spotify, storage, studio, supabase, themes, types, util, validation, writing | accessibility, auth-journey, beat-to-script, breakdown, cut-notes, editor-find-cast, editor-gutter, editor-keyboard-reorder, editor-project-script, editor-safety-net, editor-undo, emphasis, keyboard-audit, layout, mobile, onboarding, phases, reading-corrections, route-smoke, script-share, split, studio-journey, table-read, writing-loop |
| `/hub/[id]` | signed in | `app/(suite)/hub/[id]/page.tsx` (68) | 37 files · components: hub, ui · lib: auth, formats, hooks, hub, os, push, supabase, types, validation | **none** |
| `/hub/help/[id]` | signed in | `app/(suite)/hub/help/[id]/page.tsx` (44) | 31 files · components: hub, ui · lib: auth, formats, hooks, hub, os, push, supabase, types, validation | **none** |
| `/hub/help` | signed in | `app/(suite)/hub/help/page.tsx` (86) | 30 files · components: ui · lib: auth, formats, hooks, hub, os, push, supabase, types, validation | **none** |
| `/hub` | signed in | `app/(suite)/hub/page.tsx` (108) | 35 files · components: Flag, ui · lib: auth, flags, formats, hooks, hub, os, push, supabase, types, validation | auth-journey |
| `/jobs/[id]` | signed in | `app/(suite)/jobs/[id]/page.tsx` (552) | 34 files · components: ui · lib: auth, formats, hooks, notifications, os, push, supabase, types, util, validation | accessibility, hiring, keyboard-audit, reports |
| `/jobs` | signed in | `app/(suite)/jobs/page.tsx` (440) | 49 files · components: crafts, jobs, ui · lib: auth, crafts, formats, hooks, notifications, os, push, supabase, types, util, validation | accessibility, auth-journey, brief, hiring, keyboard-audit, layout, mobile, onboarding, reports, route-smoke |
| `/lounge` | signed in | `app/(suite)/lounge/page.tsx` (110) | 76 files · components: lounge, projects, ui · lib: auth, brief, formats, hooks, lounge, notifications, os, push, scriptos, supabase, types, util, validation, webrtc | accessibility, announcements, auth-journey, brief, community, hide-message, island, keyboard-audit, layout, lounge, mobile, route-smoke |
| `/m/[id]` (api) | open (page checks) | `app/(suite)/m/[id]/route.ts` (28) | 3 files · components: — · lib: supabase | share-pages |
| `/` | public | `app/(suite)/page.tsx` (470) | 51 files · components: brand, landing, shell, ui · lib: auth, brand, community, formats, home, hooks, notifications, os, push, supabase, types, util, validation | accessibility, account-deletion, home-page-crash, keyboard-audit, legal, real-data, route-smoke |
| `/portfolio/manage` | signed in | `app/(suite)/portfolio/manage/page.tsx` (239) | 35 files · components: ui · lib: auth, formats, os, push, supabase, types, validation | accessibility |
| `/portfolio` | signed in | `app/(suite)/portfolio/page.tsx` (486) | 34 files · components: ui · lib: auth, formats, os, push, studio, supabase, types, validation | accessibility, auth-journey, keyboard-audit, route-smoke |
| `/profile` | signed in | `app/(suite)/profile/page.tsx` (370) | 40 files · components: availability, crafts, ui · lib: auth, availability, crafts, formats, hooks, os, push, supabase, types, util, validation | accessibility, auth-journey, availability, keyboard-audit, your-data |
| `/projects/[id]` | signed in | `app/(suite)/projects/[id]/page.tsx` (407) | 103 files · components: Flag, brief, crafts, film, formats, guides, progress, projects, studio, ui · lib: auth, breakdown, brief, crafts, film, flags, formats, guides, hooks, lounge, notifications, os, pocket, push, review, scriptos, studio, supabase, themes, types, util, validation, writing | accessibility, announcements, brief, guides, keyboard-audit, layout, mobile, phases, project-manager, table-read, themes, view-as |
| `/projects/[id]/pitch` | signed in | `app/(suite)/projects/[id]/pitch/page.tsx` (611) | 39 files · components: ui · lib: auth, formats, notifications, os, push, scriptos, supabase, types, util, validation | accessibility, project-manager |
| `/projects` | signed in | `app/(suite)/projects/page.tsx` (668) | 55 files · components: brand, formats, ui · lib: auth, brief, formats, hooks, lounge, onboarding, os, push, scriptos, supabase, types, util, validation | accessibility, auth-journey, island, keyboard-audit, layout, login-smoke, mobile, onboarding, projects-keyboard-phase, route-smoke, search, themes |
| `/settings` | signed in | `app/(suite)/settings/page.tsx` (337) | 46 files · components: guides, settings, ui · lib: account, auth, formats, guides, island, notifications, os, pocket, push, supabase, themes, types, validation | accessibility, account-deletion, auth-journey, island, keyboard-audit, mobile, phases, route-smoke, themes, your-data |
| `/showcase` | open (page checks) | `app/(suite)/showcase/page.tsx` (174) | 8 files · components: ui · lib: studio, supabase | accessibility, keyboard-audit, route-smoke |
| `/soundtrack` | signed in | `app/(suite)/soundtrack/page.tsx` (462) | 41 files · components: ui · lib: auth, errors, formats, os, push, scriptos, spotify, supabase, types, validation | accessibility, auth-journey, keyboard-audit, spotify-connect |
| `/split` | signed in | `app/(suite)/split/page.tsx` (232) | 4 files · components: — · lib: hooks, split | split |
| `/studio` | signed in | `app/(suite)/studio/page.tsx` (229) | 182 files · components: Flag, breakdown, brief, film, formats, progress, projects, studio, ui · lib: auth, availability, breakdown, brief, film, flags, formats, guides, hooks, hub, integrations, lounge, notifications, os, pocket, push, references, review, scriptos, split, studio, supabase, themes, types, util, validation, writing | accessibility, auth-journey, availability, beat-to-script, breakdown, call-sheets, continuity, cut-notes, daylight, documents, editor-find-cast, editor-gutter, editor-keyboard-reorder, editor-project-script, editor-safety-net, editor-undo, hiring, keyboard-audit, layout, locations, mobile, money, on-set, onset-offline, phases, project-manager, readiness, reading-corrections, real-data, route-smoke, search, shot-designer, split, studio-journey, transcripts |
| `/today` | signed in | `app/(suite)/today/page.tsx` (285) | 47 files · components: mobile, ui · lib: auth, film, formats, guides, hooks, notifications, os, pocket, push, pwa, supabase, themes, today, types, util, validation | auth-journey, errors, install, island, layout, mobile, today-owner |
| `/welcome` | signed in | `app/(suite)/welcome/page.tsx` (250) | 62 files · components: brief, crafts, formats, guides, progress, ui · lib: auth, brief, crafts, formats, guides, hooks, lounge, onboarding, os, pocket, push, scriptos, supabase, themes, types, util, validation | accessibility, auth-journey, keyboard-audit, onboarding |
| `/api/discord/notify` (api) | public | `app/api/discord/notify/route.ts` (91) | 5 files · components: — · lib: supabase, util, validation | **none** |
| `/api/discord/test` (api) | public | `app/api/discord/test/route.ts` (65) | 3 files · components: — · lib: util, validation | **none** |
| `/api/links` (api) | open (page checks) | `app/api/links/route.ts` (53) | 4 files · components: — · lib: integrations, studio, util | **none** |
| `/api/push/dispatch` (api) | open (page checks) | `app/api/push/dispatch/route.ts` (53) | 5 files · components: — · lib: notifications, push, validation | push |
| `/api/references/search` (api) | open (page checks) | `app/api/references/search/route.ts` (61) | 3 files · components: — · lib: util, validation | **none** |

## What each route touches

### `/p/[token]`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `media`, `notifications`, `portfolio_blocks`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/privacy`

- **Tables:** —

### `/review/[token]`

- **Tables:** `item_versions`, `portfolio_projects`, `review_comments`, `review_links`
- **Functions:** `add_review_comment`, `decide_review`, `get_review`

### `/s/[token]`

- **Tables:** `portfolio_projects`
- **Functions:** `get_shared_script`

### `/shared/[token]`

- **Tables:** `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `character_castings`, `character_media`, `characters`, `expenses`, `media`, `portfolio_projects`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_crew`, `project_documents`, `project_locations`, `projects`, `reading_corrections`, `scene_characters`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `set_log`, `shoot_days`, `shots`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `get_press_kit`, `get_shared_lookbook`, `get_shared_project`, `issue_call_sheet`, `set_paper_edit`, `sync_script_scenes`

### `/terms`

- **Tables:** —

### `/admin/analytics`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `admin_platform_analytics`, `get_my_account`, `get_platform_stats`
- **Realtime:** `project`, `projects:list`

### `/admin/audit-logs`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin/brief-questions`

- **Tables:** `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_presets`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`, `project_context`
- **Realtime:** `project`, `projects:list`

### `/admin/channel-presets`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `channel_presets`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin/crafts`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `crafts`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin/errors`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin/formats`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `project_formats`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin/hub`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `hub_incident_updates`, `hub_posts`, `hub_reads`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`
- **Functions:** `admin_case_study_projects`, `get_my_account`, `hub_case_study_project`
- **Realtime:** `project`, `projects:list`

### `/admin`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`, `get_platform_stats`
- **Realtime:** `project`, `projects:list`

### `/admin/reports`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `reports`, `timeline_items`
- **Functions:** `admin_close_job`, `admin_hide_message`, `admin_reported_message`, `admin_set_suspended`, `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin/support`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `support_case_messages`, `support_cases`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin/users`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `admin_list_users`, `admin_set_suspended`, `get_my_account`, `set_user_admin`
- **Realtime:** `project`, `projects:list`

### `/auth/callback`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/auth`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`, `log_password_breach`
- **Realtime:** `project`, `projects:list`

### `/auth/reset`

- **Tables:** —
- **Functions:** `log_password_breach`

### `/auth/spotify-callback`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `spotify_connections`, `timeline_items`
- **Functions:** `get_my_account`, `report_client_error`
- **Realtime:** `project`, `projects:list`

### `/call/[id]`

- **Tables:** `audit_logs`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channel_presets`, `character_castings`, `character_media`, `characters`, `expenses`, `media`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_documents`, `project_formats`, `project_locations`, `projects`, `push_subscriptions`, `reading_corrections`, `scene_characters`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `scripts`, `set_log`, `shoot_days`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `get_my_account`, `get_shared_lookbook`, `issue_call_sheet`, `project_context`, `set_paper_edit`, `sync_script_scenes`
- **Realtime:** `live`, `project`, `projects:list`

### `/crew/[id]`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `media`, `notifications`, `portfolio_blocks`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `reports`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `admin_close_job`, `admin_hide_message`, `admin_reported_message`, `admin_set_suspended`, `get_my_account`, `get_person_credits`
- **Realtime:** `lounge-presence`, `project`, `projects:list`

### `/crew`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `lounge-presence`, `project`, `projects:list`

### `/editor`

- **Tables:** `audit_logs`, `breakdown_categories`, `breakdown_dismissals`, `breakdown_elements`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channel_presets`, `character_castings`, `character_media`, `characters`, `expenses`, `media`, `notifications`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_audio_references`, `project_beats`, `project_brief`, `project_crew`, `project_documents`, `project_formats`, `project_locations`, `projects`, `push_subscriptions`, `reading_corrections`, `scene_characters`, `scene_elements`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `script_characters`, `script_metadata`, `script_revisions`, `script_stash`, `scripts`, `set_log`, `sfx_assets`, `shoot_days`, `shots`, `spotify_connections`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`, `writing_days`
- **Functions:** `ack_call_sheet`, `add_script_annotation`, `advance_phase`, `breakdown_memory`, `get_my_account`, `get_my_ui_prefs`, `get_my_writing_prefs`, `get_shared_lookbook`, `issue_call_sheet`, `log_writing`, `project_context`, `project_progress`, `projects_progress`, `report_client_error`, `set_my_ui_prefs`, `set_paper_edit`, `sync_script_scenes`, `tag_scene_element`
- **Realtime:** `live`, `presence:project`, `project`, `projects:list`, `script`

### `/hub/[id]`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `hub_incident_updates`, `hub_posts`, `hub_reads`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `admin_case_study_projects`, `get_my_account`, `hub_case_study_project`
- **Realtime:** `project`, `projects:list`

### `/hub/help/[id]`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `support_case_messages`, `support_cases`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/hub/help`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `support_case_messages`, `support_cases`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/hub`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `hub_incident_updates`, `hub_posts`, `hub_reads`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/jobs/[id]`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `job_applications`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`, `respond_to_application`
- **Realtime:** `project`, `projects:list`

### `/jobs`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `job_applications`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `reports`, `timeline_items`
- **Functions:** `admin_close_job`, `admin_hide_message`, `admin_reported_message`, `admin_set_suspended`, `get_my_account`, `respond_to_application`
- **Realtime:** `project`, `projects:list`

### `/lounge`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `discord_integrations`, `jobs`, `media`, `messages`, `notifications`, `portfolio_projects`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `reports`, `scenes`, `script_annotations`, `scripts`, `timeline_items`
- **Functions:** `admin_close_job`, `admin_hide_message`, `admin_reported_message`, `admin_set_suspended`, `can_manage_channel`, `can_post_channel`, `edit_message`, `get_my_account`, `has_discord_webhook`, `lounge_unread`, `mark_lounge_read`, `pin_message`, `project_context`, `search_lounge`, `toggle_message_reaction`
- **Realtime:** `chan`, `dm`, `lounge-presence`, `lounge-unread`, `project`, `projects:list`, `thread`, `typing`, `voice`

### `/m/[id]`

- **Tables:** `portfolio_projects`
- **Functions:** `get_published_media`
- **Storage:** `project-media`

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

### `/profile`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`, `unavailability`
- **Functions:** `get_my_account`, `project_availability`
- **Realtime:** `project`, `projects:list`

### `/projects/[id]`

- **Tables:** `activity_feed`, `audit_logs`, `breakdown_categories`, `breakdown_dismissals`, `breakdown_elements`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `character_castings`, `character_media`, `characters`, `crafts`, `discord_integrations`, `entities`, `expenses`, `guide_progress`, `item_versions`, `job_applications`, `jobs`, `links`, `media`, `messages`, `notifications`, `portfolio_projects`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_documents`, `project_formats`, `project_locations`, `project_tasks`, `projects`, `push_subscriptions`, `reading_corrections`, `review_comments`, `review_links`, `scene_characters`, `scene_elements`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `scripts`, `set_log`, `shoot_days`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `add_review_comment`, `advance_phase`, `breakdown_memory`, `can_manage_channel`, `can_post_channel`, `decide_review`, `edit_message`, `get_my_account`, `get_my_ui_prefs`, `get_shared_lookbook`, `has_discord_webhook`, `issue_call_sheet`, `lounge_unread`, `mark_lounge_read`, `pin_message`, `project_context`, `project_progress`, `projects_progress`, `respond_to_application`, `search_lounge`, `set_my_ui_prefs`, `set_paper_edit`, `sync_script_scenes`, `tag_scene_element`, `toggle_message_reaction`
- **Realtime:** `chan`, `live`, `lounge-presence`, `project`, `projects:list`

### `/projects/[id]/pitch`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `media`, `notifications`, `portfolio_blocks`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `script_annotations`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/projects`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `discord_integrations`, `media`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `advance_phase`, `can_manage_channel`, `can_post_channel`, `get_my_account`, `has_discord_webhook`, `project_context`, `project_progress`, `projects_progress`
- **Realtime:** `project`, `projects:list`

### `/settings`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `notifications`, `profiles`, `project_audio_references`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `sfx_assets`, `timeline_items`
- **Functions:** `account_deletion_plan`, `delete_my_account`, `get_my_account`, `get_my_ui_prefs`, `set_my_ui_prefs`, `transfer_project`
- **Realtime:** `project`, `projects:list`

### `/showcase`

- **Tables:** —
- **Functions:** `get_public_showcase`

### `/soundtrack`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_audio_references`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `sfx_assets`, `spotify_connections`, `timeline_items`
- **Functions:** `get_my_account`, `report_client_error`
- **Realtime:** `project`, `projects:list`

### `/split`

- **Tables:** —

### `/studio`

- **Tables:** `activity_feed`, `audit_logs`, `breakdown_categories`, `breakdown_dismissals`, `breakdown_elements`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `character_castings`, `character_media`, `characters`, `discord_integrations`, `entities`, `expenses`, `item_versions`, `jobs`, `links`, `media`, `notifications`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_documents`, `project_formats`, `project_locations`, `project_tasks`, `projects`, `push_subscriptions`, `reading_corrections`, `review_comments`, `review_links`, `scene_characters`, `scene_elements`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `script_characters`, `scripts`, `set_log`, `shoot_days`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `unavailability`, `vendors`
- **Functions:** `ack_call_sheet`, `add_review_comment`, `admin_case_study_projects`, `advance_phase`, `append_to_script`, `breakdown_memory`, `can_manage_channel`, `can_post_channel`, `decide_review`, `get_my_account`, `get_my_ui_prefs`, `get_shared_lookbook`, `has_discord_webhook`, `hub_case_study_project`, `issue_call_sheet`, `project_availability`, `project_context`, `project_progress`, `projects_progress`, `set_my_ui_prefs`, `set_paper_edit`, `sync_script_scenes`, `tag_scene_element`
- **Realtime:** `activity`, `live`, `lounge-presence`, `project`, `projects:list`, `script`

### `/today`

- **Tables:** `audit_logs`, `budget_items`, `call_sheet_calls`, `call_sheets`, `campaigns`, `channels`, `media`, `messages`, `notifications`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `script_annotations`, `script_characters`, `scripts`, `timeline_items`
- **Functions:** `edit_message`, `get_my_account`, `get_my_ui_prefs`, `lounge_unread`, `mark_lounge_read`, `pin_message`, `search_lounge`, `set_my_ui_prefs`, `toggle_message_reaction`
- **Realtime:** `chan`, `project`, `projects:list`

### `/welcome`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `crafts`, `discord_integrations`, `jobs`, `media`, `notifications`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `advance_phase`, `can_manage_channel`, `can_post_channel`, `get_my_account`, `get_my_ui_prefs`, `has_discord_webhook`, `project_context`, `project_progress`, `projects_progress`, `set_my_ui_prefs`
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

## Tables → routes

| Table | Used by |
|---|---|
| `activity_feed` | `/p/[token]`, `/admin/hub`, `/admin`, `/auth/callback`, `/auth`, `/crew/[id]`, `/crew`, `/hub`, `/jobs`, `/lounge`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/studio`, `/welcome` |
| `audit_logs` | `/p/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `breakdown_categories` | `/editor`, `/projects/[id]`, `/studio` |
| `breakdown_dismissals` | `/editor`, `/projects/[id]`, `/studio` |
| `breakdown_elements` | `/editor`, `/projects/[id]`, `/studio` |
| `brief_questions` | `/admin/brief-questions`, `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `budget_items` | `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `call_sheet_acks` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `call_sheet_calls` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio`, `/today` |
| `call_sheets` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio`, `/today` |
| `campaigns` | `/p/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `channel_members` | `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `channel_presets` | `/admin/brief-questions`, `/admin/channel-presets`, `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `channels` | `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/today`, `/welcome`, `/api/discord/notify` |
| `character_castings` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `character_media` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `characters` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `client_errors` | **no route** (server-side, triggers or functions only) |
| `crafts` | `/admin/crafts`, `/crew`, `/jobs`, `/profile`, `/projects/[id]`, `/welcome` |
| `discord_integrations` | `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome`, `/api/discord/notify` |
| `entities` | `/projects/[id]`, `/studio` |
| `expenses` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `guide_progress` | `/projects/[id]` |
| `hidden_messages` | **no route** (server-side, triggers or functions only) |
| `hub_incident_updates` | `/admin/hub`, `/hub/[id]`, `/hub` |
| `hub_posts` | `/admin/hub`, `/hub/[id]`, `/hub` |
| `hub_reads` | `/admin/hub`, `/hub/[id]`, `/hub` |
| `item_versions` | `/review/[token]`, `/projects/[id]`, `/studio` |
| `job_applications` | `/jobs/[id]`, `/jobs`, `/`, `/projects/[id]` |
| `jobs` | `/p/[token]`, `/admin/hub`, `/admin`, `/auth/callback`, `/auth`, `/crew/[id]`, `/crew`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/profile`, `/projects/[id]`, `/settings`, `/studio`, `/welcome` |
| `links` | `/projects/[id]`, `/studio` |
| `lounge_reads` | **no route** (server-side, triggers or functions only) |
| `media` | `/p/[token]`, `/shared/[token]`, `/call/[id]`, `/crew/[id]`, `/editor`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/studio`, `/today`, `/welcome` |
| `messages` | `/lounge`, `/`, `/projects/[id]`, `/today` |
| `notifications` | `/p/[token]`, `/admin/hub`, `/admin`, `/auth/callback`, `/auth`, `/crew/[id]`, `/crew`, `/editor`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/settings`, `/studio`, `/today`, `/welcome`, `/api/push/dispatch` |
| `phase_gates` | **no route** (server-side, triggers or functions only) |
| `portfolio_blocks` | `/p/[token]`, `/crew/[id]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]/pitch` |
| `portfolio_media` | `/p/[token]`, `/crew/[id]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]/pitch` |
| `portfolio_projects` | `/p/[token]`, `/review/[token]`, `/s/[token]`, `/shared/[token]`, `/crew/[id]`, `/lounge`, `/m/[id]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]`, `/projects/[id]/pitch`, `/today` |
| `post_cuts` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `post_items` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `post_notes` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `profiles` | `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome`, `/api/discord/notify`, `/api/push/dispatch` |
| `project_audio_references` | `/editor`, `/settings`, `/soundtrack` |
| `project_beats` | `/p/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `project_brief` | `/admin/brief-questions`, `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `project_crew` | `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `project_documents` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `project_formats` | `/admin/brief-questions`, `/admin/formats`, `/call/[id]`, `/editor`, `/lounge`, `/portfolio/manage`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `project_locations` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `project_tasks` | `/lounge`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/studio`, `/today`, `/welcome` |
| `projects` | `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `push_subscriptions` | `/p/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome`, `/api/push/dispatch` |
| `reading_corrections` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `reports` | `/admin/reports`, `/crew/[id]`, `/jobs`, `/lounge` |
| `review_comments` | `/review/[token]`, `/projects/[id]`, `/studio` |
| `review_links` | `/review/[token]`, `/projects/[id]`, `/studio` |
| `scene_characters` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `scene_elements` | `/editor`, `/projects/[id]`, `/studio` |
| `scene_media` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `scene_states` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `scenes` | `/p/[token]`, `/shared/[token]`, `/admin/brief-questions`, `/call/[id]`, `/crew/[id]`, `/editor`, `/lounge`, `/portfolio/manage`, `/portfolio`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/studio`, `/today`, `/welcome` |
| `script_annotations` | `/shared/[token]`, `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects/[id]/pitch`, `/studio`, `/today` |
| `script_characters` | `/editor`, `/`, `/studio`, `/today` |
| `script_metadata` | `/editor` |
| `script_revisions` | `/editor` |
| `script_stash` | `/editor` |
| `scripts` | `/p/[token]`, `/admin/brief-questions`, `/admin/hub`, `/admin`, `/auth/callback`, `/auth`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `set_log` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `sfx_assets` | `/editor`, `/settings`, `/soundtrack` |
| `shoot_days` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `shots` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `spotify_connections` | `/auth/spotify-callback`, `/editor`, `/soundtrack` |
| `support_case_messages` | `/admin/support`, `/hub/help/[id]`, `/hub/help` |
| `support_cases` | `/admin/support`, `/hub/help/[id]`, `/hub/help` |
| `timeline_items` | `/p/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/hub`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `timesheets` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `transcript_lines` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `unavailability` | `/profile`, `/studio` |
| `vendors` | `/shared/[token]`, `/call/[id]`, `/editor`, `/projects/[id]`, `/studio` |
| `writing_days` | `/editor` |

## Database functions

| Function | Use |
|---|---|
| `account_deletion_plan` | called from a route |
| `ack_call_sheet` | called from a route |
| `add_review_comment` | called from a route |
| `add_script_annotation` | called from a route |
| `admin_case_study_projects` | called from a route |
| `admin_close_job` | called from a route |
| `admin_hide_message` | called from a route |
| `admin_list_users` | called from a route |
| `admin_platform_analytics` | called from a route |
| `admin_reported_message` | called from a route |
| `admin_set_suspended` | called from a route |
| `advance_phase` | called from a route |
| `append_to_script` | called from a route |
| `breakdown_memory` | called from a route |
| `can_manage_channel` | called from a route |
| `can_post_channel` | called from a route |
| `decide_review` | called from a route |
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
| `get_review` | called from a route |
| `get_shared_lookbook` | called from a route |
| `get_shared_project` | called from a route |
| `get_shared_script` | called from a route |
| `handle_new_user` | internal (policies, triggers, other functions) |
| `has_discord_webhook` | called from a route |
| `hub_case_study_project` | called from a route |
| `issue_call_sheet` | called from a route |
| `log_password_breach` | called from a route |
| `log_writing` | called from a route |
| `lounge_unread` | called from a route |
| `mark_lounge_read` | called from a route |
| `pin_message` | called from a route |
| `project_availability` | called from a route |
| `project_context` | called from a route |
| `project_progress` | called from a route |
| `projects_progress` | called from a route |
| `report_client_error` | called from a route |
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
| `accessibility.spec.ts` | `/`, `/admin`, `/admin/analytics`, `/admin/audit-logs`, `/admin/channel-presets`, `/admin/crafts`, `/admin/formats`, `/admin/reports`, `/admin/users`, `/auth`, `/crew`, `/crew/*`, `/does-not-exist`, `/editor`, `/jobs`, `/jobs/*`, `/lounge`, `/p/*`, `/portfolio`, `/portfolio/manage`, `/profile`, `/projects`, `/projects/*`, `/projects/*/pitch`, `/settings`, `/shared/*`, `/showcase`, `/soundtrack`, `/studio`, `/welcome` |
| `account-deletion.spec.ts` | `/`, `/auth`, `/settings` |
| `admin-channel-presets.spec.ts` | `/admin/channel-presets`, `/auth` |
| `admin-crafts.spec.ts` | `/admin/crafts`, `/auth` |
| `admin-formats.spec.ts` | `/admin/formats`, `/auth` |
| `announcements.spec.ts` | `/auth`, `/lounge`, `/projects/*` |
| `auth-journey.spec.ts` | `/auth`, `/crew`, `/editor`, `/hub`, `/jobs`, `/lounge`, `/portfolio`, `/profile`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/today`, `/welcome` |
| `auth-validation.spec.ts` | `/auth` |
| `availability.spec.ts` | `/auth`, `/profile`, `/studio` |
| `beat-to-script.spec.ts` | `/auth`, `/editor`, `/rest/v1/scripts`, `/studio` |
| `breakdown.spec.ts` | `/auth`, `/editor`, `/studio` |
| `brief.spec.ts` | `/auth`, `/jobs`, `/lounge`, `/projects/*` |
| `call-sheets.spec.ts` | `/auth`, `/call/*`, `/studio` |
| `community.spec.ts` | `/auth`, `/lounge` |
| `continuity.spec.ts` | `/auth`, `/studio` |
| `credits.spec.ts` | `/auth`, `/crew/*`, `/shared/*` |
| `cut-notes.spec.ts` | `/auth`, `/editor`, `/studio` |
| `daylight.spec.ts` | `/auth`, `/studio` |
| `documents.spec.ts` | `/auth`, `/studio` |
| `editor-find-cast.spec.ts` | `/auth`, `/editor`, `/studio` |
| `editor-gutter.spec.ts` | `/auth`, `/editor`, `/studio` |
| `editor-keyboard-reorder.spec.ts` | `/auth`, `/editor`, `/studio` |
| `editor-project-script.spec.ts` | `/auth`, `/editor`, `/rest/v1/scripts`, `/studio` |
| `editor-safety-net.spec.ts` | `/auth`, `/editor`, `/studio` |
| `editor-undo.spec.ts` | `/auth`, `/editor`, `/studio` |
| `emphasis.spec.ts` | `/auth`, `/editor` |
| `errors.spec.ts` | `/admin/errors`, `/auth`, `/today` |
| `guides.spec.ts` | `/auth`, `/projects/*` |
| `hide-message.spec.ts` | `/admin/reports`, `/auth`, `/lounge` |
| `hiring.spec.ts` | `/auth`, `/jobs`, `/jobs/*`, `/studio` |
| `home-page-crash.spec.ts` | `/` |
| `install.spec.ts` | `/auth`, `/today` |
| `island.spec.ts` | `/auth`, `/lounge`, `/projects`, `/settings`, `/today` |
| `keyboard-audit.spec.ts` | `/`, `/admin`, `/auth`, `/crew`, `/editor`, `/jobs`, `/jobs/*`, `/lounge`, `/portfolio`, `/profile`, `/projects`, `/projects/*`, `/settings`, `/shared/*`, `/showcase`, `/soundtrack`, `/studio`, `/welcome` |
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
| `projects-keyboard-phase.spec.ts` | `/auth`, `/projects` |
| `push.spec.ts` | `/api/push/dispatch`, `/call/abc` |
| `readiness.spec.ts` | `/auth`, `/studio` |
| `reading-corrections.spec.ts` | `/auth`, `/editor`, `/studio` |
| `real-data.spec.ts` | `/`, `/auth`, `/studio` |
| `reports.spec.ts` | `/admin/reports`, `/auth`, `/jobs`, `/jobs/*` |
| `route-smoke.spec.ts` | `/`, `/auth`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/portfolio`, `/projects`, `/settings`, `/showcase`, `/studio`, `/this-path-does-not-exist` |
| `script-share.spec.ts` | `/auth`, `/editor` |
| `search.spec.ts` | `/auth`, `/editor\\`, `/projects`, `/studio` |
| `share-pages.spec.ts` | `/m/*`, `/m/not-a-uuid`, `/p/*`, `/p/not-a-real-token` |
| `shot-designer.spec.ts` | `/auth`, `/studio` |
| `split.spec.ts` | `/auth`, `/editor`, `/p/not-a-token`, `/split`, `/studio` |
| `spotify-connect.spec.ts` | `/auth`, `/soundtrack` |
| `studio-journey.spec.ts` | `/auth`, `/editor`, `/studio` |
| `suspend-user.spec.ts` | `/admin/audit-logs`, `/admin/users`, `/auth`, `/crew/*` |
| `table-read.spec.ts` | `/auth`, `/editor`, `/projects/*` |
| `themes.spec.ts` | `/auth`, `/projects`, `/projects/*`, `/settings` |
| `today-owner.spec.ts` | `/auth`, `/today` |
| `transcripts.spec.ts` | `/auth`, `/studio` |
| `view-as.spec.ts` | `/auth`, `/projects/*` |
| `writing-loop.spec.ts` | `/auth`, `/editor` |
| `your-data.spec.ts` | `/auth`, `/crew`, `/profile`, `/settings` |
