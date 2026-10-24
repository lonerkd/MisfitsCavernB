-- A parent message that has hidden replies cannot be deleted: the hidden
-- record is evidence of a moderation action. Enforcing this in the policy's
-- USING clause via a self-referential NOT EXISTS caused planner confusion;
-- a BEFORE DELETE trigger is clearer and avoids the self-referential query.

CREATE OR REPLACE FUNCTION internal.messages_delete_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1 from public.messages r
    where r.parent_message_id = old.id and r.hidden_at is not null
  ) then
    raise exception 'Cannot delete a message that has hidden replies' using errcode = '42501';
  end if;
  return old;
end;
$function$;
REVOKE ALL ON FUNCTION internal.messages_delete_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER messages_delete_guard
  BEFORE DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION internal.messages_delete_guard();

-- Simplify the delete policy: the hidden-reply guard is now in the trigger.
DROP POLICY "messages delete" ON public.messages;
CREATE POLICY "messages delete" ON public.messages FOR DELETE TO authenticated
  USING (
    hidden_at IS NULL
    AND (sender_id = (SELECT auth.uid()) OR (channel_uuid IS NOT NULL AND public.can_manage_channel(channel_uuid)))
  );
