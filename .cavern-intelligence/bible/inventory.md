# Inventory (generated)

> Built by `npm run bible` from the code — don't edit by hand. What each part is *for* is in the chapters (see [README](README.md)).

**55 pages · 9 API routes · 104 tables · 80 database functions · 123 e2e specs**

## Routes

| Route | Access | File (lines) | Built from | e2e |
|---|---|---|---|---|
| `/b/[token]` | open (page checks) | `app/(public)/b/[token]/page.tsx` (108) | 43 files · components: ui · lib: auth, formats, island, os, push, scriptos, studio, supabase, types, validation | **none** |
| `/p/[token]` | open (page checks) | `app/(public)/p/[token]/page.tsx` (49) | 41 files · components: ui · lib: auth, formats, hooks, os, portfolio, push, studio, supabase, types, util, validation | accessibility, portfolio-page, share-pages, split |
| `/portfolios` | open (page checks) | `app/(public)/portfolios/page.tsx` (102) | 6 files · components: — · lib: portfolio, supabase | portfolio-page |
| `/privacy` | open (page checks) | `app/(public)/privacy/page.tsx` (138) | 3 files · components: legal · lib: legal | legal |
| `/review/[token]` | open (page checks) | `app/(public)/review/[token]/page.tsx` (40) | 8 files · components: — · lib: ad, review, supabase | review-audiences |
| `/s/[token]` | open (page checks) | `app/(public)/s/[token]/page.tsx` (175) | 12 files · components: — · lib: formats, scriptos, supabase | **none** |
| `/shared/[token]` | open (page checks) | `app/(public)/shared/[token]/page.tsx` (202) | 44 files · components: ui · lib: auth, credits, formats, island, os, push, scriptos, studio, supabase, types, validation | accessibility, credits, keyboard-audit, portfolio-page |
| `/sign/[token]` | public | `app/(public)/sign/[token]/page.tsx` (37) | 6 files · components: — · lib: supabase | **none** |
| `/terms` | open (page checks) | `app/(public)/terms/page.tsx` (116) | 3 files · components: legal · lib: legal | legal |
| `/u/[handle]` | open (page checks) | `app/(public)/u/[handle]/page.tsx` (132) | 13 files · components: portfolio, ui · lib: credits, portfolio, print, supabase | portfolio-page |
| `/admin/analytics` | admin | `app/(suite)/admin/analytics/page.tsx` (243) | 31 files · components: ui · lib: auth, formats, hooks, os, push, supabase, types, validation | accessibility, admin-actions, admin-support-analytics, admin-sweep |
| `/admin/audit-logs` | admin | `app/(suite)/admin/audit-logs/page.tsx` (434) | 33 files · components: ui · lib: audit, auth, formats, hooks, os, push, supabase, types, util, validation | accessibility, admin-actions, admin-sweep, suspend-user |
| `/admin/brief-questions` | admin | `app/(suite)/admin/brief-questions/page.tsx` (161) | 45 files · components: admin, ui · lib: auth, brief, formats, hooks, os, push, scriptos, supabase, types, validation | admin-actions, admin-sweep |
| `/admin/channel-presets` | admin | `app/(suite)/admin/channel-presets/page.tsx` (110) | 33 files · components: ui · lib: auth, formats, hooks, lounge, os, push, supabase, types, validation | accessibility, admin-actions, admin-channel-presets, admin-sweep |
| `/admin/crafts` | admin | `app/(suite)/admin/crafts/page.tsx` (103) | 35 files · components: ui · lib: auth, crafts, formats, hooks, os, push, supabase, types, validation | accessibility, admin-actions, admin-crafts, admin-sweep |
| `/admin/errors` | admin | `app/(suite)/admin/errors/page.tsx` (133) | 32 files · components: ui · lib: auth, errors, formats, hooks, os, push, supabase, types, validation | admin-actions, admin-sweep, errors |
| `/admin/formats` | admin | `app/(suite)/admin/formats/page.tsx` (118) | 36 files · components: formats, ui · lib: auth, formats, hooks, os, push, supabase, types, validation | accessibility, admin-actions, admin-formats, admin-sweep |
| `/admin/hub` | admin | `app/(suite)/admin/hub/page.tsx` (185) | 40 files · components: Flag, hub, ui · lib: auth, flags, formats, hooks, hub, os, push, supabase, types, validation | admin-actions, admin-sweep |
| `/admin` | admin | `app/(suite)/admin/page.tsx` (300) | 34 files · components: Flag, ui · lib: auth, flags, formats, hooks, os, push, supabase, types, validation | accessibility, admin-actions, admin-support-analytics, admin-sweep, keyboard-audit |
| `/admin/reports` | admin | `app/(suite)/admin/reports/page.tsx` (126) | 32 files · components: ui · lib: auth, formats, hooks, os, push, supabase, types, validation | accessibility, admin-actions, admin-sweep, hide-message, reports |
| `/admin/support` | admin | `app/(suite)/admin/support/page.tsx` (93) | 32 files · components: hub, ui · lib: auth, formats, hooks, hub, os, push, supabase, types, validation | admin-actions, admin-support-analytics, admin-sweep |
| `/admin/users` | admin | `app/(suite)/admin/users/page.tsx` (280) | 29 files · components: ui · lib: auth, formats, os, push, supabase, types, validation | accessibility, admin-actions, admin-sweep, suspend-user |
| `/auth/callback` | public | `app/(suite)/auth/callback/page.tsx` (74) | 30 files · components: ui · lib: auth, formats, os, push, supabase, types, validation | **none** |
| `/auth` | public | `app/(suite)/auth/page.tsx` (497) | 41 files · components: Flag, ui · lib: account, auth, flags, formats, hooks, logging, os, push, supabase, types, validation | accessibility, auth-journey, auth-validation, community-page, install, island, keyboard-audit, legal, login-smoke, password-recovery, route-smoke, split, suspend-user |
| `/auth/reset` | public | `app/(suite)/auth/reset/page.tsx` (154) | 10 files · components: ui · lib: account, auth, logging, supabase | password-recovery |
| `/auth/spotify-callback` | public | `app/(suite)/auth/spotify-callback/page.tsx` (77) | 35 files · components: ui · lib: auth, errors, formats, hooks, os, push, spotify, supabase, types, validation | **none** |
| `/call/[id]` | signed in | `app/(suite)/call/[id]/page.tsx` (297) | 71 files · components: crafts, projects, ui · lib: auth, brief, crafts, film, formats, island, os, print, push, roles, scriptos, studio, supabase, types, util, validation | call-sheets, push |
| `/call` | signed in | `app/(suite)/call/page.tsx` (88) | 49 files · components: ui · lib: auth, formats, island, os, push, scriptos, studio, supabase, today, types, validation | performer-calls |
| `/cavern` | signed in | `app/(suite)/cavern/page.tsx` (22) | 2 files · components: — · lib: cavern | **none** |
| `/community` | signed in | `app/(suite)/community/page.tsx` (50) | 79 files · components: Flag, community, home, landing, mobile, roles, ui · lib: auth, crafts, film, flags, formats, guides, hooks, hub, island, notifications, os, pocket, push, pwa, roles, spotify, supabase, themes, today, types, util, validation | admin-actions, auth-journey, community-page, community-personas, community-phone, crew-invitations, director-day, editor-offline-merge, errors, global-chords, home-music, home-routing, install, island-compact-dock, island-projects-keys, island, layout, mobile, page-errors, script-formats, shortcut-search, today-owner |
| `/crew/[id]` | signed in | `app/(suite)/crew/[id]/page.tsx` (370) | 45 files · components: ui · lib: auth, credits, formats, hooks, os, portfolio, push, studio, supabase, types, util, validation | accessibility, credits, portfolio-page, suspend-user |
| `/crew` | signed in | `app/(suite)/crew/page.tsx` (277) | 42 files · components: crafts, ui · lib: auth, crafts, formats, hooks, notifications, os, push, supabase, types, util, validation | accessibility, auth-journey, keyboard-audit, layout, mobile, page-errors, route-smoke, your-data |
| `/editor` | signed in | `app/(suite)/editor/page.tsx` (1540) | 224 files · components: Flag, ad, audio, breakdown, characters, editor, notes, phone, story, studio, ui · lib: ad, audio, auth, breakdown, brief, characters, errors, film, flags, formats, guides, hooks, integrations, island, notes, notifications, os, pocket, push, scriptos, split, spotify, storage, story, studio, supabase, themes, types, util, validation, writing | accessibility, auth-journey, beat-to-script, breakdown, cut-notes, editor-caret-after-edit, editor-cowriting, editor-find-cast, editor-gutter, editor-keyboard-reorder, editor-offline-merge, editor-project-script, editor-safety-net, editor-undo, emphasis, global-chords, island-activity, keyboard-audit, layout, mobile, notes, onboarding, page-errors, phases, phone-editor, production-from-script, production-tools-open, reading-corrections, route-smoke, script-share, split, story-interview, studio-journey, table-read, writing-loop |
| `/hub/[id]` | signed in | `app/(suite)/hub/[id]/page.tsx` (68) | 38 files · components: hub, ui · lib: auth, formats, hooks, hub, os, push, supabase, types, validation | admin-support-analytics |
| `/hub/help/[id]` | signed in | `app/(suite)/hub/help/[id]/page.tsx` (44) | 32 files · components: hub, ui · lib: auth, formats, hooks, hub, os, push, supabase, types, validation | admin-support-analytics |
| `/hub/help` | signed in | `app/(suite)/hub/help/page.tsx` (86) | 31 files · components: ui · lib: auth, formats, hooks, hub, os, push, supabase, types, validation | admin-support-analytics |
| `/hub` | signed in | `app/(suite)/hub/page.tsx` (11) | 1 files · components: — · lib: — | auth-journey, community-page |
| `/jobs/[id]` | signed in | `app/(suite)/jobs/[id]/page.tsx` (553) | 35 files · components: ui · lib: auth, formats, hooks, notifications, os, push, supabase, types, util, validation | accessibility, hiring, keyboard-audit, reports |
| `/jobs` | signed in | `app/(suite)/jobs/page.tsx` (447) | 54 files · components: crafts, jobs, ui · lib: auth, crafts, formats, hooks, island, notifications, os, push, supabase, types, util, validation | accessibility, auth-journey, brief, hiring, keyboard-audit, layout, mobile, onboarding, page-errors, reports, route-smoke |
| `/lounge` | signed in | `app/(suite)/lounge/page.tsx` (110) | 91 files · components: crafts, lounge, projects, ui · lib: auth, brief, crafts, formats, hooks, island, lounge, notifications, os, push, roles, scriptos, supabase, types, util, validation, webrtc | accessibility, announcements, auth-journey, brief, community-page, community-personas, community, hide-message, island-call, island, keyboard-audit, layout, lounge, mobile, page-errors, phone-keyboard, route-smoke, voice-two-people |
| `/m/[id]` (api) | open (page checks) | `app/(suite)/m/[id]/route.ts` (28) | 3 files · components: — · lib: supabase | share-pages |
| `/` | public | `app/(suite)/page.tsx` (444) | 52 files · components: brand, landing, shell, ui · lib: auth, brand, community, formats, home, hooks, notifications, os, push, supabase, types, util, validation | accessibility, account-deletion, home-page-crash, home-routing, keyboard-audit, legal, real-data, route-smoke |
| `/portfolio/manage` | signed in | `app/(suite)/portfolio/manage/page.tsx` (320) | 43 files · components: portfolio, ui · lib: auth, formats, os, portfolio, push, supabase, types, validation | accessibility, portfolio-page |
| `/portfolio` | signed in | `app/(suite)/portfolio/page.tsx` (484) | 42 files · components: portfolio, ui · lib: auth, formats, island, os, portfolio, push, studio, supabase, types, validation | accessibility, auth-journey, keyboard-audit, page-errors, portfolio-page, route-smoke |
| `/profile` | signed in | `app/(suite)/profile/page.tsx` (370) | 41 files · components: availability, crafts, ui · lib: auth, availability, crafts, formats, hooks, os, push, supabase, types, util, validation | accessibility, auth-journey, availability, keyboard-audit, page-errors, your-data |
| `/projects/[id]` | signed in | `app/(suite)/projects/[id]/page.tsx` (438) | 112 files · components: Flag, brief, crafts, film, formats, guides, progress, projects, roles, studio, ui · lib: auth, brief, crafts, film, flags, formats, guides, hooks, lounge, notifications, os, pocket, push, review, roles, scriptos, split, studio, supabase, themes, types, util, validation, writing | accessibility, announcements, brief, budget-lines, guides, keyboard-audit, layout, mobile, page-errors, phases, project-manager, split, table-read, themes, view-as-role, view-as |
| `/projects/[id]/pitch` | signed in | `app/(suite)/projects/[id]/pitch/page.tsx` (626) | 45 files · components: ui · lib: auth, formats, notifications, os, portfolio, push, scriptos, supabase, types, util, validation | accessibility, project-manager |
| `/projects/[id]/world` | signed in | `app/(suite)/projects/[id]/world/page.tsx` (17) | 7 files · components: world · lib: supabase, world | **none** |
| `/projects` | signed in | `app/(suite)/projects/page.tsx` (672) | 61 files · components: brand, formats, ui · lib: auth, brief, formats, hooks, island, lounge, onboarding, os, push, scriptos, supabase, types, util, validation | accessibility, auth-journey, island, keyboard-audit, layout, login-smoke, mobile, onboarding, page-errors, projects-keyboard-phase, route-smoke, search, themes |
| `/settings` | signed in | `app/(suite)/settings/page.tsx` (342) | 57 files · components: guides, settings, ui · lib: account, auth, formats, guides, island, notifications, os, pocket, push, supabase, themes, types, validation | accessibility, account-deletion, admin-actions, auth-journey, island, keyboard-audit, mobile, page-errors, phases, phone-keyboard, route-smoke, themes, your-data |
| `/showcase` | open (page checks) | `app/(suite)/showcase/page.tsx` (174) | 8 files · components: ui · lib: studio, supabase | accessibility, keyboard-audit, route-smoke |
| `/soundtrack` | signed in | `app/(suite)/soundtrack/page.tsx` (302) | 73 files · components: audio, phone, studio, ui · lib: audio, auth, brief, cavern, errors, formats, island, os, push, scriptos, spotify, studio, supabase, types, validation | accessibility, auth-journey, keyboard-audit, page-errors, spotify-connect |
| `/split` | signed in | `app/(suite)/split/page.tsx` (257) | 5 files · components: ui · lib: hooks, split | global-chords, page-errors, split |
| `/studio` | signed in | `app/(suite)/studio/page.tsx` (259) | 339 files · components: Flag, ad, breakdown, brief, crafts, film, formats, notes, progress, projects, roles, studio, ui, world · lib: ad, auth, availability, breakdown, brief, casting, crafts, film, flags, formats, guides, hooks, hub, integrations, island, lounge, notes, notifications, os, pocket, print, push, references, review, roles, scriptos, split, storage, studio, supabase, themes, types, util, validation, world, writing | accessibility, ad-export, auth-journey, availability, beat-to-script, board-share, breakdown, budget-lines, call-sheets, change-impact, community-page, continuity, crew-craft, crew-records, cut-notes, daylight, documents, editor-caret-after-edit, editor-cowriting, editor-find-cast, editor-gutter, editor-keyboard-reorder, editor-offline-merge, editor-package, editor-project-script, editor-safety-net, editor-undo, grant-request, hiring, island-activity, island-onset-clock, island-upload, keyboard-audit, layout, location-rename, locations, mobile, money, mood-boards, notes, on-set, onset-offline, onset-phone, page-errors, performer-calls, phases, production-from-script, production-tools-open, project-manager, readiness-day-date, readiness, reading-corrections, real-data, records-links, role-scoped-money, route-smoke, scene-cost, script-formats, script-supervisor, search, shot-designer, split, story-interview, studio-find-presence, studio-journey, studio-undo, tool-find-presence, transcripts, view-as-role, your-workflow |
| `/today` | signed in | `app/(suite)/today/page.tsx` (12) | 1 files · components: — · lib: — | community-page, island-onset-clock |
| `/welcome` | signed in | `app/(suite)/welcome/page.tsx` (250) | 67 files · components: brief, crafts, formats, guides, progress, ui · lib: auth, brief, crafts, formats, guides, hooks, lounge, onboarding, os, pocket, push, scriptos, split, supabase, themes, types, util, validation | accessibility, auth-journey, keyboard-audit, onboarding |
| `/api/calendar/[token]` (api) | public | `app/api/calendar/[token]/route.ts` (21) | 2 files · components: — · lib: calendar | **none** |
| `/api/discord/notify` (api) | public | `app/api/discord/notify/route.ts` (91) | 5 files · components: — · lib: supabase, util, validation | **none** |
| `/api/discord/test` (api) | public | `app/api/discord/test/route.ts` (65) | 3 files · components: — · lib: util, validation | **none** |
| `/api/links` (api) | open (page checks) | `app/api/links/route.ts` (53) | 4 files · components: — · lib: integrations, studio, util | **none** |
| `/api/push/dispatch` (api) | open (page checks) | `app/api/push/dispatch/route.ts` (53) | 5 files · components: — · lib: notifications, push, validation | push |
| `/api/references/films` (api) | open (page checks) | `app/api/references/films/route.ts` (41) | 4 files · components: — · lib: references, util, validation | **none** |
| `/api/references/search` (api) | open (page checks) | `app/api/references/search/route.ts` (61) | 3 files · components: — · lib: util, validation | **none** |
| `/api/time` (api) | open (page checks) | `app/api/time/route.ts` (10) | 1 files · components: — · lib: — | **none** |

