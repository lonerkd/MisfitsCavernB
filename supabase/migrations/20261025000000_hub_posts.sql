-- The hub: Misfits Cavern's newsletter inside the suite (plan:
-- .cavern-intelligence/plans/2026-10-25-lounge-overhaul.md, slice L1).
--
--   hub_posts   What's new (kind 'update') and Learn (kind 'guide') posts, each
--               for an audience. A post with no published_at is a draft. Every
--               signed-in person reads published posts; only admins see drafts
--               and write.
--   hub_reads   who has opened which post (the "new" badge). Each person sees
--               and writes only their own rows.
--   publishing  a post that becomes published while marked important sends one
--               notification to every account — and so a push, through the
--               existing notifications → Web Push path.

CREATE TABLE public.hub_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL DEFAULT 'update' CHECK (kind IN ('update', 'guide')),
  audience text NOT NULL DEFAULT 'everyone' CHECK (audience IN ('everyone', 'developers', 'filmmakers', 'buyers', 'investors')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 50000),
  cover_url text CHECK (cover_url IS NULL OR cover_url ~ '^https://'),
  important boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hub_posts_published_idx ON public.hub_posts (published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX hub_posts_created_by_idx ON public.hub_posts (created_by);

ALTER TABLE public.hub_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub posts read" ON public.hub_posts FOR SELECT TO authenticated
  USING ((published_at IS NOT NULL AND published_at <= now()) OR internal.caller_is_admin());
CREATE POLICY "hub posts insert" ON public.hub_posts FOR INSERT TO authenticated
  WITH CHECK (internal.caller_is_admin());
CREATE POLICY "hub posts update" ON public.hub_posts FOR UPDATE TO authenticated
  USING (internal.caller_is_admin()) WITH CHECK (internal.caller_is_admin());
CREATE POLICY "hub posts delete" ON public.hub_posts FOR DELETE TO authenticated
  USING (internal.caller_is_admin());

REVOKE ALL ON public.hub_posts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_posts TO authenticated;

CREATE TABLE public.hub_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  post_id uuid NOT NULL REFERENCES public.hub_posts(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX hub_reads_post_idx ON public.hub_reads (post_id);

ALTER TABLE public.hub_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub reads read" ON public.hub_reads FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "hub reads insert" ON public.hub_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "hub reads delete" ON public.hub_reads FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

REVOKE ALL ON public.hub_reads FROM anon;
GRANT SELECT, INSERT, DELETE ON public.hub_reads TO authenticated;

-- updated_at, and an author that can't be rewritten.
CREATE FUNCTION internal.hub_posts_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.hub_posts_touch() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER hub_posts_touch BEFORE INSERT OR UPDATE ON public.hub_posts
  FOR EACH ROW EXECUTE FUNCTION internal.hub_posts_touch();

-- An important post going out tells everyone, once: on insert already
-- published, or on the update that publishes it (or marks a published post
-- important). Definer: it writes other people's notifications.
CREATE FUNCTION internal.hub_posts_announce()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not new.important or new.published_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.important and old.published_at is not null then
    return new;
  end if;
  insert into public.notifications (user_id, type, title, body, link, created_by)
  select p.id, 'hub', left(new.title, 200), left(regexp_replace(new.body, '\s+', ' ', 'g'), 280), '/hub/' || new.id, new.created_by
  from public.profiles p;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.hub_posts_announce() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER hub_posts_announce AFTER INSERT OR UPDATE OF published_at, important ON public.hub_posts
  FOR EACH ROW EXECUTE FUNCTION internal.hub_posts_announce();
