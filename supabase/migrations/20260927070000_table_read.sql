-- Table read timing: how long each scene actually ran the last time the team
-- read it (ScriptOS table read). The runtime estimate uses it — a read scene
-- counts at its read time, and unread scenes are scaled by how the read ones
-- compared to their estimate. Set by people (the read), never by the scene
-- sync, like note / colour / shoot_day.
ALTER TABLE public.scenes ADD COLUMN read_seconds numeric(7,1)
  CONSTRAINT scenes_read_seconds_check CHECK (read_seconds IS NULL OR (read_seconds > 0 AND read_seconds <= 36000));
ALTER TABLE public.scenes ADD COLUMN read_at timestamp with time zone;