## What each route touches

### `/b/[token]`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `character_castings`, `character_media`, `characters`, `crafts`, `expenses`, `media`, `mood_board_items`, `mood_board_shares`, `mood_boards`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_crew`, `project_documents`, `project_locations`, `projects`, `push_subscriptions`, `reading_corrections`, `reading_line_overrides`, `scene_characters`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `set_log`, `shoot_days`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `get_my_account`, `get_portfolio_page`, `get_shared_board`, `get_shared_lookbook`, `get_shared_portfolio`, `issue_call_sheet`, `list_public_portfolios`, `reading_memory_for_user`, `set_paper_edit`, `sync_script_scenes`
- **Storage:** `project-media`
- **Realtime:** `project`, `projects:list`

### `/p/[token]`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `jobs`, `media`, `notifications`, `portfolio_blocks`, `portfolio_laurels`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`, `get_my_portfolio_page`, `get_portfolio_page`, `get_shared_portfolio`, `list_public_portfolios`
- **Realtime:** `project`, `projects:list`

### `/portfolios`

- **Tables:** `crafts`
- **Functions:** `get_portfolio_page`, `get_shared_portfolio`, `list_public_portfolios`

### `/privacy`

- **Tables:** —

### `/review/[token]`

- **Tables:** `crafts`, `item_versions`, `review_comments`, `review_links`
- **Functions:** `add_review_comment`, `decide_review`, `get_portfolio_page`, `get_review`, `get_shared_portfolio`, `list_public_portfolios`

