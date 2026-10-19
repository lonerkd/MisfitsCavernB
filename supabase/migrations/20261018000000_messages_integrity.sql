-- Messages: closing the gaps an audit of the Lounge's write paths found
-- (2026-10-18). The RPCs (edit_message, pin_message, toggle_message_reaction,
-- admin_hide_message) each checked their caller; the plain INSERT did not
-- check the columns those RPCs own, so a client could skip them:
--
-- 1. Insert guard. A signed-in person posting straight to the table could
--    set pinned/pinned_at/pinned_by (pin their own message in a channel only
--    its managers pin), prefill reactions in other people's names, set
--    hidden_at or edited_at, back-date created_at, keep the legacy channel_id
--    (which made a DM readable by everyone — see 3), and reply into a thread
--    in another channel. A BEFORE INSERT trigger now refuses or resets all of
--    it for direct inserts (current_user = 'authenticated'); inserts by
--    definer functions, the service role and seeds are untouched.
-- 2. Hidden messages keep their record. A sender (or channel manager) could
--    delete a message an admin hid, and the kept original went with it — the
--    evidence for the report gone. Now a hidden message, or a message with a
--    hidden reply (deleting a parent cascades to its replies), can't be
--    deleted by them. Account deletion still removes a person's DMs (it runs
--    as a definer, outside these policies).
-- 3. The read policy's legacy branch — any row with channel_id set and no
--    channel_uuid was readable by every signed-in user — is gone. Nothing in
--    the app writes or reads channel_id; the change only narrows who can read,
--    so any old row in production becomes visible to its sender and receiver
--    only, never to more people.
-- 4. toggle_message_reaction locks the row (two people reacting at once lost
--    one of the reactions), caps a message at 20 distinct reactions (each
--    person could add unlimited keys), and runs with an empty search_path.

-- ── 1. Insert guard ──────────────────────────────────────────────────────

CREATE FUNCTION internal.messages_insert_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  parent public.messages;
begin
  -- Only direct inserts from a client; definer functions run as their owner.
  if current_user <> 'authenticated' then
    return new;
  end if;
  if coalesce(new.pinned, false) or new.pinned_at is not null or new.pinned_by is not null then
    raise exception 'Pinning is done by whoever runs the channel' using errcode = '42501';
  end if;
  if coalesce(new.reactions, '{}'::jsonb) <> '{}'::jsonb then
    raise exception 'A new message starts with no reactions' using errcode = '42501';
  end if;
  if new.hidden_at is not null or new.edited_at is not null then
    raise exception 'A new message is neither edited nor hidden' using errcode = '42501';
  end if;
  if new.channel_id is not null then
    raise exception 'Messages go to a person or a channel' using errcode = '42501';
  end if;
  if new.parent_message_id is not null then
    -- Read with the caller's rights: a parent they can't see doesn't exist.
    select * into parent from public.messages where id = new.parent_message_id;
    if not found or new.channel_uuid is null or parent.channel_uuid is distinct from new.channel_uuid
       or parent.parent_message_id is not null then
      raise exception 'A reply goes under a message in the same channel' using errcode = '42501';
    end if;
  end if;
  new.pinned := false;
  new.reactions := '{}'::jsonb;
  new.created_at := now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.messages_insert_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER messages_insert_guard BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION internal.messages_insert_guard();

-- ── 2. Hidden messages keep their record ─────────────────────────────────

DROP POLICY "messages delete" ON public.messages;
CREATE POLICY "messages delete" ON public.messages FOR DELETE TO authenticated
  USING (
    hidden_at IS NULL
    AND (sender_id = (SELECT auth.uid()) OR (channel_uuid IS NOT NULL AND public.can_manage_channel(channel_uuid)))
    AND NOT EXISTS (SELECT 1 FROM public.messages r WHERE r.parent_message_id = messages.id AND r.hidden_at IS NOT NULL)
  );

-- ── 3. One read rule: yours, to you, or in a channel you can see ─────────

DROP POLICY "Channel messages readable" ON public.messages;
CREATE POLICY "messages read" ON public.messages FOR SELECT TO authenticated
  USING (
    sender_id = (SELECT auth.uid())
    OR receiver_id = (SELECT auth.uid())
    OR (channel_uuid IS NOT NULL AND internal.can_view_channel(channel_uuid))
  );

-- ── 4. Reactions ─────────────────────────────────────────────────────────

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
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_emoji is null or char_length(p_emoji) not between 1 and 16 then
    raise exception 'invalid reaction' using errcode = '22023';
  end if;
  -- Locked: two people reacting at once must both land.
  select id, channel_uuid, sender_id, receiver_id, reactions into m from public.messages where id = p_message for update;
  if not found then raise exception 'message not found' using errcode = 'P0002'; end if;
  -- Only messages the caller can see: their DMs, or a channel they can view.
  -- (IS NOT TRUE: receiver_id is null on channel messages, and NOT NULL
  -- would let everyone through.)
  if (m.sender_id::text = uid or m.receiver_id::text = uid
      or (m.channel_uuid is not null and internal.can_view_channel(m.channel_uuid))) is not true then
    raise exception 'not permitted' using errcode = '42501';
  end if;

  r := coalesce(m.reactions, '{}'::jsonb);
  arr := coalesce(r -> p_emoji, '[]'::jsonb);
  if arr @> to_jsonb(uid) then
    arr := (select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) from jsonb_array_elements_text(arr) e where e <> uid);
    if jsonb_array_length(arr) = 0 then r := r - p_emoji; else r := jsonb_set(r, array[p_emoji], arr); end if;
  else
    if not (r ? p_emoji) and (select count(*) from jsonb_object_keys(r)) >= 20 then
      raise exception 'A message has room for 20 different reactions' using errcode = '22023';
    end if;
    arr := arr || to_jsonb(uid);
    r := jsonb_set(r, array[p_emoji], arr, true);
  end if;

  update public.messages set reactions = r where id = p_message;
  return r;
end;
$function$;
