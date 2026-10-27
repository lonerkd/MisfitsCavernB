-- Versions and the guest review link (spec: .cavern-intelligence/plans/2026-10-27-guest-review-and-phases.md, D1).
--
--   item_versions    a numbered, immutable snapshot of a project script, sent
--                    for review. The snapshot is taken by the database, never
--                    supplied by the client. Clients may only set label, send
--                    (draft -> sent) and, as a shaper, confirm; the guest's
--                    decision columns are written by the RPCs alone.
--   review_links     a link a client holds (no account): which versions it
--                    shows, until when, and whether it is revoked.
--   review_comments  a team member's comment (author_id) or a guest's
--                    (guest_name); guests write only through add_review_comment.
--   get_review / add_review_comment / decide_review   the only door for a guest.
--                    SECURITY DEFINER, exact token, no table access for anon.

CREATE TABLE public.item_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  number integer NOT NULL DEFAULT 0,
  label text NOT NULL DEFAULT '' CHECK (char_length(label) <= 120),
  snapshot text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  sent_at timestamptz,
  guest_decision text CHECK (guest_decision IN ('approved', 'changes_requested')),
  guest_decided_at timestamptz,
  guest_name text,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (script_id, number),
  UNIQUE (id, project_id)
);
CREATE INDEX item_versions_project_idx ON public.item_versions (project_id, created_at DESC);
CREATE INDEX item_versions_created_by_idx ON public.item_versions (created_by);
CREATE INDEX item_versions_confirmed_by_idx ON public.item_versions (confirmed_by);

ALTER TABLE public.item_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions read" ON public.item_versions FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
-- Anyone on the project may propose a version; the trigger fills the rest.
CREATE POLICY "versions insert" ON public.item_versions FOR INSERT TO authenticated
  WITH CHECK (internal.can_access_project(project_id) AND created_by = (select auth.uid()));
-- Only someone who shapes the project sends or confirms (and may relabel).
CREATE POLICY "versions update" ON public.item_versions FOR UPDATE TO authenticated
  USING (internal.can_shape_project(project_id)) WITH CHECK (internal.can_shape_project(project_id));
CREATE POLICY "versions delete" ON public.item_versions FOR DELETE TO authenticated
  USING (internal.can_shape_project(project_id) AND status = 'draft');

REVOKE ALL ON public.item_versions FROM anon, authenticated;
GRANT SELECT, DELETE ON public.item_versions TO authenticated;
GRANT INSERT (project_id, script_id, label) ON public.item_versions TO authenticated;
GRANT UPDATE (label, status, confirmed_at, confirmed_by) ON public.item_versions TO authenticated;

-- Number and snapshot are the database's. Invoker: it reads the script under the caller's own access.
CREATE FUNCTION internal.item_versions_prepare()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  s record;
begin
  select content, project_id into s from public.scripts where id = new.script_id;
  if not found or s.project_id is distinct from new.project_id then
    raise exception 'That script is not in this project' using errcode = '23514';
  end if;
  new.number := coalesce((select max(number) from public.item_versions where script_id = new.script_id), 0) + 1;
  new.snapshot := coalesce(s.content, '');
  new.status := 'draft';
  new.sent_at := null;
  new.guest_decision := null;
  new.guest_decided_at := null;
  new.guest_name := null;
  new.confirmed_at := null;
  new.confirmed_by := null;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.item_versions_prepare() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER item_versions_prepare BEFORE INSERT ON public.item_versions
  FOR EACH ROW EXECUTE FUNCTION internal.item_versions_prepare();

-- What was sent stays what was sent: the snapshot, number and script never change;
-- a version only moves draft -> sent; it is confirmed only after a guest decided.
CREATE FUNCTION internal.item_versions_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.snapshot is distinct from old.snapshot or new.number is distinct from old.number
     or new.script_id is distinct from old.script_id or new.project_id is distinct from old.project_id
     or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'A version cannot be rewritten' using errcode = '23514';
  end if;
  if new.status is distinct from old.status then
    if not (old.status = 'draft' and new.status = 'sent') then
      raise exception 'A version can only go from draft to sent' using errcode = '23514';
    end if;
    new.sent_at := now();
  end if;
  if new.confirmed_at is distinct from old.confirmed_at or new.confirmed_by is distinct from old.confirmed_by then
    if new.confirmed_at is not null and old.guest_decision is null then
      raise exception 'Nothing to confirm yet: the client has not decided' using errcode = '23514';
    end if;
    if new.confirmed_at is not null then
      new.confirmed_by := (select auth.uid());
      new.confirmed_at := now();
    else
      new.confirmed_by := null;
    end if;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.item_versions_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER item_versions_guard BEFORE UPDATE ON public.item_versions
  FOR EACH ROW EXECUTE FUNCTION internal.item_versions_guard();

CREATE TABLE public.review_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') CHECK (char_length(token) >= 32),
  layer text NOT NULL DEFAULT 'guest' CHECK (layer IN ('guest', 'investor')),
  label text NOT NULL DEFAULT '' CHECK (char_length(label) <= 120),
  version_ids uuid[] NOT NULL CHECK (cardinality(version_ids) BETWEEN 1 AND 50),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id)
);
CREATE INDEX review_links_project_idx ON public.review_links (project_id);
CREATE INDEX review_links_created_by_idx ON public.review_links (created_by);

