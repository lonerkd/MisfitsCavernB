-- Story interview: stored, resumable answers per project (3.25).

create table if not exists public.story_interviews (
  project_id uuid primary key references public.projects(id) on delete cascade,
  structure_id text not null default 'none',
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.story_interviews enable row level security;

create policy "story_interviews_select" on public.story_interviews
  for select using (internal.can_access_project(project_id));
create policy "story_interviews_insert" on public.story_interviews
  for insert with check (internal.can_shape_project(project_id));
create policy "story_interviews_update" on public.story_interviews
  for update using (internal.can_shape_project(project_id));
