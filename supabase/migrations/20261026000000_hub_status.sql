-- The hub's Status page (plan: .cavern-intelligence/plans/2026-10-25-lounge-overhaul.md,
-- slice L2): an incident is a hub post of kind 'incident' with a severity and,
-- once over, a resolved_at; its running updates live in hub_incident_updates.
-- Publishing an incident always notifies everyone (and so pushes); resolving
-- it doesn't.

ALTER TABLE public.hub_posts DROP CONSTRAINT hub_posts_kind_check;
ALTER TABLE public.hub_posts ADD CONSTRAINT hub_posts_kind_check CHECK (kind IN ('update', 'guide', 'incident'));
ALTER TABLE public.hub_posts
  ADD COLUMN severity text CHECK (severity IN ('minor', 'major', 'critical')),
  ADD COLUMN resolved_at timestamptz;
ALTER TABLE public.hub_posts ADD CONSTRAINT hub_posts_incident_shape CHECK (
  (kind = 'incident' AND severity IS NOT NULL) OR (kind <> 'incident' AND severity IS NULL AND resolved_at IS NULL)
);
CREATE INDEX hub_posts_open_incidents_idx ON public.hub_posts (published_at DESC)
  WHERE kind = 'incident' AND resolved_at IS NULL AND published_at IS NOT NULL;

CREATE TABLE public.hub_incident_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.hub_posts(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hub_incident_updates_post_idx ON public.hub_incident_updates (post_id, created_at);
CREATE INDEX hub_incident_updates_created_by_idx ON public.hub_incident_updates (created_by);

ALTER TABLE public.hub_incident_updates ENABLE ROW LEVEL SECURITY;

-- Readable with the post: the subquery runs under the caller's hub_posts policy.
CREATE POLICY "hub incident updates read" ON public.hub_incident_updates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hub_posts p WHERE p.id = post_id AND p.kind = 'incident'));
CREATE POLICY "hub incident updates insert" ON public.hub_incident_updates FOR INSERT TO authenticated
  WITH CHECK (internal.caller_is_admin() AND created_by = (select auth.uid()));
CREATE POLICY "hub incident updates delete" ON public.hub_incident_updates FOR DELETE TO authenticated
  USING (internal.caller_is_admin());

REVOKE ALL ON public.hub_incident_updates FROM anon;
GRANT SELECT, INSERT, DELETE ON public.hub_incident_updates TO authenticated;

-- An incident announces like an important post: once, when it goes out.
CREATE OR REPLACE FUNCTION internal.hub_posts_announce()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  loud boolean := new.important or new.kind = 'incident';
  was_loud boolean;
begin
  -- A post scheduled for later isn't announced (nobody could open it yet).
  if not loud or new.published_at is null or new.published_at > now() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    was_loud := old.important or old.kind = 'incident';
    if was_loud and old.published_at is not null then
      return new;
    end if;
  end if;
  insert into public.notifications (user_id, type, title, body, link, created_by)
  select p.id, 'hub', left(new.title, 200), left(regexp_replace(new.body, '\s+', ' ', 'g'), 280), '/hub/' || new.id, new.created_by
  from public.profiles p;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.hub_posts_announce() FROM PUBLIC, anon, authenticated;
