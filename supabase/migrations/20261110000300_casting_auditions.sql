-- Casting auditions (4.15): a scheduled try-out per candidate per character.

create table if not exists public.casting_auditions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  character_name text not null,
  crew_user_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.casting_auditions enable row level security;

create policy "casting_auditions_select" on public.casting_auditions
  for select using (internal.can_access_project(project_id));
create policy "casting_auditions_insert" on public.casting_auditions
  for insert with check (internal.is_project_creator(project_id));
create policy "casting_auditions_update" on public.casting_auditions
  for update using (internal.is_project_creator(project_id));
create policy "casting_auditions_delete" on public.casting_auditions
  for delete using (internal.is_project_creator(project_id));

create index casting_auditions_project_id_idx on public.casting_auditions (project_id);
create index casting_auditions_crew_user_id_idx on public.casting_auditions (crew_user_id);
create index casting_auditions_created_by_idx on public.casting_auditions (created_by);
