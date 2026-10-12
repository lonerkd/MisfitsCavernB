-- The film graph, step 3: story time and continuity.
-- A scene knows when in the story it happens (story_day, story_time), and a
-- person can pin that so a later read of the script never overwrites it
-- (story_confirmed). scene_states is how each character looks in each scene —
-- the continuity sheet. Nothing here is written by the script sync.

ALTER TABLE public.scenes
  ADD COLUMN story_day integer,
  ADD COLUMN story_time text,
  ADD COLUMN story_confirmed boolean DEFAULT false NOT NULL,
  ADD CONSTRAINT scenes_story_day_check CHECK (story_day IS NULL OR story_day >= 1),
  ADD CONSTRAINT scenes_story_time_check CHECK (story_time IS NULL OR char_length(story_time) <= 60);

CREATE TABLE public.scene_states (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  scene_id uuid NOT NULL,
  character_id uuid NOT NULL,
  look text DEFAULT ''::text NOT NULL,
  notes text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT scene_states_pkey PRIMARY KEY (id),
  CONSTRAINT scene_states_scene_character_key UNIQUE (scene_id, character_id),
  CONSTRAINT scene_states_scene_fkey FOREIGN KEY (scene_id, project_id)
    REFERENCES public.scenes(id, project_id) ON DELETE CASCADE,
  CONSTRAINT scene_states_character_fkey FOREIGN KEY (character_id, project_id)
    REFERENCES public.characters(id, project_id) ON DELETE CASCADE,
  CONSTRAINT scene_states_look_check CHECK (char_length(look) <= 500),
  CONSTRAINT scene_states_notes_check CHECK (char_length(notes) <= 2000)
);
CREATE INDEX scene_states_project_idx ON public.scene_states USING btree (project_id);
CREATE INDEX scene_states_character_idx ON public.scene_states USING btree (character_id);
ALTER TABLE public.scene_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scene_states access" ON public.scene_states FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scene_states TO authenticated;
REVOKE ALL ON public.scene_states FROM anon;
CREATE TRIGGER scene_states_updated_at BEFORE UPDATE ON public.scene_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER PUBLICATION supabase_realtime ADD TABLE public.scene_states;
