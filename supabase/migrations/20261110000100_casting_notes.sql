-- Casting notes: per character, per project (4.15).

create table if not exists public.casting_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  character_name text not null,
  note text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.casting_notes enable row level security;

create policy "casting_notes_select" on public.casting_notes
  for select using (public.can_access_project(project_id));
create policy "casting_notes_insert" on public.casting_notes
  for insert with check (public.can_shape_project(project_id));
create policy "casting_notes_delete" on public.casting_notes
  for delete using (public.can_shape_project(project_id));
