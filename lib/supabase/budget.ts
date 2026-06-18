import { supabase } from './client';
import { logActivity } from './activity';

export interface DBBudgetItem {
  id: string;
  project_id: string;
  category: string;
  description: string;
  amount: number;
  actual_cost: number | null;
  job_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getBudgetItems(projectId: string): Promise<DBBudgetItem[]> {
  const { data, error } = await supabase
    .from('budget_items')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createBudgetItem(projectId: string, item: { category: string; description: string; amount: number }): Promise<DBBudgetItem> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('budget_items')
    .insert({ project_id: projectId, ...item, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  if (user) await logActivity(user.id, 'added_budget_item', 'project', projectId, { category: item.category, amount: item.amount });
  return data;
}

export async function updateBudgetItem(id: string, updates: Partial<Pick<DBBudgetItem, 'category' | 'description' | 'amount' | 'actual_cost' | 'job_id'>>): Promise<DBBudgetItem> {
  const { data, error } = await supabase
    .from('budget_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBudgetItem(id: string): Promise<void> {
  const { error } = await supabase.from('budget_items').delete().eq('id', id);
  if (error) throw error;
}

// The interconnection: a budget line generates a real job posting, and the
// line remembers which job it spawned so "Hire for this" only ever fires once.
export async function createJobFromBudgetItem(item: DBBudgetItem, projectId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      project_id: projectId,
      title: item.description || item.category,
      description: `Budgeted at $${Number(item.amount).toLocaleString()} for "${item.category}".`,
      role: item.category,
      rate: item.amount,
      created_by: user.id,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw error;

  await updateBudgetItem(item.id, { job_id: job.id });
  await logActivity(user.id, 'posted_job_from_budget', 'job', job.id, { project_id: projectId, budget_item_id: item.id });
  return job.id;
}

export function subscribeToBudgetItems(projectId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`budget_items:${projectId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items', filter: `project_id=eq.${projectId}` }, callback)
    .subscribe();
}
