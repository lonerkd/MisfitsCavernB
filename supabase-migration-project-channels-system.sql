-- ============================================================================
-- project_channels_system — RLS + helpers for channels / channel_members /
-- discord_integrations.
--
-- This migration was originally applied directly to the live database and
-- never committed; this file was recovered from production (pg_policies /
-- pg_get_functiondef, 2026-07-09) so the repo is the source of truth again.
-- Idempotent: safe to re-run.
--
-- Recovery also surfaced and fixed a live outage: a prior migration moved
-- is_project_creator / is_project_member / can_view_channel into the
-- internal schema but left these helpers calling their old public.* names,
-- so can_view_channel / can_manage_channel / can_post_channel all raised
-- 42883 at runtime — erroring the channels SELECT policy and channel
-- message inserts. The bodies below carry the corrected internal.* refs
-- (applied to prod as migrations fix_can_post_channel_schema_reference and
-- fix_channel_helpers_internal_schema_references).
--
-- Security model:
--   view   = global channel (project_id null), project creator, project crew
--            (public channels), or explicit member (private channels)
--   post   = view + channel post_policy (viewers | members | managers)
--   manage = project creator, global-channel creator, or member with can_manage
--   discord_integrations has NO SELECT policy on purpose: webhook URLs are
--   secrets, readable only by the service-role client in
--   app/api/discord/notify/route.ts.
-- ============================================================================

-- ── Table (channels/channel_members are created in supabase-schema.sql) ─────
CREATE TABLE IF NOT EXISTS discord_integrations (
  channel_id UUID NOT NULL PRIMARY KEY REFERENCES channels(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Helper functions ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION internal.can_view_channel(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from channels c where c.id = cid and (
      c.project_id is null
      or internal.is_project_creator(c.project_id)
      or (c.is_private = false and internal.is_project_member(c.project_id))
      or (c.is_private = true and exists (select 1 from channel_members m where m.channel_id = c.id and m.user_id = auth.uid()))
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_channel(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from channels c where c.id = cid and (
      (c.project_id is not null and internal.is_project_creator(c.project_id))
      or (c.project_id is null and c.created_by = auth.uid())
      or exists (select 1 from channel_members m where m.channel_id = c.id and m.user_id = auth.uid() and m.can_manage)
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_post_channel(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select internal.can_view_channel(cid) and exists (
    select 1 from channels c where c.id = cid and (
      case c.post_policy
        when 'viewers' then true
        when 'members' then (public.can_manage_channel(cid) or exists (select 1 from channel_members m where m.channel_id = c.id and m.user_id = auth.uid() and m.can_post))
        when 'managers' then public.can_manage_channel(cid)
        else true
      end
    )
  );
$function$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_integrations ENABLE ROW LEVEL SECURITY;

-- channels (INSERT policy lives in supabase-schema.sql:
--   "channels create by project creator or crew")
DROP POLICY IF EXISTS "channels viewable" ON channels;
CREATE POLICY "channels viewable" ON channels FOR SELECT TO authenticated
  USING (internal.can_view_channel(id));
DROP POLICY IF EXISTS "channels update" ON channels;
CREATE POLICY "channels update" ON channels FOR UPDATE TO authenticated
  USING (can_manage_channel(id));
DROP POLICY IF EXISTS "channels delete" ON channels;
CREATE POLICY "channels delete" ON channels FOR DELETE TO authenticated
  USING (can_manage_channel(id));

-- channel_members
DROP POLICY IF EXISTS "channel_members viewable" ON channel_members;
CREATE POLICY "channel_members viewable" ON channel_members FOR SELECT TO authenticated
  USING (internal.can_view_channel(channel_id));
DROP POLICY IF EXISTS "channel_members manage" ON channel_members;
CREATE POLICY "channel_members manage" ON channel_members FOR ALL TO authenticated
  USING (can_manage_channel(channel_id))
  WITH CHECK (can_manage_channel(channel_id));

-- discord_integrations — deliberately no SELECT policy (see header)
DROP POLICY IF EXISTS "discord webhook set by channel managers" ON discord_integrations;
CREATE POLICY "discord webhook set by channel managers" ON discord_integrations FOR INSERT TO authenticated
  WITH CHECK (can_manage_channel(channel_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS "discord webhook updated by channel managers" ON discord_integrations;
CREATE POLICY "discord webhook updated by channel managers" ON discord_integrations FOR UPDATE TO authenticated
  USING (can_manage_channel(channel_id))
  WITH CHECK (can_manage_channel(channel_id));
DROP POLICY IF EXISTS "discord webhook removed by channel managers" ON discord_integrations;
CREATE POLICY "discord webhook removed by channel managers" ON discord_integrations FOR DELETE TO authenticated
  USING (can_manage_channel(channel_id));
