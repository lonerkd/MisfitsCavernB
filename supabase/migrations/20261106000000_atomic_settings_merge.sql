-- Atomic merge of a patch into a project's settings JSONB column.
-- Replaces the read-modify-write pattern in patchProjectSettings, which could
-- lose concurrent updates to unrelated fields.
CREATE OR REPLACE FUNCTION public.patch_project_settings(p_project_id uuid, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_settings jsonb;
BEGIN
  UPDATE public.projects
  SET settings = COALESCE(settings, '{}'::jsonb) || p_patch
  WHERE id = p_project_id
    AND internal.can_access_project(id)
  RETURNING settings INTO v_settings;

  IF v_settings IS NULL THEN
    RAISE EXCEPTION 'Project not found or access denied' USING errcode = '42501';
  END IF;

  PERFORM pg_notify('project_settings_changed', p_project_id::text);
  RETURN v_settings;
END;
$function$;

REVOKE ALL ON FUNCTION public.patch_project_settings(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patch_project_settings(uuid, jsonb) TO authenticated;
