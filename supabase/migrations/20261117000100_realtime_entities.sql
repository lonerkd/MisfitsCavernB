-- The film graph's labels (entities) are read live by useEntities, but the table was the one subscribed table left out of the
-- Realtime publication (20261029000000 added `links` and forgot `entities`), so a collaborator's rename never reached an open page.
-- RLS still decides who receives each change (the "entities read" policy). Idempotent: a project that already has it is left alone.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'entities'
  ) then
    alter publication supabase_realtime add table public.entities;
  end if;
end $$;
