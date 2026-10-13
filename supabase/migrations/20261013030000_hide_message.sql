-- Acting on a report about a message: a platform admin can read what was
-- reported, hide it (everyone then reads a notice, never the words) and bring
-- it back. The original is kept for admins only, in its own table, so hiding
-- never leaks it and never loses it. Recorded in the audit log.

ALTER TABLE public.messages ADD COLUMN hidden_at timestamp with time zone;

CREATE TABLE public.hidden_messages (
  message_id uuid NOT NULL,
  original text NOT NULL,
  hidden_by uuid,
  hidden_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT hidden_messages_pkey PRIMARY KEY (message_id),
  CONSTRAINT hidden_messages_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
  CONSTRAINT hidden_messages_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.hidden_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hidden_messages admin read" ON public.hidden_messages FOR SELECT TO authenticated
  USING (internal.caller_is_admin());
GRANT SELECT ON public.hidden_messages TO authenticated;
REVOKE ALL ON public.hidden_messages FROM anon;

-- What an admin reads when a message has been reported: the words, even in a
-- channel they are not in — but only a message someone reported.
CREATE FUNCTION public.admin_reported_message(p_report uuid)
 RETURNS TABLE(content text, sender_id uuid, channel_uuid uuid, created_at timestamp with time zone, hidden boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  return query
    select coalesce(h.original, m.content), m.sender_id, m.channel_uuid, m.created_at, m.hidden_at is not null
    from public.reports r
    join public.messages m on m.id = r.target_id
    left join public.hidden_messages h on h.message_id = m.id
    where r.id = p_report and r.kind = 'message';
  if not found then
    raise exception 'No such reported message' using errcode = 'P0002';
  end if;
end;
$function$;

-- Hide a message (its words are replaced by a notice and kept in hidden_messages),
-- or bring it back.
CREATE FUNCTION public.admin_hide_message(p_message uuid, p_hidden boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.messages;
  me uuid := (select auth.uid());
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  select * into m from public.messages where id = p_message for update;
  if not found then
    raise exception 'No such message' using errcode = 'P0002';
  end if;
  if p_hidden and m.hidden_at is null then
    insert into public.hidden_messages (message_id, original, hidden_by) values (m.id, m.content, me);
    update public.messages set content = '[Removed by an admin]', hidden_at = now() where id = m.id;
  elsif not p_hidden and m.hidden_at is not null then
    update public.messages set content = (select original from public.hidden_messages where message_id = m.id), hidden_at = null where id = m.id;
    delete from public.hidden_messages where message_id = m.id;
  else
    return;
  end if;
  insert into public.audit_logs (user_id, action, resource_type, resource_id)
    values (me, case when p_hidden then 'admin_hide_message' else 'admin_unhide_message' end, 'message', m.id);
end;
$function$;

-- A hidden message stays hidden: its sender cannot edit the notice into something else.
CREATE OR REPLACE FUNCTION public.edit_message(p_message uuid, p_content text)
 RETURNS messages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.messages;
  me uuid := (select auth.uid());
  body text := btrim(coalesce(p_content, ''));
begin
  select * into m from public.messages where id = p_message for update;
  if not found or me is null or m.sender_id is distinct from me then
    raise exception 'You can only edit your own messages' using errcode = '42501';
  end if;
  if m.hidden_at is not null then
    raise exception 'An admin removed this message' using errcode = '42501';
  end if;
  if m.channel_uuid is not null and not public.can_post_channel(m.channel_uuid) then
    raise exception 'You can no longer post in this channel' using errcode = '42501';
  end if;
  if char_length(body) = 0 or char_length(body) > 4000 then
    raise exception 'A message is 1 to 4000 characters' using errcode = '22023';
  end if;
  if body = m.content then
    return m;
  end if;
  update public.messages set content = body, edited_at = now() where id = m.id returning * into m;
  return m;
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_reported_message(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_hide_message(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reported_message(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_hide_message(uuid, boolean) TO authenticated, service_role;
