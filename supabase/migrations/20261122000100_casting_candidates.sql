-- Casting candidates: a shortlist per role, side by side (4.15 / wishlist 8).
-- A candidate is a person on the platform (user_id) or just a name; each has a status, a reel link and a note.

create table if not exists public.casting_candidates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  character_name text not null,
  name text not null check (length(btrim(name)) between 1 and 120),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'shortlisted' check (status in ('shortlisted', 'callback', 'passed')),
  reel_url text check (reel_url is null or reel_url ~* '^https?://'),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.casting_candidates enable row level security;

create policy "casting_candidates_select" on public.casting_candidates
  for select using (internal.can_access_project(project_id));
create policy "casting_candidates_insert" on public.casting_candidates
  for insert with check (internal.is_project_creator(project_id));
create policy "casting_candidates_update" on public.casting_candidates
  for update using (internal.is_project_creator(project_id)) with check (internal.is_project_creator(project_id));
create policy "casting_candidates_delete" on public.casting_candidates
  for delete using (internal.is_project_creator(project_id));

create index casting_candidates_project_id_idx on public.casting_candidates (project_id, character_name);
create index casting_candidates_user_id_idx on public.casting_candidates (user_id);
create index casting_candidates_created_by_idx on public.casting_candidates (created_by);
