--
--
--
-- Security model:
--            (public channels), or explicit member (private channels)
--   secrets, readable only by the service-role client in

CREATE TABLE IF NOT EXISTS discord_integrations (
  channel_id UUID NOT NULL PRIMARY KEY REFERENCES channels(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
