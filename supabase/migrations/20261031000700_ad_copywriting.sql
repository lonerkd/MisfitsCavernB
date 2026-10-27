-- Advertising and copywriting deliverables, approved references and brand rules.

ALTER TABLE public.scripts DROP CONSTRAINT scripts_format_check;
ALTER TABLE public.scripts ADD CONSTRAINT scripts_format_check
  CHECK (format = ANY (ARRAY['screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline', 'copy']));
ALTER TABLE public.scripts ADD CONSTRAINT scripts_id_project_key UNIQUE (id, project_id);

ALTER TABLE public.entities DROP CONSTRAINT entities_kind_check;
ALTER TABLE public.entities ADD CONSTRAINT entities_kind_check
  CHECK (kind IN ('scene', 'character', 'location', 'shoot_day', 'task', 'document', 'media', 'deliverable', 'ad_reference', 'brand_rule'));
DROP POLICY "entities read" ON public.entities;
CREATE POLICY "entities read" ON public.entities FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id)
    AND (kind <> 'brand_rule' OR internal.can_shape_project(project_id)));

CREATE TABLE public.deliverables (
  script_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  kind text NOT NULL DEFAULT 'other'
    CHECK (kind IN ('spot_30', 'spot_15', 'spot_6', 'radio', 'poster', 'banner', 'headline', 'social', 'other')),
  max_chars integer CHECK (max_chars IS NULL OR max_chars BETWEEN 1 AND 100000),
  max_seconds integer CHECK (max_seconds IS NULL OR max_seconds BETWEEN 1 AND 3600),
  words_per_second numeric(4, 2) NOT NULL DEFAULT 2.5 CHECK (words_per_second BETWEEN 0.5 AND 5),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (script_id, project_id),
  CONSTRAINT deliverables_script_project_fkey
    FOREIGN KEY (script_id, project_id) REFERENCES public.scripts (id, project_id) ON DELETE CASCADE
);
CREATE INDEX deliverables_project_idx ON public.deliverables (project_id);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliverables read" ON public.deliverables FOR SELECT TO authenticated
  USING (internal.can_access_project(project_id));
CREATE POLICY "deliverables insert" ON public.deliverables FOR INSERT TO authenticated
  WITH CHECK (internal.can_shape_project(project_id));
CREATE POLICY "deliverables update" ON public.deliverables FOR UPDATE TO authenticated
  USING (internal.can_shape_project(project_id)) WITH CHECK (internal.can_shape_project(project_id));
REVOKE ALL ON public.deliverables FROM anon, authenticated;
GRANT SELECT, INSERT ON public.deliverables TO authenticated;
GRANT UPDATE (kind, max_chars, max_seconds, words_per_second, notes) ON public.deliverables TO authenticated;

CREATE TABLE public.ad_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('brief', 'brand_guidelines')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 20000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  CHECK ((status = 'approved') = (approved_at IS NOT NULL))
);
CREATE INDEX ad_references_project_idx ON public.ad_references (project_id, status, kind);

ALTER TABLE public.ad_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad references read" ON public.ad_references FOR SELECT TO authenticated
  USING (internal.can_shape_project(project_id));
CREATE POLICY "ad references insert" ON public.ad_references FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()) AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = (select auth.uid())
  ));
CREATE POLICY "ad references update" ON public.ad_references FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = (select auth.uid())));
CREATE POLICY "ad references delete" ON public.ad_references FOR DELETE TO authenticated
  USING (status = 'draft' AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = (select auth.uid())
  ));
REVOKE ALL ON public.ad_references FROM anon, authenticated;
GRANT SELECT, DELETE ON public.ad_references TO authenticated;
GRANT INSERT (project_id, kind, title, content) ON public.ad_references TO authenticated;
GRANT UPDATE (kind, title, content, status) ON public.ad_references TO authenticated;

CREATE TABLE public.brand_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('must_include', 'never_say', 'tone_note', 'legal_line')),
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 500),
  severity text NOT NULL DEFAULT 'blocker' CHECK (severity IN ('blocker', 'warning', 'note')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, kind, text),
  UNIQUE (id, project_id)
);
CREATE INDEX brand_rules_project_idx ON public.brand_rules (project_id, kind);

ALTER TABLE public.brand_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand rules read" ON public.brand_rules FOR SELECT TO authenticated
  USING (internal.can_shape_project(project_id));
CREATE POLICY "brand rules insert" ON public.brand_rules FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()) AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = (select auth.uid())
  ));
