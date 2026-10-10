// Release and promotion campaigns (Studio › Promos, Portfolio). RLS: the
// project's people read them; its shapers change them.
import { supabase } from './client';
import type { TablesUpdate } from './database.types';

/** Every platform used on a campaign this person can see (for suggestions). */
export async function listUsedPlatforms(limit = 500): Promise<string[]> {
  const { data, error } = await supabase.from('campaigns').select('platform').limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.platform);
}

export async function addCampaign(c: { projectId: string; userId: string; title: string; platform: string; audience: string | null; budget: number }): Promise<void> {
  const { error } = await supabase.from('campaigns').insert({
    project_id: c.projectId,
    title: c.title,
    platform: c.platform,
    created_by: c.userId,
    target_demographic: c.audience,
    budget: c.budget,
  });
  if (error) throw error;
}

export async function updateCampaign(id: string, patch: TablesUpdate<'campaigns'>): Promise<void> {
  const { error } = await supabase.from('campaigns').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw error;
}

/** Every project this person can see with its festival list, and every campaign — the portfolio's release view. */
export async function listReleases(): Promise<{
  projects: { id: string; title: string; festival_submissions: unknown }[];
  campaigns: { id: string; title: string; platform: string; budget: number | null; project_id: string }[];
}> {
  const [p, c] = await Promise.all([
    supabase.from('projects').select('id,title,festival_submissions'),
    supabase.from('campaigns').select('id,title,platform,budget,project_id'),
  ]);
  if (p.error) throw p.error;
  if (c.error) throw c.error;
  return { projects: p.data ?? [], campaigns: (c.data ?? []) as { id: string; title: string; platform: string; budget: number | null; project_id: string }[] };
}
