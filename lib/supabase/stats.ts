import { supabase } from './client';

export interface PlatformStats {
  users: number;
  projects: number;
  scripts: number;
  jobs: number;
  media: number;
}

/** Real platform-wide totals (a counts-only RPC; counting through RLS would show each person their own). Throws if the call fails. */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc('get_platform_stats');
  const row = data?.[0];
  if (error || !row) throw new Error(error?.message ?? 'get_platform_stats returned no row');
  return { users: Number(row.creators), projects: Number(row.projects), scripts: Number(row.scripts), jobs: Number(row.jobs), media: Number(row.media) };
}

/** Runs `attempt`, and again up to `retries` more times (waiting `delayMs` × attempt number between) — rejects with the last error only after the final attempt fails. */
export async function withRetry<T>(attempt: () => Promise<T>, retries = 2, delayMs = 400): Promise<T> {
  for (let n = 0; ; n++) {
    try {
      return await attempt();
    } catch (error) {
      if (n >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (n + 1)));
    }
  }
}

/** The admin dashboard's loader: retries a transient failure twice, then rejects so the caller can show its error state. */
export function fetchPlatformStatsWithRetry(): Promise<PlatformStats> {
  return withRetry(fetchPlatformStats);
}

/** Totals for surfaces that show zeros when the numbers are unavailable (home, analytics). Never rejects; use `fetchPlatformStatsWithRetry` where a failure must be visible. */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    return await fetchPlatformStats();
  } catch {
    return { users: 0, projects: 0, scripts: 0, jobs: 0, media: 0 };
  }
}
