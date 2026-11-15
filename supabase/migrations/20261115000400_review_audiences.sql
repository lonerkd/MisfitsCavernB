-- Review links by audience (role suites, the outside roles). A link now says who it is for, and the database holds each audience to
-- what it may do: the client (`guest`) reads, comments and decides; an `investor` and a `distributor` read and comment but cannot
-- approve (approval is the client's); `press` reads only. The layer was always on the link (and 'investor' allowed) but nothing
-- distinguished the audiences: an investor link could approve a version. Existing links are all 'guest' and behave as before.
-- CREATE OR REPLACE keeps each function's grants.

ALTER TABLE public.review_links DROP CONSTRAINT review_links_layer_check;
ALTER TABLE public.review_links ADD CONSTRAINT review_links_layer_check CHECK (layer IN ('guest', 'investor', 'distributor', 'press'));

CREATE OR REPLACE FUNCTION public.add_review_comment(p_token text, p_version uuid, p_name text, p_body text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.review_links;
  v public.item_versions;
  name_ text := btrim(coalesce(p_name, ''));
  body_ text := btrim(coalesce(p_body, ''));
begin
  l := internal.live_review_link(p_token);
  if l.id is null or not (p_version = any (l.version_ids)) then return false; end if;
  -- Press reads only.
  if l.layer = 'press' then return false; end if;
  if char_length(name_) not between 1 and 80 or char_length(body_) not between 1 and 2000 then return false; end if;
  select * into v from public.item_versions where id = p_version and status = 'sent';
  if v.id is null then return false; end if;
  -- A leaked link can't be used to flood: at most 200 comments per link.
  if (select count(*) from public.review_comments where link_id = l.id) >= 200 then return false; end if;
  insert into public.review_comments (version_id, link_id, author_id, guest_name, body)
  values (v.id, l.id, null, name_, body_);
  perform internal.notify_review(v.project_id, v.id, 'New comment on version ' || v.number, name_ || ': ' || body_);
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.decide_review(p_token text, p_version uuid, p_decision text, p_name text, p_note text DEFAULT NULL)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.review_links;
  v public.item_versions;
  name_ text := btrim(coalesce(p_name, ''));
  note_ text := btrim(coalesce(p_note, ''));
begin
  l := internal.live_review_link(p_token);
  if l.id is null or not (p_version = any (l.version_ids)) then return false; end if;
  -- Only the client decides: an investor, a distributor or the press may read (and, but for the press, comment).
  if l.layer <> 'guest' then return false; end if;
  if p_decision not in ('approved', 'changes_requested') then return false; end if;
  if char_length(name_) not between 1 and 80 or char_length(note_) > 2000 then return false; end if;
  select * into v from public.item_versions where id = p_version and status = 'sent';
  if v.id is null then return false; end if;
  -- A decision the team has already confirmed is closed.
  if v.confirmed_at is not null then return false; end if;
  update public.item_versions
     set guest_decision = p_decision, guest_decided_at = now(), guest_name = name_
   where id = v.id;
  if note_ <> '' and (select count(*) from public.review_comments where link_id = l.id) < 200 then
    insert into public.review_comments (version_id, link_id, author_id, guest_name, body)
    values (v.id, l.id, null, name_, note_);
  end if;
  perform internal.notify_review(v.project_id, v.id,
    case p_decision when 'approved' then 'Version ' || v.number || ' approved' else 'Changes requested on version ' || v.number end,
    name_ || coalesce(': ' || nullif(note_, ''), ''));
  return true;
end;
$function$;
