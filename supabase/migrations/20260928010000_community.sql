-- The Lounge's channels get an audience, and the community gets channels.
--
-- Audience (who can see a channel; posting still follows post_policy):
--   community (no project): 'users' — everyone signed in; 'admins' — admins.
--   project: 'team' — everyone on it; 'owners' — creator and leads;
--            'above' / 'below' — above- or below-the-line crew (by their
--            craft's crafts.above_the_line; owners too); 'guests' — viewers
--            (and owners, so guests have someone to talk to); 'public' —
--            anyone signed in can read (a production's public updates) —
--            unless the project itself is private.
--   is_private stays an invite-only overlay on any audience: its members,
--   plus whoever runs it (the project's creator; admins for community).
--   Before, a private community channel was visible to every signed-in user.
-- Guides: channel type 'guide' — read-only articles (FAQ, start here,
--   tutorials) written by whoever manages the channel.
-- Admins create community channels and manage them (nobody could before).

ALTER TABLE public.crafts ADD COLUMN above_the_line boolean DEFAULT false NOT NULL;
UPDATE public.crafts SET above_the_line = true
 WHERE name IN ('Director', 'Producer', 'Writer', 'Story editor', 'Actor', 'Voice actor');

ALTER TABLE public.channels ADD COLUMN audience text DEFAULT 'team' NOT NULL;
UPDATE public.channels SET audience = 'users' WHERE project_id IS NULL;
ALTER TABLE public.channels ADD CONSTRAINT channels_audience_check CHECK (
  (project_id IS NULL AND audience IN ('users', 'admins'))
  OR (project_id IS NOT NULL AND audience IN ('team', 'owners', 'above', 'below', 'guests', 'public'))
);
-- The default audience follows the channel's scope: a community channel left
-- at the column default is for everyone.
CREATE FUNCTION internal.channels_default_audience()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.project_id is null and new.audience = 'team' then
    new.audience := 'users';
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.channels_default_audience() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER channels_default_audience BEFORE INSERT ON public.channels
  FOR EACH ROW EXECUTE FUNCTION internal.channels_default_audience();

ALTER TABLE public.channels DROP CONSTRAINT channels_type_check;
ALTER TABLE public.channels ADD CONSTRAINT channels_type_check CHECK (type IN ('text', 'voice', 'guide'));

-- Is the caller in this part of the project?
CREATE FUNCTION internal.in_project_audience(pid uuid, aud text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select internal.is_project_creator(pid)
    or (aud = 'public' and auth.uid() is not null and exists (select 1 from projects p where p.id = pid and p.visibility <> 'private'))
    or exists (
      select 1 from project_crew pc
        join projects p on p.id = pc.project_id
        left join crafts cf on cf.name = pc.craft
       where pc.project_id = pid and pc.user_id = auth.uid() and p.visibility <> 'private'
         and case aud
               when 'team' then true
               when 'public' then true
               when 'owners' then pc.role = 'lead'
               when 'above' then pc.role = 'lead' or coalesce(cf.above_the_line, false)
               when 'below' then pc.role = 'lead' or not coalesce(cf.above_the_line, false)
               when 'guests' then pc.role in ('lead', 'viewer')
               else false
             end
    );
$function$;
REVOKE ALL ON FUNCTION internal.in_project_audience(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION internal.in_project_audience(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION internal.can_view_channel(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from channels c where c.id = cid and (
      case
        when c.is_private then
          exists (select 1 from channel_members m where m.channel_id = c.id and m.user_id = auth.uid())
          or (c.project_id is not null and internal.is_project_creator(c.project_id))
          or (c.project_id is null and internal.caller_is_admin())
        when c.project_id is null then
          case c.audience when 'admins' then internal.caller_is_admin() else auth.uid() is not null end
        else internal.in_project_audience(c.project_id, c.audience)
      end
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_channel(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from channels c where c.id = cid and (
      (c.project_id is not null and internal.is_project_creator(c.project_id))
      or (c.project_id is null and (c.created_by = auth.uid() or internal.caller_is_admin()))
      or exists (select 1 from channel_members m where m.channel_id = c.id and m.user_id = auth.uid() and m.can_manage)
    )
  );
$function$;

-- Guides are read-only for everyone who doesn't run them.
CREATE OR REPLACE FUNCTION public.can_post_channel(cid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select internal.can_view_channel(cid) and exists (
    select 1 from channels c where c.id = cid and (
      case
        when c.type = 'guide' then public.can_manage_channel(cid)
        else case c.post_policy
          when 'viewers' then true
          when 'members' then (public.can_manage_channel(cid) or exists (select 1 from channel_members m where m.channel_id = c.id and m.user_id = auth.uid() and m.can_post))
          when 'managers' then public.can_manage_channel(cid)
          else true
        end
      end
    )
  );
$function$;

DROP POLICY "channels create by project creator or crew" ON public.channels;
CREATE POLICY "channels create" ON public.channels FOR INSERT TO authenticated
  WITH CHECK (
    (project_id IS NOT NULL AND (internal.is_project_creator(project_id) OR internal.is_project_member(project_id)))
    OR (project_id IS NULL AND internal.caller_is_admin())
  );

-- A message can be taken down by whoever wrote it, or by whoever runs its
-- channel (moderation — and how a guide's sections are kept current). There
-- was no delete policy, so nothing could be removed.
CREATE POLICY "messages delete" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = (SELECT auth.uid()) OR (channel_uuid IS NOT NULL AND public.can_manage_channel(channel_uuid)));

-- Community channels to start from (admins can rename, reorder or remove any).
INSERT INTO public.channels (name, type, topic, post_policy, audience, position)
SELECT v.name, v.type, v.topic, v.post_policy, v.audience, v.position
FROM (VALUES
  ('start-here', 'guide', 'A guided tour of the suite — from the first idea to the festival run.', 'managers', 'users', 0),
  ('faq', 'guide', 'Answers to what people ask most.', 'managers', 'users', 1),
  ('tutorials', 'guide', 'Walkthroughs: breakdowns, schedules, the table read, cut review…', 'managers', 'users', 2),
  ('announcements', 'text', 'News from the Cavern — new tools, events, what''s changed.', 'managers', 'users', 3),
  ('general', 'text', 'Say hi. Anything goes.', 'viewers', 'users', 4),
  ('craft-talk', 'text', 'Techniques, gear and workflows — ask and share.', 'viewers', 'users', 5),
  ('crew-call', 'text', 'Looking for crew or a gig? Say what and where (and post it on Jobs).', 'viewers', 'users', 6),
  ('feedback', 'text', 'Share a scene, a cut or a pitch and ask for notes.', 'viewers', 'users', 7),
  ('showcase', 'text', 'Finished something? Show it.', 'viewers', 'users', 8),
  ('the-lounge', 'voice', 'Drop in and talk.', 'viewers', 'users', 9),
  ('admins', 'text', 'For the people running the Cavern.', 'viewers', 'admins', 10)
) AS v(name, type, topic, post_policy, audience, position)
WHERE NOT EXISTS (SELECT 1 FROM public.channels c WHERE c.project_id IS NULL AND c.name = v.name);
