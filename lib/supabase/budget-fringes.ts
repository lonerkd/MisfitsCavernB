import { supabase } from './client';
import type { Tables } from '@/lib/supabase/database.types';

export type BudgetFringe = Tables<'budget_fringes'>;
export type BudgetItemFringe = Pick<Tables<'budget_item_fringes'>, 'budget_item_id' | 'fringe_id'>;

const failing = (error: { code?: string; message?: string }, fallback: string) =>
  Object.assign(new Error(error.code === '23505' ? 'There is already a fringe with that name.' : fallback), { code: error.code });

/** The project's fringes (name, percent, optional cap per line), by name. */
export async function listFringes(projectId: string): Promise<BudgetFringe[]> {
  const { data, error } = await supabase.from('budget_fringes').select('*').eq('project_id', projectId).order('name');
  if (error) throw failing(error, 'Could not load the fringes.');
  return data ?? [];
}

/** Which fringe is applied to which line. */
export async function listFringeLinks(projectId: string): Promise<BudgetItemFringe[]> {
  const { data, error } = await supabase.from('budget_item_fringes').select('budget_item_id, fringe_id').eq('project_id', projectId);
  if (error) throw failing(error, 'Could not load which fringes are applied.');
  return data ?? [];
}

export async function addFringe(projectId: string, userId: string | null, name: string, percent: number, cap: number | null): Promise<BudgetFringe> {
  const { data, error } = await supabase.from('budget_fringes')
    .insert({ project_id: projectId, name: name.trim(), percent, cap_per_line: cap, created_by: userId }).select('*').single();
  if (error) throw failing(error, 'Could not add the fringe.');
  return data;
}

export async function deleteFringe(id: string): Promise<void> {
  const { error } = await supabase.from('budget_fringes').delete().eq('id', id);
  if (error) throw failing(error, 'Could not delete the fringe.');
}

/** Applies a fringe to a line, or takes it off. The database recomputes the line's fringe. */
export async function setLineFringe(projectId: string, itemId: string, fringeId: string, on: boolean): Promise<void> {
  const q = on
    ? supabase.from('budget_item_fringes').insert({ project_id: projectId, budget_item_id: itemId, fringe_id: fringeId })
    : supabase.from('budget_item_fringes').delete().eq('budget_item_id', itemId).eq('fringe_id', fringeId);
  const { error } = await q;
  if (error) throw failing(error, on ? 'Could not apply the fringe.' : 'Could not take the fringe off.');
}

/** A per diem or allowance: days x daily rate x people. The database sets the line's amount from the three. */
export async function addPerDiem(projectId: string, userId: string | null, name: string, days: number, rate: number, people: number): Promise<void> {
  const { error } = await supabase.from('budget_items').insert({
    project_id: projectId, created_by: userId, category: name.trim(), kind: 'per_diem', pd_days: days, pd_rate: rate, pd_people: people,
    amount: Math.round(days * rate * people * 100) / 100,
  });
  if (error) throw failing(error, 'Could not add the per diem.');
}
