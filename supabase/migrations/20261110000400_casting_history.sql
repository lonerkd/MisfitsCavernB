-- Casting decision history (4.15): who was cast, recast or released, and when.

create table if not exists public.casting_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  character_name text not null,
  action text not null,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.casting_history enable row level security;

create policy "casting_history_select" on public.casting_history
  for select using (public.can_access_project(project_id));
create policy "casting_history_insert" on public.casting_history
  for insert with check (public.can_shape_project(project_id));
