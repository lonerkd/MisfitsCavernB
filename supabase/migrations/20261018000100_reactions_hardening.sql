-- Reactions: close the ways around toggle_message_reaction.
--
-- 1. Forged reactions. "messages send" never looked at the row's reaction,
--    pin or edit columns, so a sender could INSERT a message that already
--    carried {"👍": [<someone else's id>]} (or arrive pinned/edited). Those
--    columns are now only ever written by the RPCs: a new message starts
--    with none.
-- 2. Lost updates. toggle_message_reaction read the JSON, changed it in
--    memory and wrote it back with no lock, so two people reacting at once
--    could erase one of the reactions. The row is now locked first.
-- 3. Visibility. Being the sender or receiver was enough to react even for a
--    channel message, so someone removed from a private channel could still
--    write into messages there. A channel message needs can_view_channel
--    now; a direct message needs to be one of its two people.
-- 4. A cap of 20 distinct emoji per message, so the JSON cannot be grown
--    without limit.

DROP POLICY "messages send" ON public.messages;
CREATE POLICY "messages send" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (
      (receiver_id IS NOT NULL AND channel_uuid IS NULL)
      OR (receiver_id IS NULL AND channel_uuid IS NOT NULL AND public.can_post_channel(channel_uuid))
    )
    AND coalesce(reactions, '{}'::jsonb) = '{}'::jsonb
    AND NOT pinned
    AND pinned_by IS NULL
    AND edited_at IS NULL
  );

CREATE OR REPLACE FUNCTION public.toggle_message_reaction(p_message uuid, p_emoji text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid text := (select auth.uid())::text;
  r jsonb;
  arr jsonb;
  m record;
  allowed boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_emoji is null or char_length(p_emoji) not between 1 and 16 then raise exception 'invalid reaction'; end if;
  -- Lock the row: concurrent reactions queue up instead of overwriting each other.
  select id, channel_uuid, sender_id, receiver_id, reactions into m
    from public.messages where id = p_message for update;
  if not found then raise exception 'message not found'; end if;
  if m.channel_uuid is not null then
    allowed := internal.can_view_channel(m.channel_uuid);
  else
    allowed := (m.sender_id::text = uid or m.receiver_id::text = uid);
  end if;
  if allowed is not true then raise exception 'not permitted'; end if;

  r := coalesce(m.reactions, '{}'::jsonb);
  arr := coalesce(r -> p_emoji, '[]'::jsonb);
  if arr @> to_jsonb(uid) then
    arr := (select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) from jsonb_array_elements_text(arr) e where e <> uid);
    if jsonb_array_length(arr) = 0 then r := r - p_emoji; else r := jsonb_set(r, array[p_emoji], arr); end if;
  else
    if not (r ? p_emoji) and (select count(*) from jsonb_object_keys(r)) >= 20 then
      raise exception 'too many different reactions';
    end if;
    arr := arr || to_jsonb(uid);
    r := jsonb_set(r, array[p_emoji], arr, true);
  end if;

  update public.messages set reactions = r where id = p_message;
  return r;
end;
$function$;
REVOKE ALL ON FUNCTION public.toggle_message_reaction(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) TO authenticated;