ALTER TABLE public.review_links ENABLE ROW LEVEL SECURITY;
-- The token is a credential: only people who shape the project can see or make links.
CREATE POLICY "review links read" ON public.review_links FOR SELECT TO authenticated
  USING (internal.can_shape_project(project_id));
CREATE POLICY "review links insert" ON public.review_links FOR INSERT TO authenticated
  WITH CHECK (internal.can_shape_project(project_id) AND created_by = (select auth.uid()));
CREATE POLICY "review links update" ON public.review_links FOR UPDATE TO authenticated
  USING (internal.can_shape_project(project_id)) WITH CHECK (internal.can_shape_project(project_id));
CREATE POLICY "review links delete" ON public.review_links FOR DELETE TO authenticated
  USING (internal.can_shape_project(project_id));

REVOKE ALL ON public.review_links FROM anon, authenticated;
GRANT SELECT, DELETE ON public.review_links TO authenticated;
GRANT INSERT (project_id, layer, label, version_ids, expires_at) ON public.review_links TO authenticated;
GRANT UPDATE (label, expires_at, revoked_at) ON public.review_links TO authenticated;

-- A link may name only sent versions of its own project.
CREATE FUNCTION internal.review_links_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1 from unnest(new.version_ids) as v(id)
    where not exists (select 1 from public.item_versions i where i.id = v.id and i.project_id = new.project_id and i.status = 'sent')
  ) then
    raise exception 'A review link can only show versions that have been sent, from this project' using errcode = '23514';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.review_links_check() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER review_links_check BEFORE INSERT ON public.review_links
  FOR EACH ROW EXECUTE FUNCTION internal.review_links_check();

CREATE TABLE public.review_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id uuid NOT NULL REFERENCES public.item_versions(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.review_links(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  guest_name text CHECK (guest_name IS NULL OR char_length(btrim(guest_name)) BETWEEN 1 AND 80),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_comments_one_author CHECK ((guest_name IS NULL) OR (author_id IS NULL))
);
CREATE INDEX review_comments_version_idx ON public.review_comments (version_id, created_at);
CREATE INDEX review_comments_link_idx ON public.review_comments (link_id);
CREATE INDEX review_comments_author_idx ON public.review_comments (author_id);

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
-- Readable with the version: the subquery runs under the caller's item_versions policy.
CREATE POLICY "review comments read" ON public.review_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.item_versions v WHERE v.id = version_id));
CREATE POLICY "review comments insert" ON public.review_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = (select auth.uid()) AND guest_name IS NULL AND link_id IS NULL
    AND EXISTS (SELECT 1 FROM public.item_versions v WHERE v.id = version_id AND v.status = 'sent'));

REVOKE ALL ON public.review_comments FROM anon, authenticated;
GRANT SELECT ON public.review_comments TO authenticated;
GRANT INSERT (version_id, body) ON public.review_comments TO authenticated;

-- ── The guest's door ─────────────────────────────────────────────────────

-- The link, if it is live: right token, not revoked, not expired. Nothing else is revealed about why not.
CREATE FUNCTION internal.live_review_link(p_token text)
 RETURNS public.review_links
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.* from public.review_links l
  where coalesce(p_token, '') <> '' and l.token = p_token
    and l.revoked_at is null and (l.expires_at is null or l.expires_at > now());
$function$;
REVOKE ALL ON FUNCTION internal.live_review_link(text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_review(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.review_links;
begin
  l := internal.live_review_link(p_token);
  if l.id is null then return null; end if;
  return jsonb_build_object(
    'layer', l.layer,
    'label', l.label,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'number', v.number,
        'label', v.label,
        'script_title', s.title,
        'snapshot', v.snapshot,
        'sent_at', v.sent_at,
        'decision', v.guest_decision,
        'decided_at', v.guest_decided_at,
        'decided_by', v.guest_name,
        'comments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'name', coalesce(c.guest_name, (select p.username from public.profiles p where p.id = c.author_id), 'The team'),
            'from_team', c.author_id is not null,
            'body', c.body,
            'at', c.created_at) order by c.created_at)
          from public.review_comments c where c.version_id = v.id), '[]'::jsonb)
      ) order by v.script_id, v.number)
      from public.item_versions v join public.scripts s on s.id = v.script_id
      where v.id = any (l.version_ids) and v.status = 'sent'), '[]'::jsonb));
end;
$function$;
REVOKE ALL ON FUNCTION public.get_review(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review(text) TO anon, authenticated, service_role;

-- Tells the people who made the version and the project's owner. Definer: the guest has no account.
CREATE FUNCTION internal.notify_review(p_project uuid, p_version uuid, p_title text, p_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select distinct u.id, 'review', left(p_title, 200), left(p_body, 280), '/studio'
  from (
    select created_by as id from public.item_versions where id = p_version
    union
    select creator_id from public.projects where id = p_project
  ) u
  where u.id is not null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.notify_review(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.add_review_comment(p_token text, p_version uuid, p_name text, p_body text)
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
REVOKE ALL ON FUNCTION public.add_review_comment(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_review_comment(text, uuid, text, text) TO anon, authenticated, service_role;

CREATE FUNCTION public.decide_review(p_token text, p_version uuid, p_decision text, p_name text, p_note text DEFAULT NULL)
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
REVOKE ALL ON FUNCTION public.decide_review(text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_review(text, uuid, text, text, text) TO anon, authenticated, service_role;
