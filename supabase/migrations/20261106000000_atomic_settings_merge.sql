-- Merge a patch into a project's settings in one statement. The read-modify-write in patchProjectSettings could lose a
-- concurrent update to an unrelated key. Who may change settings does not change: only the project's creator, exactly
-- as the "Creators update projects" policy says (a crew member, a lead included, cannot). The function is definer so
-- it can return the merged settings in the same statement, and it checks the creator itself.
CREATE OR REPLACE FUNCTION public.patch_project_settings(p_project_id uuid, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_settings jsonb;
BEGIN
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'A settings patch is an object' USING errcode = '22023';
  END IF;
  UPDATE public.projects
     SET settings = COALESCE(settings, '{}'::jsonb) || p_patch
   WHERE id = p_project_id
     AND creator_id = (SELECT auth.uid())
  RETURNING settings INTO v_settings;
  IF v_settings IS NULL THEN
    RAISE EXCEPTION 'Only the project owner can change this' USING errcode = '42501';
  END IF;
  RETURN v_settings;
END;
$function$;

REVOKE ALL ON FUNCTION public.patch_project_settings(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patch_project_settings(uuid, jsonb) TO authenticated;
