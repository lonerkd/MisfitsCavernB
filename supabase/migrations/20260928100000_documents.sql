-- Paperwork: permits, insurance, releases, contracts.
--
-- project_documents is the production's paperwork: what it is, where it
-- stands (needed → pending → done: granted, active or signed, by kind), who
-- it's with (a crew member, a vendor, a location, or a named party), when it
-- expires, and the file. Files live in their own private bucket
-- (project-papers), never in the project library the whole crew can browse.
--
-- The owner, leads and contributors see and keep all of it; the person a
-- document is about (their contract, their release) can read that one and
-- its file. A permit linked to a location keeps the location's permit state
-- in step (pending → applied, done → granted), so the readiness board follows.

ALTER TABLE public.project_locations ADD CONSTRAINT project_locations_id_project_key UNIQUE (id, project_id);

CREATE TABLE public.project_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  status text DEFAULT 'needed' NOT NULL,
  person_id uuid,
  vendor_id uuid,
  location_id uuid,
  party text,
  expires_on date,
  notes text,
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT project_documents_pkey PRIMARY KEY (id),
  CONSTRAINT project_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT project_documents_person_fkey FOREIGN KEY (person_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT project_documents_vendor_fkey FOREIGN KEY (vendor_id, project_id) REFERENCES public.vendors(id, project_id) ON DELETE SET NULL (vendor_id),
  CONSTRAINT project_documents_location_fkey FOREIGN KEY (location_id, project_id) REFERENCES public.project_locations(id, project_id) ON DELETE SET NULL (location_id),
  CONSTRAINT project_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT project_documents_kind_check CHECK (kind IN ('permit', 'insurance', 'release', 'contract', 'other')),
  CONSTRAINT project_documents_status_check CHECK (status IN ('needed', 'pending', 'done')),
  CONSTRAINT project_documents_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  CONSTRAINT project_documents_text_len CHECK (char_length(party) <= 200 AND char_length(notes) <= 2000 AND char_length(file_name) <= 200),
  CONSTRAINT project_documents_file_shape CHECK ((storage_path IS NULL) = (file_name IS NULL)),
  CONSTRAINT project_documents_path_check CHECK (storage_path IS NULL OR storage_path LIKE (project_id::text || '/' || id::text || '/%'))
);
CREATE INDEX project_documents_project_idx ON public.project_documents USING btree (project_id);
CREATE INDEX project_documents_person_idx ON public.project_documents USING btree (person_id);
CREATE INDEX project_documents_location_idx ON public.project_documents USING btree (location_id);
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_documents read" ON public.project_documents FOR SELECT TO authenticated
  USING (internal.can_shape_project(project_id) OR person_id = (SELECT auth.uid()));
CREATE POLICY "project_documents keep" ON public.project_documents FOR ALL TO authenticated
  USING (internal.can_shape_project(project_id)) WITH CHECK (internal.can_shape_project(project_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;
REVOKE ALL ON public.project_documents FROM anon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_documents;

CREATE FUNCTION internal.project_documents_touch()
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
REVOKE ALL ON FUNCTION internal.project_documents_touch() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER project_documents_touch BEFORE INSERT OR UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION internal.project_documents_touch();

-- A location's permit follows its permit paperwork.
CREATE FUNCTION internal.project_documents_sync_permit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.kind = 'permit' and new.location_id is not null and new.status in ('pending', 'done')
     and (tg_op = 'INSERT' or (new.status, new.location_id, new.kind) is distinct from (old.status, old.location_id, old.kind)) then
    update public.project_locations
       set permit = (array['applied', 'granted'])[array_position(array['pending', 'done'], new.status)]
     where id = new.location_id;
  end if;
  return null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.project_documents_sync_permit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER project_documents_sync_permit AFTER INSERT OR UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION internal.project_documents_sync_permit();

-- ── The files ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-papers', 'project-papers', false, 20971520, ARRAY['application/pdf', 'image/*']);

-- Read a paperwork file: those who shape the project, or the person the
-- document it belongs to is about.
CREATE FUNCTION internal.can_read_paper(object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select internal.can_shape_project(internal.path_project_id(object_name))
      or exists (select 1 from public.project_documents d
                  where d.storage_path = object_name and d.person_id = (select auth.uid()));
$function$;
REVOKE ALL ON FUNCTION internal.can_read_paper(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION internal.can_read_paper(text) TO authenticated;

CREATE POLICY "project-papers: read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-papers' AND internal.can_read_paper(name));
CREATE POLICY "project-papers: upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-papers' AND internal.can_shape_project(internal.path_project_id(name)));
CREATE POLICY "project-papers: delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-papers' AND internal.can_shape_project(internal.path_project_id(name)));