CREATE POLICY "brand rules update" ON public.brand_rules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = (select auth.uid())));
CREATE POLICY "brand rules delete" ON public.brand_rules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.creator_id = (select auth.uid())));
REVOKE ALL ON public.brand_rules FROM anon, authenticated;
GRANT SELECT, DELETE ON public.brand_rules TO authenticated;
GRANT INSERT (project_id, kind, text, severity) ON public.brand_rules TO authenticated;
GRANT UPDATE (kind, text, severity) ON public.brand_rules TO authenticated;

CREATE FUNCTION internal.ad_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.ad_touch_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER deliverables_touch_updated_at BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION internal.ad_touch_updated_at();
CREATE TRIGGER brand_rules_touch_updated_at BEFORE UPDATE ON public.brand_rules
  FOR EACH ROW EXECUTE FUNCTION internal.ad_touch_updated_at();

-- Only advertising and copywriting projects receive deliverable records.
CREATE FUNCTION internal.ad_deliverable_for_script()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.project_id is not null and exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.project_type in ('Advertising', 'Copywriting')
  ) then
    insert into public.deliverables (script_id, project_id, title)
    values (new.id, new.project_id, left(coalesce(nullif(btrim(new.title), ''), 'Untitled'), 200))
    on conflict (script_id) do nothing;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.ad_deliverable_for_script() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ad_deliverable_for_script AFTER INSERT ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION internal.ad_deliverable_for_script();

CREATE FUNCTION internal.ad_deliverables_for_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.project_type IN ('Advertising', 'Copywriting') then
    insert into public.deliverables (script_id, project_id, title)
    select s.id, s.project_id, left(coalesce(nullif(btrim(s.title), ''), 'Untitled'), 200)
    from public.scripts s where s.project_id = new.id
    on conflict (script_id) do nothing;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.ad_deliverables_for_project() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ad_deliverables_for_project AFTER UPDATE OF project_type ON public.projects
  FOR EACH ROW WHEN (new.project_type IS DISTINCT FROM old.project_type)
  EXECUTE FUNCTION internal.ad_deliverables_for_project();

CREATE FUNCTION internal.ad_reference_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.approved_at := null;
    new.approved_by := null;
  elsif new.status is distinct from old.status then
    if old.status = 'approved' then
      raise exception 'An approved reference cannot be changed; add a new draft' using errcode = '23514';
    end if;
    if new.status = 'approved' then
      new.approved_at := now();
      new.approved_by := (select auth.uid());
    else
      new.approved_at := null;
      new.approved_by := null;
    end if;
  else
    if old.status = 'approved' and (new.kind is distinct from old.kind or new.title is distinct from old.title or new.content is distinct from old.content) then
      raise exception 'An approved reference cannot be changed; add a new draft' using errcode = '23514';
    end if;
    if new.approved_at is distinct from old.approved_at or new.approved_by is distinct from old.approved_by then
      raise exception 'Reference approval can only change with its status' using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.ad_reference_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ad_reference_guard BEFORE INSERT OR UPDATE ON public.ad_references
  FOR EACH ROW EXECUTE FUNCTION internal.ad_reference_guard();

CREATE FUNCTION internal.ad_deliverable_title()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.deliverables
  set title = left(coalesce(nullif(btrim(new.title), ''), 'Untitled'), 200),
      updated_at = now()
  where script_id = new.id
    and title is distinct from left(coalesce(nullif(btrim(new.title), ''), 'Untitled'), 200);
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.ad_deliverable_title() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ad_deliverable_title AFTER UPDATE OF title ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION internal.ad_deliverable_title();

CREATE FUNCTION internal.ad_entity_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  entity_id uuid;
  project uuid;
  entity_kind text;
  entity_label text;
begin
  if tg_op = 'DELETE' then
    if tg_table_name = 'deliverables' then
      delete from public.entities where id = old.script_id;
    else
      delete from public.entities where id = old.id;
    end if;
    return old;
  end if;

  if tg_table_name = 'deliverables' then
    entity_id := new.script_id;
    project := new.project_id;
    entity_kind := 'deliverable';
    entity_label := new.title;
  elsif tg_table_name = 'ad_references' then
    entity_id := new.id;
    project := new.project_id;
    entity_kind := 'ad_reference';
    entity_label := new.title;
  else
    entity_id := new.id;
    project := new.project_id;
    entity_kind := 'brand_rule';
    entity_label := 'Brand rule: ' || replace(new.kind, '_', ' ');
  end if;

  insert into public.entities (id, project_id, kind, label)
  values (entity_id, project, entity_kind, left(entity_label, 200))
  on conflict (id) do update
    set project_id = excluded.project_id, kind = excluded.kind,
        label = excluded.label, updated_at = now()
    where public.entities.project_id is distinct from excluded.project_id
      or public.entities.kind is distinct from excluded.kind
      or public.entities.label is distinct from excluded.label;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.ad_entity_sync() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ad_deliverable_entity_sync AFTER INSERT OR UPDATE OF project_id, kind, title ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION internal.ad_entity_sync();
