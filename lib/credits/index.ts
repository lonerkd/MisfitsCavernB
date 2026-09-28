import { supabase } from '@/lib/supabase/client';
import type { PersonCredit, ProjectCredits } from './core';

export * from './core';

/** A person's credits the caller may see (public projects, plus the caller's own teams'). */
export async function getPersonCredits(userId: string): Promise<PersonCredit[]> {
  const { data, error } = await supabase.rpc('get_person_credits', { p_user: userId });
  if (error) throw new Error(error.message);
  return (data ?? []) as PersonCredit[];
}

/** Turns a credit into a portfolio entry linked back to its project. */
export async function addCreditToPortfolio(userId: string, c: ProjectCredits): Promise<{ id: string; share_token: string | null }> {
  const { data, error } = await supabase.from('portfolio_projects')
    .insert({ user_id: userId, title: c.title, category: c.project_type, year: c.year, role: c.labels.join(' · ').slice(0, 200), source_project_id: c.project_id })
    .select('id, share_token').single();
  if (error) throw new Error(error.message);
  return data;
}
