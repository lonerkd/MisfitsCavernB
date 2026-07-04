import { supabase } from './client';

export interface PlatformStats {
  users: number;
  projects: number;
  scripts: number;
  jobs: number;
  concepts: number;
}

// The same "count profiles/projects/scripts/jobs" query was independently
// hand-written three times (homepage, /admin, /admin/analytics) with slightly
// different column selections despite all three using `head: true` (which
// returns a count only — any extra selected columns are silently ignored).
// One shared query now backs all three; each page maps the result onto
// whatever local field names its own UI already uses.
export async function getPlatformStats(): Promise<PlatformStats> {
  const [users, projects, scripts, jobs, concepts] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('scripts').select('id', { count: 'exact', head: true }),
    supabase.from('jobs').select('id', { count: 'exact', head: true }),
    supabase.from('concept_assets').select('id', { count: 'exact', head: true }),
  ]);
  return {
    users: users.count || 0,
    projects: projects.count || 0,
    scripts: scripts.count || 0,
    jobs: jobs.count || 0,
    concepts: concepts.count || 0,
  };
}