### `/s/[token]`

- **Tables:** `crafts`
- **Functions:** `get_portfolio_page`, `get_shared_portfolio`, `get_shared_script`, `list_public_portfolios`

### `/shared/[token]`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `character_castings`, `character_media`, `characters`, `crafts`, `expenses`, `media`, `mood_board_items`, `mood_board_shares`, `mood_boards`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_crew`, `project_documents`, `project_locations`, `projects`, `push_subscriptions`, `reading_corrections`, `reading_line_overrides`, `scene_characters`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `set_log`, `shoot_days`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `get_my_account`, `get_portfolio_page`, `get_press_kit`, `get_shared_board`, `get_shared_lookbook`, `get_shared_portfolio`, `get_shared_project`, `issue_call_sheet`, `list_public_portfolios`, `reading_memory_for_user`, `set_paper_edit`, `sync_script_scenes`
- **Realtime:** `project`, `projects:list`

### `/sign/[token]`

- **Tables:** `crafts`, `project_documents`, `signing_requests`
- **Functions:** `decline_signing`, `get_portfolio_page`, `get_shared_portfolio`, `get_signing`, `list_public_portfolios`, `sign_document`, `void_signing`

### `/terms`

- **Tables:** —

### `/u/[handle]`

- **Tables:** `crafts`
- **Functions:** `get_portfolio_page`, `get_shared_portfolio`, `list_public_portfolios`

### `/admin/analytics`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `admin_platform_analytics`, `get_my_account`, `get_platform_stats`
- **Realtime:** `project`, `projects:list`

### `/admin/audit-logs`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`
- **Realtime:** `project`, `projects:list`

### `/admin/brief-questions`