CREATE TRIGGER ad_deliverable_entity_delete AFTER DELETE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION internal.ad_entity_sync();
CREATE TRIGGER ad_reference_entity_sync AFTER INSERT OR UPDATE OF project_id, title ON public.ad_references
  FOR EACH ROW EXECUTE FUNCTION internal.ad_entity_sync();
CREATE TRIGGER ad_reference_entity_delete AFTER DELETE ON public.ad_references
  FOR EACH ROW EXECUTE FUNCTION internal.ad_entity_sync();
CREATE TRIGGER brand_rule_entity_sync AFTER INSERT OR UPDATE OF project_id, kind ON public.brand_rules
  FOR EACH ROW EXECUTE FUNCTION internal.ad_entity_sync();
CREATE TRIGGER brand_rule_entity_delete AFTER DELETE ON public.brand_rules
  FOR EACH ROW EXECUTE FUNCTION internal.ad_entity_sync();

CREATE POLICY "reference links delete" ON public.links FOR DELETE TO authenticated
  USING (kind = 'reference' AND internal.can_access_project(project_id));

-- Existing scripts in an advertising project become copy pieces without changing their text.
UPDATE public.project_formats SET script_format = 'copy' WHERE name IN ('Advertising', 'Copywriting');
UPDATE public.scripts s
SET format = 'copy'
FROM public.projects p
WHERE p.id = s.project_id AND p.project_type IN ('Advertising', 'Copywriting');
INSERT INTO public.deliverables (script_id, project_id, title)
SELECT s.id, s.project_id, left(coalesce(nullif(btrim(s.title), ''), 'Untitled'), 200)
FROM public.scripts s
JOIN public.projects p ON p.id = s.project_id
WHERE p.project_type IN ('Advertising', 'Copywriting')
ON CONFLICT (script_id) DO NOTHING;

ALTER TABLE public.ad_references REPLICA IDENTITY FULL;
ALTER TABLE public.brand_rules REPLICA IDENTITY FULL;
ALTER TABLE public.deliverables REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_references;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverables;

-- In ad projects, every deliverable must have a latest sent version approved by
-- the client and confirmed by the team before the approval gate can pass.
CREATE OR REPLACE FUNCTION internal.approval_pending(p_project uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  format_name text;
  outstanding integer;
begin
  select p.project_type into format_name from public.projects p where p.id = p_project;
  if format_name in ('Advertising', 'Copywriting') then
    select count(*) into outstanding
    from public.deliverables d
    left join lateral (
      select v.guest_decision, v.confirmed_at
      from public.item_versions v
      where v.script_id = d.script_id and v.project_id = d.project_id and v.status = 'sent'
      order by v.number desc
      limit 1
    ) latest on true
    where d.project_id = p_project
      and (latest.guest_decision is distinct from 'approved' or latest.confirmed_at is null);
    return greatest(outstanding, 1);
  end if;
  with latest as (
    select distinct on (script_id) script_id, guest_decision, confirmed_at
    from public.item_versions
    where project_id = p_project and status = 'sent'
    order by script_id, number desc
  )
  select case when count(*) = 0 then 1
              else (count(*) filter (where guest_decision is distinct from 'approved' or confirmed_at is null))::integer
         end
    into outstanding
    from latest;
  return outstanding;
end;
$function$;
REVOKE ALL ON FUNCTION internal.approval_pending(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_review(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.review_links;
begin
  l := internal.live_review_link(p_token);
  if l.id is null then return null; end if;
  return jsonb_build_object(
    'layer', l.layer,
    'label', l.label,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'number', v.number,
        'label', v.label,
        'script_title', s.title,
        'script_format', s.format,
        'snapshot', v.snapshot,
        'sent_at', v.sent_at,
        'decision', v.guest_decision,
        'decided_at', v.guest_decided_at,
        'decided_by', v.guest_name,
        'comments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'name', coalesce(c.guest_name, (select p.username from public.profiles p where p.id = c.author_id), 'The team'),
            'from_team', c.author_id is not null,
            'body', c.body,
            'at', c.created_at) order by c.created_at)
          from public.review_comments c where c.version_id = v.id), '[]'::jsonb)
      ) order by v.script_id, v.number)
      from public.item_versions v join public.scripts s on s.id = v.script_id
      where v.id = any (l.version_ids) and v.status = 'sent'), '[]'::jsonb));
end;
$function$;
REVOKE ALL ON FUNCTION public.get_review(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review(text) TO anon, authenticated, service_role;