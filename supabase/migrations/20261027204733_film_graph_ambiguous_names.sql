-- List formatting-only name variants from the film-graph backfills for a person
-- to settle. This report never merges or changes a location or character.
CREATE VIEW public.film_graph_ambiguous_names WITH (security_invoker = true) AS
SELECT
  a.project_id,
  'location'::text AS entity_type,
  a.id AS entity_id_a,
  b.id AS entity_id_b,
  a.name AS name_a,
  b.name AS name_b
FROM public.project_locations a
JOIN public.project_locations b
  ON b.project_id = a.project_id
  AND a.name < b.name
  AND regexp_replace(a.name, '[^[:alnum:]]', '', 'g') <> ''
  AND regexp_replace(a.name, '[^[:alnum:]]', '', 'g') = regexp_replace(b.name, '[^[:alnum:]]', '', 'g')
UNION ALL
SELECT
  a.project_id,
  'character'::text AS entity_type,
  a.id AS entity_id_a,
  b.id AS entity_id_b,
  a.name AS name_a,
  b.name AS name_b
FROM public.characters a
JOIN public.characters b
  ON b.project_id = a.project_id
  AND a.name < b.name
  AND regexp_replace(a.name, '[^[:alnum:]]', '', 'g') <> ''
  AND regexp_replace(a.name, '[^[:alnum:]]', '', 'g') = regexp_replace(b.name, '[^[:alnum:]]', '', 'g');

GRANT SELECT ON public.film_graph_ambiguous_names TO authenticated;
REVOKE ALL ON public.film_graph_ambiguous_names FROM anon;
