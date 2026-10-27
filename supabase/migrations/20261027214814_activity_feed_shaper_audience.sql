-- Keep paperwork activity visible only to shapers, rather than exposing it
-- through the broader project feed.
DROP POLICY "activity view" ON public.activity_feed;
CREATE POLICY "activity view" ON public.activity_feed FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR CASE
      WHEN metadata ->> 'audience' = 'shapers'
        THEN internal.can_shape_project(internal.activity_project_id(metadata))
      ELSE internal.can_access_project(internal.activity_project_id(metadata))
    END
  );

DROP POLICY "activity insert" ON public.activity_feed;
CREATE POLICY "activity insert" ON public.activity_feed FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      internal.activity_project_id(metadata) IS NULL
      OR internal.can_access_project(internal.activity_project_id(metadata))
    )
    AND (
      metadata ->> 'audience' IS DISTINCT FROM 'shapers'
      OR internal.can_shape_project(internal.activity_project_id(metadata))
    )
  );