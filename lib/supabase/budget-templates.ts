import { supabase } from './client';
import { parseTemplate, templateLineToItem, type BudgetTemplate } from '@/lib/studio/budget-templates';

/** The templates an admin keeps (micro, low, indie, studio…), smallest first. */
export async function listBudgetTemplates(): Promise<BudgetTemplate[]> {
  const { data, error } = await supabase.from('budget_templates').select('id,name,description,sort_order,lines').order('sort_order').order('name');
  if (error) throw error;
  return (data ?? []).map(parseTemplate);
}

/** Adds a template's lines to a project's budget through the ordinary budget write path (so `budget.write` decides who may). */
export async function applyBudgetTemplate(projectId: string, userId: string | null, template: BudgetTemplate): Promise<number> {
  if (!template.lines.length) return 0;
  const rows = template.lines.map((l) => ({ project_id: projectId, created_by: userId, ...templateLineToItem(l) }));
  const { error } = await supabase.from('budget_items').insert(rows);
  if (error) throw error;
  return rows.length;
}

/** Moves one line above or below the line. */
export async function setBudgetAboveTheLine(id: string, above: boolean): Promise<void> {
  const { error } = await supabase.from('budget_items').update({ above_the_line: above }).eq('id', id);
  if (error) throw error;
}