- **Tables:** `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_presets`, `crafts`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `admin_count_brief_answers`, `admin_move_brief_question`, `admin_remove_brief_option`, `admin_remove_brief_question`, `get_my_account`, `project_context`
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

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `capabilities`, `channel_presets`, `character_castings`, `character_media`, `characters`, `craft_capabilities`, `crafts`, `crew_capability_overrides`, `expenses`, `media`, `mood_board_items`, `mood_board_shares`, `mood_boards`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_crew_crafts`, `project_documents`, `project_formats`, `project_locations`, `projects`, `push_subscriptions`, `reading_corrections`, `reading_line_overrides`, `scene_characters`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `scripts`, `set_log`, `shoot_days`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `get_my_account`, `get_shared_board`, `get_shared_lookbook`, `issue_call_sheet`, `my_capabilities`, `project_context`, `reading_memory_for_user`, `request_capability`, `set_paper_edit`, `sync_script_scenes`
- **Realtime:** `live`, `project`, `projects:list`

### `/call`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `character_castings`, `character_media`, `characters`, `expenses`, `media`, `mood_board_items`, `mood_board_shares`, `mood_boards`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_beats`, `project_crew`, `project_documents`, `project_locations`, `projects`, `push_subscriptions`, `reading_corrections`, `reading_line_overrides`, `scene_characters`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `scripts`, `set_log`, `shoot_days`, `shots`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`
- **Functions:** `ack_call_sheet`, `get_my_account`, `get_shared_board`, `get_shared_lookbook`, `issue_call_sheet`, `reading_memory_for_user`, `set_paper_edit`, `sync_script_scenes`
- **Realtime:** `live`, `project`, `projects:list`

### `/cavern`

- **Tables:** —

### `/community`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `capabilities`, `channels`, `craft_capabilities`, `crafts`, `crew_capability_overrides`, `hub_incident_updates`, `hub_posts`, `hub_reads`, `jobs`, `media`, `messages`, `notifications`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `project_crew_crafts`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `script_annotations`, `script_characters`, `scripts`, `shoot_days`, `shots`, `timeline_items`
- **Functions:** `edit_message`, `get_my_account`, `get_my_ui_prefs`, `get_platform_stats`, `get_recent_work`, `lounge_unread`, `mark_lounge_read`, `my_capabilities`, `my_crew_invitations`, `pin_message`, `request_capability`, `respond_to_crew_invitation`, `search_lounge`, `set_my_ui_prefs`, `toggle_message_reaction`
- **Realtime:** `chan`, `project`, `projects:list`

### `/crew/[id]`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `jobs`, `media`, `notifications`, `portfolio_blocks`, `portfolio_laurels`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `reports`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `admin_close_job`, `admin_hide_message`, `admin_reported_message`, `admin_set_suspended`, `get_my_account`, `get_my_portfolio_page`, `get_person_credits`, `get_portfolio_page`, `get_shared_portfolio`
- **Realtime:** `lounge-presence`, `project`, `projects:list`

### `/crew`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`, `my_crew_invitations`, `respond_to_crew_invitation`
- **Realtime:** `lounge-presence`, `project`, `projects:list`

### `/editor`

- **Tables:** `activity_feed`, `ad_references`, `audit_logs`, `brand_rules`, `breakdown_categories`, `breakdown_dismissals`, `breakdown_elements`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `casting_auditions`, `casting_history`, `casting_notes`, `change_reviews`, `channel_presets`, `character_castings`, `character_media`, `characters`, `deliverables`, `expenses`, `jobs`, `links`, `media`, `mood_board_items`, `mood_board_shares`, `mood_boards`, `notes`, `notifications`, `post_cuts`, `post_items`, `post_notes`, `profiles`, `project_audio_references`, `project_beats`, `project_brief`, `project_crew`, `project_documents`, `project_formats`, `project_locations`, `projects`, `push_subscriptions`, `reading_corrections`, `reading_line_overrides`, `scene_characters`, `scene_elements`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `script_characters`, `script_metadata`, `script_revisions`, `script_stash`, `scripts`, `set_log`, `sfx_assets`, `shoot_days`, `shots`, `spotify_connections`, `story_interviews`, `timeline_items`, `timesheets`, `transcript_lines`, `vendors`, `writing_days`
- **Functions:** `ack_call_sheet`, `add_script_annotation`, `advance_phase`, `breakdown_memory`, `get_my_account`, `get_my_ui_prefs`, `get_my_writing_prefs`, `get_shared_board`, `get_shared_lookbook`, `issue_call_sheet`, `log_writing`, `my_crew_invitations`, `patch_project_settings`, `project_context`, `project_progress`, `projects_progress`, `reading_memory_for_user`, `report_client_error`, `respond_to_crew_invitation`, `set_my_ui_prefs`, `set_paper_edit`, `sync_script_scenes`, `tag_scene_element`
- **Realtime:** `live`, `notes`, `presence:project`, `project`, `projects:list`, `script`

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

- **Tables:** —

### `/jobs/[id]`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `job_applications`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `timeline_items`
- **Functions:** `get_my_account`, `respond_to_application`
- **Realtime:** `project`, `projects:list`

### `/jobs`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `job_applications`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `reports`, `timeline_items`
- **Functions:** `admin_close_job`, `admin_hide_message`, `admin_reported_message`, `admin_set_suspended`, `get_my_account`, `respond_to_application`
- **Realtime:** `project`, `projects:list`

### `/lounge`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `capabilities`, `channel_members`, `channel_presets`, `channels`, `craft_capabilities`, `crafts`, `crew_capability_overrides`, `discord_integrations`, `jobs`, `media`, `messages`, `notifications`, `portfolio_projects`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_crew_crafts`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `reports`, `scenes`, `script_annotations`, `scripts`, `timeline_items`
- **Functions:** `admin_close_job`, `admin_hide_message`, `admin_reported_message`, `admin_set_suspended`, `can_manage_channel`, `can_post_channel`, `edit_message`, `get_my_account`, `has_discord_webhook`, `lounge_unread`, `mark_lounge_read`, `my_capabilities`, `my_crew_invitations`, `pin_message`, `project_context`, `request_capability`, `respond_to_crew_invitation`, `search_lounge`, `toggle_message_reaction`
- **Realtime:** `chan`, `dm`, `lounge-presence`, `lounge-unread`, `project`, `projects:list`, `thread`, `typing`, `voice`

### `/m/[id]`

- **Tables:** `crafts`
- **Functions:** `get_portfolio_page`, `get_published_media`, `get_shared_portfolio`, `list_public_portfolios`
- **Storage:** `project-media`

### `/`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `job_applications`, `jobs`, `media`, `messages`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `script_characters`, `scripts`, `timeline_items`
- **Functions:** `edit_message`, `get_my_account`, `get_platform_stats`, `get_recent_work`, `lounge_unread`, `mark_lounge_read`, `pin_message`, `respond_to_application`, `search_lounge`, `toggle_message_reaction`
- **Realtime:** `chan`, `notif`, `project`, `projects:list`

### `/portfolio/manage`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `media`, `portfolio_blocks`, `portfolio_laurels`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `project_formats`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`, `get_my_portfolio_page`, `get_portfolio_page`, `get_shared_portfolio`
- **Realtime:** `project`, `projects:list`

### `/portfolio`

- **Tables:** `audit_logs`, `budget_items`, `campaigns`, `media`, `portfolio_blocks`, `portfolio_laurels`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`, `get_my_portfolio_page`, `get_portfolio_page`, `get_shared_portfolio`
- **Realtime:** `project`, `projects:list`

### `/profile`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `crafts`, `jobs`, `notifications`, `profiles`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scripts`, `timeline_items`, `unavailability`
- **Functions:** `get_my_account`, `project_availability`
- **Realtime:** `project`, `projects:list`

