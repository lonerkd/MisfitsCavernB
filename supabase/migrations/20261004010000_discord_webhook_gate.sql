-- has_discord_webhook answered for any channel to any signed-in user (a
-- yes/no, but ungated — found in the definer-function review,
-- .cavern-intelligence/database-and-security.md §2.D). It now answers only
-- for someone who can manage the channel — the only people who can set or
-- remove its webhook, and the only caller (the channel-manage dialog).
-- Same signature and grants; only the body changes.
CREATE OR REPLACE FUNCTION public.has_discord_webhook(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.can_manage_channel(cid)
     AND EXISTS (SELECT 1 FROM discord_integrations WHERE channel_id = cid);
$function$;
