import { supabase } from './client';

/** The owner approves the budget, or withdraws the approval. The database stamps who, when and the figures; only the owner's update reaches the row. */
export async function setBudgetApproved(projectId: string, approve: boolean): Promise<void> {
  const { data, error } = await supabase.from('projects').update({ budget_approved_at: approve ? new Date().toISOString() : null }).eq('id', projectId).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Only the project owner can approve the budget.');
}
