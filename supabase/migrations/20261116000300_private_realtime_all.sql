-- Every Realtime channel is private (BACKLOG 3.33 follow-up). With the project's "allow public access" off, Realtime
-- refuses any channel that is not private, so each topic the app opens gets a rule here. One SELECT policy (joining,
-- receiving broadcast and presence) and one INSERT policy (sending broadcast, tracking presence), replacing the two
-- script-only policies of 20261116000200.
--
-- Database-change events (postgres_changes) are still filtered row by row by each table's own RLS: these rules only
-- decide who may open the channel and who may broadcast or show presence on it.
--
--   script_<id>                          the script's readers (co-writing, presence, beats)
--   typing:<channel> · voice:<channel>   people who can see that Lounge channel
--   presence:project_<id> · project:<id> · activity:<id>:… · prod-records:<id>:…   people on the project
--   notes_<script or project id>         people who can read that script or project
--   notif-<user>-… · lounge-unread:<user>   that user only
--   dm:<user>:<user>                     one of the two people
--   chan:<channel>                       people who can see that channel
--   thread:<message> · lounge-presence · projects:list · live:…   anyone signed in (row events are filtered by table RLS;
--                                        lounge-presence is the suite-wide "who is online", as before)
--   anything else                        refused

DROP POLICY IF EXISTS "script channel: readers" ON realtime.messages;
DROP POLICY IF EXISTS "script channel: writers" ON realtime.messages;

CREATE POLICY "realtime: topic readers"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    CASE
      WHEN (SELECT realtime.topic()) ~ '^script_[0-9a-f-]{36}$'
        THEN internal.can_access_script(substring((SELECT realtime.topic()) FROM 8)::uuid)
      WHEN (SELECT realtime.topic()) ~ '^(typing|voice|chan):[0-9a-f-]{36}$'
        THEN internal.can_view_channel(split_part((SELECT realtime.topic()), ':', 2)::uuid)
      WHEN (SELECT realtime.topic()) ~ '^presence:project_[0-9a-f-]{36}$'
        THEN internal.can_access_project(substring((SELECT realtime.topic()) FROM 18)::uuid)
      WHEN (SELECT realtime.topic()) ~ '^(project|activity|prod-records):[0-9a-f-]{36}(:.*)?$'
        THEN internal.can_access_project(split_part((SELECT realtime.topic()), ':', 2)::uuid)
      WHEN (SELECT realtime.topic()) ~ '^notes_[0-9a-f-]{36}$'
        THEN internal.can_access_script(substring((SELECT realtime.topic()) FROM 7)::uuid)
          OR internal.can_access_project(substring((SELECT realtime.topic()) FROM 7)::uuid)
      WHEN (SELECT realtime.topic()) ~ '^notif-[0-9a-f-]{36}-'
        THEN substring((SELECT realtime.topic()) FROM 7 FOR 36) = (SELECT auth.uid())::text
      WHEN (SELECT realtime.topic()) ~ '^lounge-unread:[0-9a-f-]{36}$'
        THEN substring((SELECT realtime.topic()) FROM 15) = (SELECT auth.uid())::text
      WHEN (SELECT realtime.topic()) ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'
        THEN (SELECT auth.uid())::text IN (split_part((SELECT realtime.topic()), ':', 2), split_part((SELECT realtime.topic()), ':', 3))
      WHEN (SELECT realtime.topic()) ~ '^thread:[0-9a-f-]{36}$'
        OR (SELECT realtime.topic()) IN ('lounge-presence', 'projects:list')
        OR (SELECT realtime.topic()) ~ '^live:'
        THEN true
      ELSE false
    END
  );

-- Sending: only the broadcast and presence topics are written to by the app.
CREATE POLICY "realtime: topic writers"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    CASE
      WHEN (SELECT realtime.topic()) ~ '^script_[0-9a-f-]{36}$'
        THEN internal.can_access_script(substring((SELECT realtime.topic()) FROM 8)::uuid)
      WHEN (SELECT realtime.topic()) ~ '^(typing|voice):[0-9a-f-]{36}$'
        THEN internal.can_view_channel(split_part((SELECT realtime.topic()), ':', 2)::uuid)
      WHEN (SELECT realtime.topic()) ~ '^presence:project_[0-9a-f-]{36}$'
        THEN internal.can_access_project(substring((SELECT realtime.topic()) FROM 18)::uuid)
      WHEN (SELECT realtime.topic()) = 'lounge-presence'
        THEN true
      ELSE false
    END
  );
