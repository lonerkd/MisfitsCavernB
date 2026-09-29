-- Locations as records.
--
-- A scene's location comes from its heading (INT. HARBOR - NIGHT → HARBOR).
-- project_locations gives that name a record: where it is, who to call, how
-- far the deal has got, whether a permit is needed and granted, what it costs.
-- Keyed by the heading's name (upper case), so scenes link to it through the
-- script with nothing to maintain; a location nobody has written yet can be
-- added too. The readiness board, call sheets and project_context read it.

CREATE TABLE public.project_locations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  contact text,
  status text DEFAULT 'scouting' NOT NULL,
  permit text DEFAULT 'unknown' NOT NULL,
  cost numeric(12,2),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT project_locations_pkey PRIMARY KEY (id),
  CONSTRAINT project_locations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT project_locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT project_locations_name_key UNIQUE (project_id, name),
  CONSTRAINT project_locations_name_check CHECK (name = upper(btrim(name)) AND char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT project_locations_status_check CHECK (status IN ('scouting', 'option', 'confirmed')),
  CONSTRAINT project_locations_permit_check CHECK (permit IN ('unknown', 'not_needed', 'needed', 'applied', 'granted')),
  CONSTRAINT project_locations_cost_check CHECK (cost IS NULL OR cost >= 0),
  CONSTRAINT project_locations_text_len CHECK (char_length(address) <= 500 AND char_length(contact) <= 300 AND char_length(notes) <= 5000)
);
ALTER TABLE public.project_locations ENABLE ROW LEVEL SECURITY;
CREATE INDEX project_locations_project_idx ON public.project_locations USING btree (project_id);

-- The production plans locations together, as it does call sheets and the breakdown.
CREATE POLICY "project_locations access" ON public.project_locations FOR ALL TO authenticated
  USING (internal.can_access_project(project_id)) WITH CHECK (internal.can_access_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_locations TO authenticated;
REVOKE ALL ON public.project_locations FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_locations;

CREATE FUNCTION internal.project_locations_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.project_locations_touch() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER project_locations_touch BEFORE INSERT OR UPDATE ON public.project_locations
  FOR EACH ROW EXECUTE FUNCTION internal.project_locations_touch();
