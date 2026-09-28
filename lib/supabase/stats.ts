import { supabase } from './client';

export interface PlatformStats {
  users: number;
  projects: number;
  scripts: number;
  jobs: number;
  media: number;
}

/** Real platform-wide totals (a counts-only RPC; counting through RLS would show each person their own). */
export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc('get_platform_stats');
  const row = data?.[0];
  if (error || !row) return { users: 0, projects: 0, scripts: 0, jobs: 0, media: 0 };
  return { users: Number(row.creators), projects: Number(row.projects), scripts: Number(row.scripts), jobs: Number(row.jobs), media: Number(row.media) };
}
