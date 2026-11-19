-- A look gains a photo (a library item) and the wardrobe / props / make-up elements it is made of (BACKLOG 3.18 b).
--   scene_states.media_id          the reference photo: a media item of the same project; the photo going away clears it, not the look
--   scene_state_elements           the breakdown elements that make up the look; the same access as the look itself
-- Additive only; RLS from birth through the same helper scene_states uses.

ALTER TABLE public.scene_states
  ADD COLUMN media_id uuid,
  ADD CONSTRAINT scene_states_id_project_key UNIQUE (id, project_id),
  ADD CONSTRAINT scene_states_media_fkey FOREIGN KEY (media_id, project_id)
    REFERENCES public.media(id, project_id) ON DELETE SET NULL (media_id);
CREATE INDEX scene_states_media_fkey_idx ON public.scene_states USING btree (media_id, project_id);

CREATE TABLE public.scene_state_elements (
  state_id uuid NOT NULL,
  element_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT scene_state_elements_pkey PRIMARY KEY (state_id, element_id),
  CONSTRAINT scene_state_elements_state_fkey FOREIGN KEY (state_id, project_id)
    REFERENCES public.scene_states(id, project_id) ON DELETE CASCADE,
  CONSTRAINT scene_state_elements_element_fkey FOREIGN KEY (element_id, project_id)
    REFERENCES public.breakdown_elements(id, project_id) ON DELETE CASCADE
);
CREATE INDEX scene_state_elements_element_fkey_idx ON public.scene_state_elements USING btree (element_id, project_id);
CREATE INDEX scene_state_elements_project_idx ON public.scene_state_elements USING btree (project_id);
CREATE INDEX scene_state_elements_created_by_idx ON public.scene_state_elements USING btree (created_by);
ALTER TABLE public.scene_state_elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scene_state_elements access" ON public.scene_state_elements FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scene_state_elements TO authenticated;
REVOKE ALL ON public.scene_state_elements FROM anon;
