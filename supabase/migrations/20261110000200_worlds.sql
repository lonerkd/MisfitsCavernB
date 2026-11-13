-- World building: stored, editable world per project (4.11).

create table if not exists public.worlds (
  project_id uuid primary key references public.projects(id) on delete cascade,
  locations jsonb not null default '[]'::jsonb,
  lore jsonb not null default '[]'::jsonb,
  rules jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.worlds enable row level security;

create policy "worlds_select" on public.worlds
  for select using (public.can_access_project(project_id));
create policy "worlds_insert" on public.worlds
  for insert with check (public.can_shape_project(project_id));
create policy "worlds_update" on public.worlds
  for update using (public.can_shape_project(project_id));
