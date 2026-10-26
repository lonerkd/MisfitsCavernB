-- Ecosystem run log (opt-in mirror) for the external MisfitsEcosystem layer.
-- The ecosystem's own store is local SQLite; this table mirrors finished runs
-- into the production database for the owner's dashboards. Written only by
-- the service role key; RLS on with a service-role-only policy.

create table if not exists public.ecosystem_runs (
  id           uuid primary key default gen_random_uuid(),
  run_id       text not null unique,      -- run_xxxx from the local store
  job_id       text not null,
  kind         text,
  title        text,
  tier         text not null,             -- worker | manager | expert
  agent        text not null,             -- ollama | claudeCode | cline
  model        text,
  status       text not null,             -- running | succeeded | failed
  started_at   timestamptz not null,
  finished_at  timestamptz,
  duration_ms  integer,
  prompt_tokens integer,
  output_tokens integer,
  cost_usd     numeric,
  output       text,
  error        text,
  created_at   timestamptz not null default now()
);

alter table public.ecosystem_runs enable row level security;

create policy ecosystem_runs_owner_all on public.ecosystem_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists idx_ecosystem_runs_job
  on public.ecosystem_runs (job_id, started_at desc);