### `/projects/[id]`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `capabilities`, `channel_members`, `channel_presets`, `channels`, `craft_capabilities`, `crafts`, `crew_capability_overrides`, `discord_integrations`, `entities`, `guide_progress`, `item_versions`, `jobs`, `links`, `media`, `messages`, `notifications`, `portfolio_projects`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_crew_crafts`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `review_comments`, `review_links`, `scenes`, `script_annotations`, `scripts`, `timeline_items`
- **Functions:** `add_review_comment`, `advance_phase`, `can_manage_channel`, `can_post_channel`, `decide_review`, `edit_message`, `get_my_account`, `get_my_ui_prefs`, `has_discord_webhook`, `lounge_unread`, `mark_lounge_read`, `my_capabilities`, `my_crew_invitations`, `patch_project_settings`, `pin_message`, `project_context`, `project_progress`, `projects_progress`, `request_capability`, `respond_to_crew_invitation`, `search_lounge`, `set_my_ui_prefs`, `toggle_message_reaction`
- **Realtime:** `chan`, `live`, `lounge-presence`, `presence:project`, `project`, `projects:list`

### `/projects/[id]/pitch`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `campaigns`, `media`, `notifications`, `portfolio_blocks`, `portfolio_laurels`, `portfolio_media`, `portfolio_projects`, `profiles`, `project_beats`, `project_crew`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `script_annotations`, `scripts`, `timeline_items`
- **Functions:** `get_my_account`, `get_my_portfolio_page`, `get_portfolio_page`, `get_shared_portfolio`, `my_crew_invitations`, `respond_to_crew_invitation`
- **Realtime:** `project`, `projects:list`

### `/projects/[id]/world`

- **Tables:** `worlds`

### `/projects`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `discord_integrations`, `media`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `advance_phase`, `can_manage_channel`, `can_post_channel`, `get_my_account`, `has_discord_webhook`, `patch_project_settings`, `project_context`, `project_progress`, `projects_progress`
- **Realtime:** `project`, `projects:list`

### `/settings`

- **Tables:** `activity_feed`, `audit_logs`, `budget_items`, `calendar_feeds`, `campaigns`, `jobs`, `notifications`, `profiles`, `project_audio_references`, `project_beats`, `project_crew`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `sfx_assets`, `timeline_items`
- **Functions:** `account_deletion_plan`, `delete_my_account`, `get_my_account`, `get_my_ui_prefs`, `set_my_ui_prefs`, `transfer_project`
- **Realtime:** `project`, `projects:list`

### `/showcase`

- **Tables:** —
- **Functions:** `get_public_showcase`

### `/soundtrack`

- **Tables:** `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_presets`, `profiles`, `project_audio_references`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `sfx_assets`, `spotify_connections`, `timeline_items`
- **Functions:** `get_my_account`, `project_context`, `report_client_error`
- **Realtime:** `presence:project`, `project`, `projects:list`

### `/split`

- **Tables:** —

### `/studio`

