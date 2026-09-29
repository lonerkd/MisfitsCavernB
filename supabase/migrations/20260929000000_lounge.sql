-- The Lounge: editing, pinning, unread and search.
--
-- Editing: a sender can reword their own message while they can still post
-- where it lives; it's marked edited. Pinning: whoever runs a channel (or
-- either side of a direct conversation) pins a message so it stays findable.
-- Both go through RPCs — messages still has no UPDATE policy, so nothing else
-- about a message (sender, channel, reactions) can be rewritten from a client.
--
-- Unread: lounge_reads keeps, per person, when they last read each channel or
-- each direct conversation; lounge_unread() counts what arrived since (from
-- other people). A channel never opened counts its last week.
--
-- Search: search_lounge() matches words (and word starts) across every
-- message the caller can read — it runs with the caller's rights, so the
-- messages policy decides what comes back.

ALTER TABLE public.messages
  ADD COLUMN edited_at timestamp with time zone,
  ADD COLUMN pinned_at timestamp with time zone,
  ADD COLUMN pinned_by uuid;
UPDATE public.messages SET pinned_at = created_at WHERE pinned AND pinned_at IS NULL;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_pinned_by_fkey FOREIGN KEY (pinned_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT messages_pin_shape CHECK (pinned = (pinned_at IS NOT NULL)),
  ADD CONSTRAINT messages_content_len CHECK (char_length(btrim(content)) BETWEEN 1 AND 4000);
CREATE INDEX messages_channel_created_idx ON public.messages USING btree (channel_uuid, created_at);
CREATE INDEX messages_pinned_idx ON public.messages USING btree (channel_uuid) WHERE pinned;
CREATE INDEX messages_content_search_idx ON public.messages USING gin (to_tsvector('simple'::regconfig, content));

-- ── Editing ──────────────────────────────────────────────────────────────

CREATE FUNCTION public.edit_message(p_message uuid, p_content text)
 RETURNS public.messages
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
REVOKE ALL ON FUNCTION public.edit_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_message(uuid, text) TO authenticated;

-- ── Pinning ──────────────────────────────────────────────────────────────

CREATE FUNCTION public.pin_message(p_message uuid, p_pinned boolean)
 RETURNS public.messages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.messages;
  me uuid := (select auth.uid());
begin
  select * into m from public.messages where id = p_message for update;
  if not found or me is null then
    raise exception 'Message not found' using errcode = 'P0002';
  end if;
  if m.channel_uuid is not null then
    if not public.can_manage_channel(m.channel_uuid) then
      raise exception 'Only whoever runs this channel can pin' using errcode = '42501';
    end if;
  elsif m.receiver_id is null or me not in (m.sender_id, m.receiver_id) then
    raise exception 'Message not found' using errcode = 'P0002';
  end if;
  if m.pinned = coalesce(p_pinned, false) then
    return m;
  end if;
  if p_pinned then
    update public.messages set pinned = true, pinned_at = now(), pinned_by = me where id = m.id returning * into m;
  else
    update public.messages set pinned = false, pinned_at = null, pinned_by = null where id = m.id returning * into m;
  end if;
  return m;
end;
$function$;
REVOKE ALL ON FUNCTION public.pin_message(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pin_message(uuid, boolean) TO authenticated;

-- ── Unread ───────────────────────────────────────────────────────────────

CREATE TABLE public.lounge_reads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  channel_id uuid,
  partner_id uuid,
  last_read_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT lounge_reads_pkey PRIMARY KEY (id),
  CONSTRAINT lounge_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT lounge_reads_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE,
  CONSTRAINT lounge_reads_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT lounge_reads_one_target CHECK ((channel_id IS NULL) <> (partner_id IS NULL))
);
CREATE UNIQUE INDEX lounge_reads_channel_key ON public.lounge_reads USING btree (user_id, channel_id) WHERE channel_id IS NOT NULL;
CREATE UNIQUE INDEX lounge_reads_partner_key ON public.lounge_reads USING btree (user_id, partner_id) WHERE partner_id IS NOT NULL;
ALTER TABLE public.lounge_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lounge_reads own" ON public.lounge_reads FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
GRANT SELECT ON public.lounge_reads TO authenticated;
REVOKE ALL ON public.lounge_reads FROM anon;

-- Marks a channel (or a direct conversation) read up to now.
CREATE FUNCTION public.mark_lounge_read(p_channel uuid DEFAULT NULL, p_partner uuid DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := (select auth.uid());
begin
  if me is null or ((p_channel is null) = (p_partner is null)) then
    raise exception 'Name one channel or one person' using errcode = '22023';
  end if;
  if p_channel is not null then
    if not internal.can_view_channel(p_channel) then
      raise exception 'Channel not found' using errcode = 'P0002';
    end if;
    insert into public.lounge_reads (user_id, channel_id, last_read_at) values (me, p_channel, now())
    on conflict (user_id, channel_id) where channel_id is not null do update set last_read_at = excluded.last_read_at;
  else
    if not exists (select 1 from public.profiles where id = p_partner) then
      raise exception 'Person not found' using errcode = 'P0002';
    end if;
    insert into public.lounge_reads (user_id, partner_id, last_read_at) values (me, p_partner, now())
    on conflict (user_id, partner_id) where partner_id is not null do update set last_read_at = excluded.last_read_at;
  end if;
end;
$function$;
REVOKE ALL ON FUNCTION public.mark_lounge_read(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_lounge_read(uuid, uuid) TO authenticated;

-- What's new for the caller: per channel they can see and per person who
-- wrote to them, messages from others since they last read (at most 100).
CREATE FUNCTION public.lounge_unread()
 RETURNS TABLE(channel_id uuid, partner_id uuid, unread integer, last_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with me as (select (select auth.uid()) as id),
  seen as (
    select c.id, coalesce(r.last_read_at, now() - interval '7 days') as since
      from public.channels c
      cross join me
      left join public.lounge_reads r on r.user_id = me.id and r.channel_id = c.id
     where me.id is not null and c.type <> 'voice' and internal.can_view_channel(c.id)
  )
  select s.id, null::uuid, n.unread, n.last_at
    from seen s
    cross join me
    cross join lateral (
      select count(*)::int as unread, max(x.created_at) as last_at
        from (select m.created_at from public.messages m
               where m.channel_uuid = s.id and m.created_at > s.since and m.sender_id <> me.id
               order by m.created_at desc limit 100) x
    ) n
   where n.unread > 0
  union all
  select null::uuid, d.sender_id, count(*)::int, max(d.created_at)
    from me
    join public.messages d on d.receiver_id = me.id
    left join public.lounge_reads r on r.user_id = me.id and r.partner_id = d.sender_id
   where d.created_at > coalesce(r.last_read_at, now() - interval '7 days')
   group by d.sender_id;
$function$;
REVOKE ALL ON FUNCTION public.lounge_unread() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lounge_unread() TO authenticated;

-- ── Search ───────────────────────────────────────────────────────────────

-- Every word must match (the last may be a start: "call sh" finds "call
-- sheet"). Optionally within one channel. Newest first.
CREATE FUNCTION public.search_lounge(p_query text, p_channel uuid DEFAULT NULL, p_limit integer DEFAULT 40)
 RETURNS TABLE(id uuid, content text, created_at timestamp with time zone, sender_id uuid, sender text,
               channel_uuid uuid, channel_name text, project_id uuid, parent_message_id uuid, receiver_id uuid)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with words as (
    select string_agg(w || ':*', ' & ') as tq
      from (select regexp_replace(lower(t), '[^[:alnum:]]+', '', 'g') as w
              from regexp_split_to_table(btrim(coalesce(p_query, '')), '\s+') t) s
     where w <> ''
  )
  select m.id, m.content, m.created_at, m.sender_id, p.username, m.channel_uuid, c.name, c.project_id, m.parent_message_id, m.receiver_id
    from words
    join public.messages m on to_tsvector('simple'::regconfig, m.content) @@ to_tsquery('simple'::regconfig, words.tq)
    left join public.profiles p on p.id = m.sender_id
    left join public.channels c on c.id = m.channel_uuid
   where words.tq is not null
     and (p_channel is null or m.channel_uuid = p_channel)
     and (m.channel_uuid is not null or m.receiver_id is not null)
   order by m.created_at desc
   limit least(greatest(coalesce(p_limit, 40), 1), 100);
$function$;
REVOKE ALL ON FUNCTION public.search_lounge(text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_lounge(text, uuid, integer) TO authenticated;
