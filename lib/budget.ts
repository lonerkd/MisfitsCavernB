import { supabaseAdmin } from '@/lib/supabase/server';

async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
  const { data: project } = await supabaseAdmin.from('projects').select('creator_id').eq('id', projectId).single();
  if (project?.creator_id === userId) return true;
  const { data: crew } = await supabaseAdmin.from('project_crew').select('id').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
  return !!crew;
}

export async function createBudgetItem(
  projectId: string,
  userId: string,
  category: string,
  description: string,
  amount: number
) {
  try {
    if (!(await isProjectMember(projectId, userId))) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: item, error } = await supabaseAdmin
      .from('budget_items')
      .insert({ project_id: projectId, category, description, amount, created_by: userId })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectBudget(projectId: string) {
  try {
    const { data: items, error } = await supabaseAdmin
      .from('budget_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) return { success: false, error: error.message };

    const totalBudgeted = (items || []).reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const totalActual = (items || []).reduce((sum, i) => sum + Number(i.actual_cost || 0), 0);

    return {
      success: true,
      items: items || [],
      summary: {
        totalBudgeted,
        totalActual,
        remaining: totalBudgeted - totalActual,
        percentUsed: totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 100) : 0,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBudgetItem(
  itemId: string,
  userId: string,
  projectId: string,
  data: {
    category?: string;
    description?: string;
    amount?: number;
    actual_cost?: number;
  }
) {
  try {
    if (!(await isProjectMember(projectId, userId))) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: item, error } = await supabaseAdmin
      .from('budget_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('project_id', projectId)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBudgetItem(
  itemId: string,
  userId: string,
  projectId: string
) {
  try {
    if (!(await isProjectMember(projectId, userId))) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabaseAdmin.from('budget_items').delete().eq('id', itemId).eq('project_id', projectId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function calculateCrewCosts(projectId: string) {
  try {
    const { data: crew, error } = await supabaseAdmin
      .from('project_crew')
      .select('role')
      .eq('project_id', projectId);

    if (error) return { success: false, error: error.message };

    // hourly_rate is not in the deployed project_crew schema — return empty costs
    const costs: { role: string; hourlyRate: number; estimatedMonthCost: number }[] = [];
    const totalMonthly = 0;

    return { success: true, costs, totalMonthly };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
