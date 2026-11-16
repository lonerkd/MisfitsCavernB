-- A script's live co-writing channel (`script_<script id>`: Yjs updates, the state
-- hand-off, appended text and who is in the script) was a public Realtime channel: anyone
-- holding the anon key who knew a script id could listen to it and inject updates into
-- everyone's open editor. It becomes a private channel, authorised here.
--
-- Realtime Authorization checks the topic the client joined (`realtime.topic()`, set per
-- connection) against policies on realtime.messages: SELECT decides who may receive
-- broadcast and presence on it, INSERT who may send (and track presence).
--
-- Who may do what follows the scripts table itself: its "scripts update" policy lets
-- whoever internal.can_access_script() accepts write the script, so the same helper
-- decides both directions (a viewer-tier project member can read and edit a script today,
-- so can write to its channel; nobody else can do either). Only topics that name a script
-- are matched; no other topic is touched, and with no policy a private channel is closed.
--
-- The client change (`config: { private: true }` on every `script_` channel) ships in the
-- same PR; apply this migration BEFORE that code reaches users.

CREATE POLICY "script channel: readers"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    CASE
      WHEN (SELECT realtime.topic()) ~ '^script_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN internal.can_access_script(substring((SELECT realtime.topic()) FROM 8)::uuid)
      ELSE false
    END
  );

CREATE POLICY "script channel: writers"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    CASE
      WHEN (SELECT realtime.topic()) ~ '^script_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN internal.can_access_script(substring((SELECT realtime.topic()) FROM 8)::uuid)
      ELSE false
    END
  );
