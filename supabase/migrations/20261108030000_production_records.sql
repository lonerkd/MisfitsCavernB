-- The role tools of the Production tab (camera reports, costumes, permits, purchase orders, ...) kept each list inside
-- projects.settings, which only the project's creator may write: a director, sound mixer or camera operator could read their
-- own tool but not save a record in it, and two writers overwrote each other's whole list. One row per record instead,
-- through the project helpers: anyone who can open the project reads; the owner and crew who shape it (lead, contributor)
-- add, edit and delete; a viewer reads only. Existing lists are copied across
-- (settings keeps its old copy; nothing reads it any more).
CREATE TABLE public.production_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  item_id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_records_kind_check CHECK (kind IN (
    'safety','comms','gear','wraps','rehearsals','scouts','directorNotes','risks','cameraReports','soundReports','vfxShots',
    'costumes','permits','scriptNotes','purchaseOrders','mediaOffloads','makeup')),
  CONSTRAINT production_records_item_check CHECK (char_length(item_id) BETWEEN 1 AND 80),
  CONSTRAINT production_records_data_check CHECK (jsonb_typeof(data) = 'object' AND pg_column_size(data) <= 20000),
  CONSTRAINT production_records_unique UNIQUE (project_id, kind, item_id)
);
CREATE INDEX production_records_project_idx ON public.production_records (project_id, kind);
CREATE INDEX production_records_created_by_idx ON public.production_records (created_by);
ALTER TABLE public.production_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production records view" ON public.production_records FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "production records add" ON public.production_records FOR INSERT TO authenticated
  WITH CHECK (internal.can_shape_project(project_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "production records edit" ON public.production_records FOR UPDATE TO authenticated
  USING (internal.can_shape_project(project_id)) WITH CHECK (internal.can_shape_project(project_id));
CREATE POLICY "production records remove" ON public.production_records FOR DELETE TO authenticated
  USING (internal.can_shape_project(project_id));

-- A record never moves to another project or kind, and keeps its maker.
CREATE FUNCTION internal.production_records_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.project_id is distinct from old.project_id or new.kind is distinct from old.kind
     or new.item_id is distinct from old.item_id or new.created_by is distinct from old.created_by then
    raise exception 'A record keeps its project, kind and maker' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.production_records_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER production_records_guard BEFORE UPDATE ON public.production_records FOR EACH ROW EXECUTE FUNCTION internal.production_records_guard();

-- Copy what the projects already hold.
INSERT INTO public.production_records (project_id, kind, item_id, data, created_by)
SELECT p.id, k.key, left(e.elem ->> 'id', 80), e.elem - 'id', p.creator_id
  FROM public.projects p
  CROSS JOIN LATERAL jsonb_each(COALESCE(p.settings, '{}'::jsonb)) AS k(key, value)
  CROSS JOIN LATERAL jsonb_array_elements(k.value) AS e(elem)
 WHERE k.key IN ('safety','comms','gear','wraps','rehearsals','scouts','directorNotes','risks','cameraReports','soundReports',
                 'vfxShots','costumes','permits','scriptNotes','purchaseOrders','mediaOffloads','makeup')
   AND jsonb_typeof(k.value) = 'array' AND jsonb_typeof(e.elem) = 'object' AND e.elem ->> 'id' IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.production_records;
