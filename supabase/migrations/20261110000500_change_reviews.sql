-- Change review (4.12): accept/reject per change, stored per script (4.12).

create table if not exists public.change_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  change_key text not null,
  kind text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (project_id, script_id, change_key)
);

alter table public.change_reviews enable row level security;

create policy "change_reviews_select" on public.change_reviews
  for select using (public.can_access_project(project_id));
create policy "change_reviews_insert" on public.change_reviews
  for insert with check (public.can_shape_project(project_id));
create policy "change_reviews_delete" on public.change_reviews
  for delete using (public.can_shape_project(project_id));
