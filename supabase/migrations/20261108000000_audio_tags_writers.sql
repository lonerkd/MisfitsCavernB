-- Tagging is for the project's owner and writers (owner, 2026-11-08), not for everyone who can open the project. A tag decides what
-- music a scene is offered, so it belongs with the people who shape the project (internal.can_shape_project: the creator, and
-- confirmed leads and contributors). Everyone who can open the project still reads the tags and may save a track untagged.
-- This also narrows the 20261107000200 update policy, which let any member write any column (the trigger was its only limit).
DROP POLICY "audio refs update" ON public.project_audio_references;
CREATE POLICY "audio refs update" ON public.project_audio_references FOR UPDATE TO authenticated
  USING (
    (project_id IS NULL AND added_by = (SELECT auth.uid()))
    OR (project_id IS NOT NULL AND internal.can_shape_project(project_id))
  )
  WITH CHECK (
    (project_id IS NULL AND added_by = (SELECT auth.uid()))
    OR (project_id IS NOT NULL AND internal.can_shape_project(project_id))
  );

-- A new track may arrive already tagged only from someone who may tag.
DROP POLICY "audio refs insert" ON public.project_audio_references;
CREATE POLICY "audio refs insert" ON public.project_audio_references FOR INSERT TO authenticated
  WITH CHECK (
    added_by = (SELECT auth.uid())
    AND (
      project_id IS NULL
      OR (internal.can_access_project(project_id) AND for_scene IS NULL AND role IS NULL AND tags = '{}'::text[])
      OR internal.can_shape_project(project_id)
    )
  );
