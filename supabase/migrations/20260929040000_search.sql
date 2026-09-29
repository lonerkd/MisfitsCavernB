-- Suite-wide search: one query across the work someone can open.
--
-- search_suite(query) matches word starts ("harb nig" finds "HARBOR - NIGHT")
-- across the caller's projects — their titles and loglines, scripts (and
-- what's written in them), scenes, characters, library items, locations,
-- paperwork, tasks and cut notes — plus open jobs and people in the crew
-- directory. It runs with the caller's rights, so every table's own policy
-- decides what comes back; project work is further limited to projects the
-- caller owns or is confirmed crew on (public projects by others aren't
-- "your work"). Sample people stay out, as in the directory.

-- What's written in scripts is the largest text searched; index it.
CREATE INDEX scripts_content_search_idx ON public.scripts USING gin (to_tsvector('simple'::regconfig, coalesce(content, '')));

CREATE FUNCTION public.search_suite(p_query text, p_limit integer DEFAULT 30)
 RETURNS TABLE(kind text, id uuid, project_id uuid, title text, detail text, rank real)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with words as (
    -- Words are whatever sits between spaces and punctuation ("mara_okafor",
    -- "INT." and "night-shift" all work), each matched as a word start.
    select to_tsquery('simple'::regconfig, string_agg(w || ':*', ' & ')) as q
      from regexp_split_to_table(lower(coalesce(p_query, '')), '[^[:alnum:]]+') w
     where w <> ''
  ),
  mine as (
    select p.id from public.projects p where p.creator_id = (select auth.uid())
    union
    select c.project_id from public.project_crew c
     where c.user_id = (select auth.uid()) and coalesce(c.status, 'confirmed') = 'confirmed'
  ),
  hits as (
    (select 'project'::text as kind, p.id, p.id as project_id, p.title, p.description as detail,
            ts_rank(to_tsvector('simple'::regconfig, p.title || ' ' || coalesce(p.description, '')), w.q)
              + case when to_tsvector('simple'::regconfig, p.title) @@ w.q then 1 else 0 end as rank
       from words w join public.projects p on p.id in (select id from mine)
      where to_tsvector('simple'::regconfig, p.title || ' ' || coalesce(p.description, '')) @@ w.q
      order by rank desc limit 6)
    union all
    (select 'script', s.id, s.project_id, s.title,
            case when to_tsvector('simple'::regconfig, s.title) @@ w.q then null
                 else ts_headline('simple'::regconfig, coalesce(s.content, ''), w.q, 'StartSel="",StopSel="",MaxWords=14,MinWords=6,MaxFragments=1') end,
            ts_rank(to_tsvector('simple'::regconfig, coalesce(s.content, '')), w.q)
              + case when to_tsvector('simple'::regconfig, s.title) @@ w.q then 1 else 0 end
       from words w join public.scripts s on (s.project_id in (select id from mine) or s.created_by = (select auth.uid()))
      where to_tsvector('simple'::regconfig, s.title) @@ w.q
         or to_tsvector('simple'::regconfig, coalesce(s.content, '')) @@ w.q
      order by 6 desc limit 6)
    union all
    (select 'scene', sc.id, sc.project_id, coalesce(sc.heading, sc.title), sc.note,
            ts_rank(to_tsvector('simple'::regconfig, coalesce(sc.heading, sc.title) || ' ' || coalesce(sc.note, '')), w.q) + 0.5
       from words w join public.scenes sc on sc.project_id in (select id from mine) and sc.removed_at is null
      where to_tsvector('simple'::regconfig, coalesce(sc.heading, sc.title) || ' ' || coalesce(sc.note, '')) @@ w.q
      order by 6 desc limit 6)
    union all
    (select 'character', ch.id, s.project_id, ch.name, ch.description,
            ts_rank(to_tsvector('simple'::regconfig, ch.name || ' ' || coalesce(ch.description, '')), w.q) + 0.5
       from words w join public.script_characters ch on true
       join public.scripts s on s.id = ch.script_id and (s.project_id in (select id from mine) or s.created_by = (select auth.uid()))
      where to_tsvector('simple'::regconfig, ch.name || ' ' || coalesce(ch.description, '')) @@ w.q
      order by 6 desc limit 6)
    union all
    (select 'media', m.id, m.project_id, m.title, m.notes,
            ts_rank(to_tsvector('simple'::regconfig, m.title || ' ' || coalesce(m.notes, '')), w.q) + 0.5
       from words w join public.media m on m.project_id in (select id from mine)
      where to_tsvector('simple'::regconfig, m.title || ' ' || coalesce(m.notes, '')) @@ w.q
      order by 6 desc limit 6)
    union all
    (select 'location', l.id, l.project_id, l.name, l.notes,
            ts_rank(to_tsvector('simple'::regconfig, l.name || ' ' || coalesce(l.notes, '')), w.q) + 0.5
       from words w join public.project_locations l on l.project_id in (select id from mine)
      where to_tsvector('simple'::regconfig, l.name || ' ' || coalesce(l.notes, '')) @@ w.q
      order by 6 desc limit 6)
    union all
    (select 'document', d.id, d.project_id, d.title, d.notes,
            ts_rank(to_tsvector('simple'::regconfig, d.title || ' ' || coalesce(d.notes, '')), w.q) + 0.5
       from words w join public.project_documents d on d.project_id in (select id from mine)
      where to_tsvector('simple'::regconfig, d.title || ' ' || coalesce(d.notes, '')) @@ w.q
      order by 6 desc limit 6)
    union all
    (select 'task', t.id, t.project_id, t.title, null::text,
            ts_rank(to_tsvector('simple'::regconfig, t.title), w.q) + 0.5
       from words w join public.project_tasks t on t.project_id in (select id from mine)
      where to_tsvector('simple'::regconfig, t.title) @@ w.q
      order by 6 desc limit 6)
    union all
    (select 'note', n.id, n.project_id, left(n.body, 120), null::text,
            ts_rank(to_tsvector('simple'::regconfig, n.body), w.q)
       from words w join public.post_notes n on n.project_id in (select id from mine)
      where to_tsvector('simple'::regconfig, n.body) @@ w.q
      order by 6 desc limit 6)
    union all
    (select 'job', j.id, j.project_id, j.title, j.role,
            ts_rank(to_tsvector('simple'::regconfig, j.title || ' ' || j.role || ' ' || coalesce(j.description, '')), w.q)
       from words w join public.jobs j on j.status = 'open'
      where to_tsvector('simple'::regconfig, j.title || ' ' || j.role || ' ' || coalesce(j.description, '')) @@ w.q
      order by 6 desc limit 6)
    union all
    (select 'person', pr.id, null::uuid, pr.username, pr.role,
            ts_rank(to_tsvector('simple'::regconfig, pr.username || ' ' || coalesce(pr.role, '')), w.q)
       from words w join public.profiles pr on not pr.is_sample
      where to_tsvector('simple'::regconfig, pr.username || ' ' || coalesce(pr.role, '')) @@ w.q
      order by 6 desc limit 6)
  )
  select h.kind, h.id, h.project_id, h.title, h.detail, h.rank::real
    from hits h
   order by h.rank desc, h.title
   limit least(greatest(coalesce(p_limit, 30), 1), 60);
$function$;
REVOKE ALL ON FUNCTION public.search_suite(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_suite(text, integer) TO authenticated;