- **Tables:** `activity_feed`, `ad_references`, `audit_logs`, `brand_rules`, `breakdown_categories`, `breakdown_dismissals`, `breakdown_elements`, `brief_questions`, `budget_items`, `call_sheet_acks`, `call_sheet_calls`, `call_sheets`, `campaigns`, `capabilities`, `casting_auditions`, `casting_history`, `casting_notes`, `channel_members`, `channel_presets`, `channels`, `character_castings`, `character_media`, `characters`, `craft_capabilities`, `crafts`, `crew_capability_overrides`, `deliverables`, `discord_integrations`, `entities`, `expenses`, `item_versions`, `job_applications`, `jobs`, `links`, `media`, `mood_board_items`, `mood_board_shares`, `mood_boards`, `notes`, `notifications`, `portfolio_projects`, `post_cuts`, `post_items`, `post_notes`, `production_records`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_crew_crafts`, `project_documents`, `project_formats`, `project_locations`, `project_tasks`, `projects`, `push_subscriptions`, `reading_corrections`, `reading_line_overrides`, `review_comments`, `review_links`, `scene_characters`, `scene_elements`, `scene_media`, `scene_states`, `scenes`, `script_annotations`, `script_characters`, `script_revisions`, `scripts`, `set_log`, `shoot_days`, `shots`, `signing_requests`, `timeline_items`, `timesheets`, `transcript_lines`, `unavailability`, `vendors`, `worlds`
- **Functions:** `ack_call_sheet`, `add_review_comment`, `admin_case_study_projects`, `advance_phase`, `append_to_script`, `breakdown_memory`, `can_manage_channel`, `can_post_channel`, `decide_review`, `decline_signing`, `get_my_account`, `get_my_ui_prefs`, `get_shared_board`, `get_shared_lookbook`, `has_discord_webhook`, `hub_case_study_project`, `issue_call_sheet`, `my_capabilities`, `my_crew_invitations`, `patch_project_settings`, `project_availability`, `project_context`, `project_progress`, `projects_progress`, `reading_memory_for_user`, `request_capability`, `respond_to_application`, `respond_to_crew_invitation`, `set_my_ui_prefs`, `set_paper_edit`, `sign_document`, `sync_script_scenes`, `tag_scene_element`, `void_signing`
- **Realtime:** `activity`, `live`, `lounge-presence`, `notes`, `presence:project`, `prod-records`, `project`, `projects:list`, `script`

### `/today`

- **Tables:** —

### `/welcome`

- **Tables:** `activity_feed`, `audit_logs`, `brief_questions`, `budget_items`, `campaigns`, `channel_members`, `channel_presets`, `channels`, `crafts`, `discord_integrations`, `jobs`, `media`, `notifications`, `profiles`, `project_beats`, `project_brief`, `project_crew`, `project_formats`, `project_tasks`, `projects`, `push_subscriptions`, `scenes`, `scripts`, `timeline_items`
- **Functions:** `advance_phase`, `can_manage_channel`, `can_post_channel`, `get_my_account`, `get_my_ui_prefs`, `has_discord_webhook`, `patch_project_settings`, `project_context`, `project_progress`, `projects_progress`, `set_my_ui_prefs`
- **Realtime:** `project`, `projects:list`

### `/api/calendar/[token]`

- **Tables:** —
- **Functions:** `calendar_feed`

### `/api/discord/notify`

- **Tables:** `channels`, `discord_integrations`, `profiles`

### `/api/discord/test`

- **Tables:** —

### `/api/links`

- **Tables:** —

### `/api/push/dispatch`

- **Tables:** `notifications`, `profiles`, `push_subscriptions`

### `/api/references/films`

- **Tables:** —

### `/api/references/search`

- **Tables:** —

### `/api/time`

- **Tables:** —

## Tables → routes

| Table | Used by |
|---|---|
| `activity_feed` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/hub`, `/admin`, `/auth/callback`, `/auth`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/studio`, `/welcome` |
| `ad_references` | `/editor`, `/studio` |
| `audit_logs` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `brand_rules` | `/editor`, `/studio` |
| `breakdown_categories` | `/editor`, `/studio` |
| `breakdown_dismissals` | `/editor`, `/studio` |
| `breakdown_elements` | `/editor`, `/studio` |
| `brief_questions` | `/admin/brief-questions`, `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects`, `/soundtrack`, `/studio`, `/welcome` |
| `budget_items` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `calendar_feeds` | `/settings` |
| `call_sheet_acks` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/community`, `/editor`, `/studio` |
| `call_sheet_calls` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/community`, `/editor`, `/studio` |
| `call_sheets` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/community`, `/editor`, `/studio` |
| `campaigns` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `capabilities` | `/call/[id]`, `/community`, `/lounge`, `/projects/[id]`, `/studio` |
| `casting_auditions` | `/editor`, `/studio` |
| `casting_history` | `/editor`, `/studio` |
| `casting_notes` | `/editor`, `/studio` |
| `change_reviews` | `/editor` |
| `channel_members` | `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome` |
| `channel_presets` | `/admin/brief-questions`, `/admin/channel-presets`, `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects`, `/soundtrack`, `/studio`, `/welcome` |
| `channels` | `/community`, `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome`, `/api/discord/notify` |
| `character_castings` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `character_media` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `characters` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `client_errors` | **no route** (server-side, triggers or functions only) |
| `craft_capabilities` | `/call/[id]`, `/community`, `/lounge`, `/projects/[id]`, `/studio` |
| `crafts` | `/b/[token]`, `/p/[token]`, `/portfolios`, `/review/[token]`, `/s/[token]`, `/shared/[token]`, `/sign/[token]`, `/u/[handle]`, `/admin/brief-questions`, `/admin/crafts`, `/call/[id]`, `/community`, `/crew`, `/jobs`, `/lounge`, `/m/[id]`, `/profile`, `/projects/[id]`, `/studio`, `/welcome` |
| `crew_capability_overrides` | `/call/[id]`, `/community`, `/lounge`, `/projects/[id]`, `/studio` |
| `deliverables` | `/editor`, `/studio` |
| `discord_integrations` | `/lounge`, `/projects/[id]`, `/projects`, `/studio`, `/welcome`, `/api/discord/notify` |
| `entities` | `/projects/[id]`, `/studio` |
| `expenses` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `guide_progress` | `/projects/[id]` |
| `hidden_messages` | **no route** (server-side, triggers or functions only) |
| `hub_incident_updates` | `/admin/hub`, `/community`, `/hub/[id]` |
| `hub_posts` | `/admin/hub`, `/community`, `/hub/[id]` |
| `hub_reads` | `/admin/hub`, `/community`, `/hub/[id]` |
| `item_versions` | `/review/[token]`, `/projects/[id]`, `/studio` |
| `job_applications` | `/jobs/[id]`, `/jobs`, `/`, `/studio` |
| `jobs` | `/p/[token]`, `/admin/hub`, `/admin`, `/auth/callback`, `/auth`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/profile`, `/projects/[id]`, `/settings`, `/studio`, `/welcome` |
| `links` | `/editor`, `/projects/[id]`, `/studio` |
| `lounge_reads` | **no route** (server-side, triggers or functions only) |
| `media` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/editor`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/studio`, `/welcome` |
| `messages` | `/community`, `/lounge`, `/`, `/projects/[id]` |
| `mood_board_items` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `mood_board_shares` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `mood_boards` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `notes` | `/editor`, `/studio` |
| `notifications` | `/p/[token]`, `/admin/hub`, `/admin`, `/auth/callback`, `/auth`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/settings`, `/studio`, `/welcome`, `/api/push/dispatch` |
| `phase_gates` | **no route** (server-side, triggers or functions only) |
| `portfolio_blocks` | `/p/[token]`, `/crew/[id]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]/pitch` |
| `portfolio_laurels` | `/p/[token]`, `/crew/[id]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]/pitch` |
| `portfolio_media` | `/p/[token]`, `/crew/[id]`, `/portfolio/manage`, `/portfolio`, `/projects/[id]/pitch` |
| `portfolio_projects` | `/p/[token]`, `/community`, `/crew/[id]`, `/lounge`, `/portfolio/manage`, `/portfolio`, `/projects/[id]`, `/projects/[id]/pitch`, `/studio` |
| `post_cuts` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `post_items` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `post_notes` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `production_records` | `/studio` |
| `profiles` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome`, `/api/discord/notify`, `/api/push/dispatch` |
| `project_audio_references` | `/editor`, `/settings`, `/soundtrack` |
| `project_beats` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `project_brief` | `/admin/brief-questions`, `/call/[id]`, `/editor`, `/lounge`, `/projects/[id]`, `/projects`, `/soundtrack`, `/studio`, `/welcome` |
| `project_crew` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `project_crew_crafts` | `/call/[id]`, `/community`, `/lounge`, `/projects/[id]`, `/studio` |
| `project_documents` | `/b/[token]`, `/shared/[token]`, `/sign/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `project_formats` | `/admin/brief-questions`, `/admin/formats`, `/call/[id]`, `/editor`, `/lounge`, `/portfolio/manage`, `/projects/[id]`, `/projects`, `/soundtrack`, `/studio`, `/welcome` |
| `project_locations` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `project_tasks` | `/community`, `/lounge`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/studio`, `/welcome` |
| `projects` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `push_subscriptions` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome`, `/api/push/dispatch` |
| `reading_corrections` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `reading_line_overrides` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `reading_memory` | **no route** (server-side, triggers or functions only) |
| `reports` | `/admin/reports`, `/crew/[id]`, `/jobs`, `/lounge` |
| `review_comments` | `/review/[token]`, `/projects/[id]`, `/studio` |
| `review_links` | `/review/[token]`, `/projects/[id]`, `/studio` |
| `scene_characters` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `scene_elements` | `/editor`, `/studio` |
| `scene_media` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `scene_states` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `scenes` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/brief-questions`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/editor`, `/lounge`, `/portfolio/manage`, `/portfolio`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `script_annotations` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/community`, `/editor`, `/lounge`, `/projects/[id]`, `/projects/[id]/pitch`, `/studio` |
| `script_characters` | `/community`, `/editor`, `/`, `/studio` |
| `script_metadata` | `/editor` |
| `script_revisions` | `/editor`, `/studio` |
| `script_stash` | `/editor` |
| `scripts` | `/p/[token]`, `/admin/brief-questions`, `/admin/hub`, `/admin`, `/auth/callback`, `/auth`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `set_log` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `sfx_assets` | `/editor`, `/settings`, `/soundtrack` |
| `shoot_days` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/community`, `/editor`, `/studio` |
| `shots` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/community`, `/editor`, `/studio` |
| `signing_requests` | `/sign/[token]`, `/studio` |
| `spotify_connections` | `/auth/spotify-callback`, `/editor`, `/soundtrack` |
| `story_interviews` | `/editor` |
| `support_case_messages` | `/admin/support`, `/hub/help/[id]`, `/hub/help` |
| `support_cases` | `/admin/support`, `/hub/help/[id]`, `/hub/help` |
| `timeline_items` | `/b/[token]`, `/p/[token]`, `/shared/[token]`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin`, `/admin/reports`, `/admin/support`, `/admin/users`, `/auth/callback`, `/auth`, `/auth/spotify-callback`, `/call/[id]`, `/call`, `/community`, `/crew/[id]`, `/crew`, `/editor`, `/hub/[id]`, `/hub/help/[id]`, `/hub/help`, `/jobs/[id]`, `/jobs`, `/lounge`, `/`, `/portfolio/manage`, `/portfolio`, `/profile`, `/projects/[id]`, `/projects/[id]/pitch`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `timesheets` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `transcript_lines` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `unavailability` | `/profile`, `/studio` |
| `vendors` | `/b/[token]`, `/shared/[token]`, `/call/[id]`, `/call`, `/editor`, `/studio` |
| `worlds` | `/projects/[id]/world`, `/studio` |
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
| `admin_count_brief_answers` | called from a route |
| `admin_hide_message` | called from a route |
| `admin_list_users` | called from a route |
| `admin_move_brief_question` | called from a route |
| `admin_platform_analytics` | called from a route |
| `admin_remove_brief_option` | called from a route |
| `admin_remove_brief_question` | called from a route |
| `admin_reported_message` | called from a route |
| `admin_set_suspended` | called from a route |
| `advance_phase` | called from a route |
| `append_to_script` | called from a route |
| `breakdown_memory` | called from a route |
| `calendar_feed` | called from a route |
| `can_manage_channel` | called from a route |
| `can_post_channel` | called from a route |
| `decide_review` | called from a route |
| `decline_signing` | called from a route |
| `delete_my_account` | called from a route |
| `edit_message` | called from a route |
| `get_my_account` | called from a route |
| `get_my_portfolio_page` | called from a route |
| `get_my_ui_prefs` | called from a route |
| `get_my_writing_prefs` | called from a route |
| `get_person_credits` | called from a route |
| `get_platform_stats` | called from a route |
| `get_portfolio_page` | called from a route |
| `get_press_kit` | called from a route |
| `get_public_showcase` | called from a route |
| `get_published_media` | called from a route |
| `get_recent_work` | called from a route |
| `get_review` | called from a route |
| `get_shared_board` | called from a route |
| `get_shared_lookbook` | called from a route |
| `get_shared_portfolio` | called from a route |
| `get_shared_project` | called from a route |
| `get_shared_script` | called from a route |
| `get_signing` | called from a route |
| `handle_new_user` | internal (policies, triggers, other functions) |
| `has_discord_webhook` | called from a route |
| `hub_case_study_project` | called from a route |
| `issue_call_sheet` | called from a route |
| `list_public_portfolios` | called from a route |
| `log_password_breach` | called from a route |
| `log_writing` | called from a route |
| `lounge_unread` | called from a route |
| `mark_lounge_read` | called from a route |
| `my_capabilities` | called from a route |
| `my_crew_invitations` | called from a route |
| `patch_project_settings` | called from a route |
| `pin_message` | called from a route |
| `project_availability` | called from a route |
| `project_context` | called from a route |
| `project_progress` | called from a route |
| `projects_progress` | called from a route |
| `reading_memory_for_user` | called from a route |
| `report_client_error` | called from a route |
| `request_capability` | called from a route |
| `respond_to_application` | called from a route |
| `respond_to_crew_invitation` | called from a route |
| `rls_auto_enable` | internal (policies, triggers, other functions) |
| `search_lounge` | called from a route |
| `search_suite` | called (outside a route graph) |
| `send_call_sheet_reminders` | internal (policies, triggers, other functions) |
| `set_my_ui_prefs` | called from a route |
| `set_paper_edit` | called from a route |
| `set_user_admin` | called from a route |
| `sign_document` | called from a route |
| `sync_script_scenes` | called from a route |
| `tag_scene_element` | called from a route |
| `toggle_message_reaction` | called from a route |
| `transfer_project` | called from a route |
| `update_updated_at` | internal (policies, triggers, other functions) |
| `update_updated_at_column` | internal (policies, triggers, other functions) |
| `void_signing` | called from a route |

