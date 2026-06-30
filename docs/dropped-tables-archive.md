# Archived (dropped) tables — 2026-06-29

These 37 tables were removed from the Supabase project ("The Cavern") because
they were **unused, empty (0 rows), and FK-isolated from the live 14-route app**.

They belonged to an earlier `text`-id prototype data model (note `users` carries
`password_hash`, `discord_*`, `spotify_*`) that was superseded by the current
Supabase-auth + UUID model (`profiles`, `projects`, `messages`, …). None were
referenced anywhere in the application code.

## Dropped
Abandoned `users`-based model: `users`, `crew_profiles`, `crew_reviews`,
`portfolio_items`, `project_crew_members`, `social_links`, `follows`, `likes`,
`comments`, `notification_preferences`, `notification_behaviors`, `api_keys`.

Unused RBAC system: `roles`, `permissions`, `role_permissions`,
`resource_permissions`, `user_roles`, `access_controls`, `permission_audit_logs`.

Abandoned tangents: `script_translations`, `translation_memory`,
`translation_glossary`, `translator_comments` (translation); `voice_channels`,
`voice_participants` (voice chat); `marketplace_listings`,
`marketplace_transactions` (marketplace); `contests`, `submissions`;
`ndas`, `nda_signatures`; `vault_assets`, `vault_asset_versions`;
`watermark_configs`; `message_reactions` (reacted to the unused chat_messages,
not the live `messages`); `activities` (duplicate of `activity_feed`);
`_mcp_test` (test artifact).

## Kept (genuine scaffolding for planned film-production features)
`characters`, `locations`, `mood_boards`, `board_items`, `color_palettes`,
`storyboards`, `storyboard_frames`, `call_sheets`, `share_links` — these extend
existing routes (editor, studio, projects, portfolio sharing) and remain in
their secure RLS-enabled state awaiting policies when the features are built.

Column snapshots of the dropped tables are preserved in git history of this
commit's parent if recreation is ever needed.
