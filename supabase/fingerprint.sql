-- Schema fingerprint: one canonical, sorted line per schema object the app
-- depends on. Run it against two databases and diff the output — any line that
-- differs is drift. Used by `npm run db:drift` (local vs a target DB).
--
-- Covers public + internal (tables, columns, constraints, indexes, RLS,
-- policies, functions + their privileges, views, triggers) plus the storage
-- buckets/policies and realtime publication the app relies on. Function bodies
-- are hashed so the output stays short; any change to a body changes its line.
with
fn as (
  select p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) args
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'internal')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
lines as (
  select 'column ' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
         || coalesce(' default ' || pg_get_expr(ad.adbin, ad.adrelid), '')
         || case when a.attnotnull then ' not null' else '' end as line
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
  where c.relkind in ('r', 'v')
  union all
  select 'constraint ' || c.relname || '.' || con.conname || ' ' || pg_get_constraintdef(con.oid)
  from pg_constraint con join pg_class c on c.oid = con.conrelid
  where c.relnamespace = 'public'::regnamespace
  union all
  select 'index ' || indexdef from pg_indexes where schemaname = 'public'
  union all
  select 'rls ' || relname || ' enabled=' || relrowsecurity || ' forced=' || relforcerowsecurity
  from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
  union all
  select 'policy ' || schemaname || '.' || tablename || ' "' || policyname || '" ' || permissive || ' ' || cmd
         || ' to ' || array_to_string(array(select r from unnest(roles) r order by r collate "C"), ',')
         || ' using ' || coalesce(regexp_replace(qual, '\s+', ' ', 'g'), '-')
         || ' check ' || coalesce(regexp_replace(with_check, '\s+', ' ', 'g'), '-')
  from pg_policies
  where schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects')
  union all
  select 'function ' || fn.nspname || '.' || fn.proname || '(' || fn.args || ') body=' || md5(pg_get_functiondef(fn.oid))
  from fn
  union all
  select 'grant function ' || fn.nspname || '.' || fn.proname || '(' || fn.args || ') '
         || coalesce((select string_agg(r, ',' order by r collate "C")
                      from (select case when g.grantee = 0 then 'PUBLIC' else g.grantee::regrole::text end as r
                      from aclexplode(p.proacl) g where g.privilege_type = 'EXECUTE') grantees), '<default>')
  from fn join pg_proc p on p.oid = fn.oid
  union all
  select 'view ' || viewname || ' ' || md5(definition) from pg_views where schemaname = 'public'
  union all
  select 'view-options ' || relname || ' ' || coalesce(reloptions::text, '-')
  from pg_class where relnamespace = 'public'::regnamespace and relkind = 'v'
  union all
  select 'trigger ' || pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  where not t.tgisinternal and c.relnamespace in ('public'::regnamespace, 'auth'::regnamespace)
  union all
  select 'event-trigger ' || evtname || ' ' || evtevent || ' ' || evtfoid::regproc::text
  from pg_event_trigger where evtname = 'ensure_rls'
  union all
  select 'bucket ' || id || ' public=' || public || ' limit=' || coalesce(file_size_limit::text, '-')
         || ' mime=' || coalesce(allowed_mime_types::text, '-')
  from storage.buckets
  union all
  select 'realtime ' || schemaname || '.' || tablename
  from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'
  union all
  select 'schema ' || nspname from pg_namespace where nspname in ('public', 'internal')
)
select line from lines order by line collate "C";