## e2e specs → routes

| Spec | Opens |
|---|---|
| `accessibility.spec.ts` | `/`, `/admin`, `/admin/analytics`, `/admin/audit-logs`, `/admin/channel-presets`, `/admin/crafts`, `/admin/formats`, `/admin/reports`, `/admin/users`, `/auth`, `/crew`, `/crew/*`, `/does-not-exist`, `/editor`, `/jobs`, `/jobs/*`, `/lounge`, `/p/*`, `/portfolio`, `/portfolio/manage`, `/profile`, `/projects`, `/projects/*`, `/projects/*/pitch`, `/settings`, `/shared/*`, `/showcase`, `/soundtrack`, `/studio`, `/welcome` |
| `account-deletion.spec.ts` | `/`, `/settings` |
| `ad-export.spec.ts` | `/studio` |
| `admin-actions.spec.ts` | `/admin`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin/reports`, `/admin/support`, `/admin/users`, `/community`, `/settings`, `/somewhere` |
| `admin-channel-presets.spec.ts` | `/admin/channel-presets` |
| `admin-crafts.spec.ts` | `/admin/crafts` |
| `admin-formats.spec.ts` | `/admin/formats` |
| `admin-support-analytics.spec.ts` | `/admin`, `/admin/analytics`, `/admin/support`, `/hub/help`, `/hub/help/*` |
| `admin-sweep.spec.ts` | `/admin`, `/admin/analytics`, `/admin/audit-logs`, `/admin/brief-questions`, `/admin/channel-presets`, `/admin/crafts`, `/admin/errors`, `/admin/formats`, `/admin/hub`, `/admin/reports`, `/admin/support`, `/admin/users` |
| `announcements.spec.ts` | `/lounge`, `/projects/*` |
| `auth-journey.spec.ts` | `/auth`, `/community`, `/crew`, `/editor`, `/hub`, `/jobs`, `/lounge`, `/portfolio`, `/profile`, `/projects`, `/settings`, `/soundtrack`, `/studio`, `/welcome` |
| `auth-validation.spec.ts` | `/auth` |
| `availability.spec.ts` | `/profile`, `/studio` |
| `beat-to-script.spec.ts` | `/editor`, `/rest/v1/scripts`, `/studio` |
| `board-share.spec.ts` | `/studio` |
| `breakdown.spec.ts` | `/editor`, `/studio` |
| `brief.spec.ts` | `/jobs`, `/lounge`, `/projects/*` |
| `budget-lines.spec.ts` | `/projects/*`, `/studio` |
| `call-sheets.spec.ts` | `/call/*`, `/studio` |
| `change-impact.spec.ts` | `/studio` |
| `community-page.spec.ts` | `/auth`, `/community`, `/hub`, `/lounge`, `/studio`, `/today` |
| `community-personas.spec.ts` | `/community`, `/lounge` |
| `community-phone.spec.ts` | `/community` |
| `community.spec.ts` | `/lounge` |
| `continuity.spec.ts` | `/studio` |
| `credits.spec.ts` | `/crew/*`, `/shared/*` |
| `crew-craft.spec.ts` | `/studio` |
| `crew-invitations.spec.ts` | `/community` |
| `crew-records.spec.ts` | `/studio` |
| `cut-notes.spec.ts` | `/editor`, `/studio` |
| `daylight.spec.ts` | `/studio` |
| `director-day.spec.ts` | `/community` |
| `documents.spec.ts` | `/studio` |
| `editor-caret-after-edit.spec.ts` | `/editor`, `/studio` |
| `editor-cowriting.spec.ts` | `/editor`, `/studio` |
| `editor-find-cast.spec.ts` | `/editor`, `/studio` |
| `editor-gutter.spec.ts` | `/editor`, `/studio` |
| `editor-keyboard-reorder.spec.ts` | `/editor`, `/studio` |
| `editor-offline-merge.spec.ts` | `/community`, `/editor`, `/studio` |
| `editor-package.spec.ts` | `/studio` |
| `editor-project-script.spec.ts` | `/editor`, `/rest/v1/scripts`, `/studio` |
| `editor-safety-net.spec.ts` | `/editor`, `/studio` |
| `editor-undo.spec.ts` | `/editor`, `/studio` |
| `emphasis.spec.ts` | `/editor` |
| `errors.spec.ts` | `/admin/errors`, `/community` |
| `global-chords.spec.ts` | `/community`, `/editor`, `/split` |
| `grant-request.spec.ts` | `/studio` |
| `guides.spec.ts` | `/projects/*` |
| `hide-message.spec.ts` | `/admin/reports`, `/lounge` |
| `hiring.spec.ts` | `/jobs`, `/jobs/*`, `/studio` |
| `home-music.spec.ts` | `/community` |
| `home-page-crash.spec.ts` | `/` |
| `home-routing.spec.ts` | `/`, `/community` |
| `install.spec.ts` | `/auth`, `/community` |
| `island-activity.spec.ts` | `/editor`, `/studio` |
| `island-call.spec.ts` | `/lounge` |
| `island-compact-dock.spec.ts` | `/community` |
| `island-onset-clock.spec.ts` | `/studio`, `/today` |
| `island-projects-keys.spec.ts` | `/community` |
| `island-upload.spec.ts` | `/studio` |
| `island.spec.ts` | `/auth`, `/community`, `/lounge`, `/projects`, `/settings` |
| `keyboard-audit.spec.ts` | `/`, `/admin`, `/auth`, `/crew`, `/editor`, `/jobs`, `/jobs/*`, `/lounge`, `/portfolio`, `/profile`, `/projects`, `/projects/*`, `/settings`, `/shared/*`, `/showcase`, `/soundtrack`, `/studio`, `/welcome` |
| `layout.spec.ts` | `/community`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/projects`, `/projects/*`, `/studio` |
| `legal.spec.ts` | `/`, `/auth`, `/privacy`, `/terms` |
| `location-rename.spec.ts` | `/studio` |
| `locations.spec.ts` | `/studio` |
| `login-smoke.spec.ts` | `/auth`, `/projects` |
| `lounge.spec.ts` | `/lounge` |
| `mobile.spec.ts` | `/community`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/projects`, `/projects/*`, `/settings`, `/studio` |
| `money.spec.ts` | `/studio` |
| `mood-boards.spec.ts` | `/studio` |
| `notes.spec.ts` | `/editor`, `/studio` |
| `on-set.spec.ts` | `/studio` |
| `onboarding.spec.ts` | `/editor`, `/jobs`, `/projects`, `/welcome` |
| `onset-offline.spec.ts` | `/studio` |
| `onset-phone.spec.ts` | `/studio` |
| `page-errors.spec.ts` | `/community`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/portfolio`, `/profile`, `/projects`, `/projects/*`, `/settings`, `/soundtrack`, `/split`, `/studio` |
| `password-recovery.spec.ts` | `/auth`, `/auth/reset` |
| `performer-calls.spec.ts` | `/call`, `/studio` |
| `phases.spec.ts` | `/editor`, `/projects/*`, `/settings`, `/studio` |
| `phone-editor.spec.ts` | `/editor` |
| `phone-keyboard.spec.ts` | `/lounge`, `/settings` |
| `portfolio-page.spec.ts` | `/crew/*`, `/p/*`, `/portfolio`, `/portfolio/manage`, `/portfolios`, `/shared/*`, `/u/*`, `/u/*$` |
| `production-from-script.spec.ts` | `/editor`, `/studio` |
| `production-tools-open.spec.ts` | `/editor`, `/studio` |
| `project-manager.spec.ts` | `/projects/*`, `/projects/*/pitch`, `/studio` |
| `projects-keyboard-phase.spec.ts` | `/projects` |
| `push.spec.ts` | `/api/push/dispatch`, `/call/abc` |
| `readiness-day-date.spec.ts` | `/studio` |
| `readiness.spec.ts` | `/studio` |
| `reading-corrections.spec.ts` | `/editor`, `/studio` |
| `real-data.spec.ts` | `/`, `/studio` |
| `records-links.spec.ts` | `/studio` |
| `reports.spec.ts` | `/admin/reports`, `/jobs`, `/jobs/*` |
| `review-audiences.spec.ts` | `/review/*` |
| `role-scoped-money.spec.ts` | `/studio` |
| `route-smoke.spec.ts` | `/`, `/auth`, `/crew`, `/editor`, `/jobs`, `/lounge`, `/portfolio`, `/projects`, `/settings`, `/showcase`, `/studio`, `/this-path-does-not-exist` |
| `scene-cost.spec.ts` | `/studio` |
| `script-formats.spec.ts` | `/community`, `/studio` |
| `script-share.spec.ts` | `/editor` |
| `script-supervisor.spec.ts` | `/studio` |
| `search.spec.ts` | `/editor\\`, `/projects`, `/studio` |
| `share-pages.spec.ts` | `/m/*`, `/m/not-a-uuid`, `/p/*`, `/p/not-a-real-token` |
| `shortcut-search.spec.ts` | `/community` |
| `shot-designer.spec.ts` | `/studio` |
| `split.spec.ts` | `/auth`, `/editor`, `/p/not-a-token`, `/projects/*`, `/split`, `/studio` |
| `spotify-connect.spec.ts` | `/soundtrack` |
| `story-interview.spec.ts` | `/editor`, `/studio` |
| `studio-find-presence.spec.ts` | `/studio` |
| `studio-journey.spec.ts` | `/editor`, `/studio` |
| `studio-undo.spec.ts` | `/studio` |
| `suspend-user.spec.ts` | `/admin/audit-logs`, `/admin/users`, `/auth`, `/crew/*` |
| `table-read.spec.ts` | `/editor`, `/projects/*` |
| `themes.spec.ts` | `/projects`, `/projects/*`, `/settings` |
| `today-owner.spec.ts` | `/community` |
| `tool-find-presence.spec.ts` | `/studio` |
| `transcripts.spec.ts` | `/studio` |
| `view-as-role.spec.ts` | `/projects/*`, `/studio` |
| `view-as.spec.ts` | `/projects/*` |
| `voice-two-people.spec.ts` | `/lounge` |
| `writing-loop.spec.ts` | `/editor` |
| `your-data.spec.ts` | `/crew`, `/profile`, `/settings` |
| `your-workflow.spec.ts` | `/studio` |
