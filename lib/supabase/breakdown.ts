import { supabase } from './client';
import type { Json } from './database.types';
import { parseScript } from '@/lib/scriptos/parser';
import { ELEMENT_CATEGORIES, CATEGORY_PREFIX, aggregateElements, computeBudgetLines } from '@/lib/scriptos/breakdown';
import type { ElementCategory, SceneElements } from '@/lib/scriptos/breakdown';

export { ELEMENT_CATEGORIES };
export type { ElementCategory, SceneElements };

// Scene elements are kept current by the scene index sync (lib/studio): every
// scene row carries the elements parsed from its own action lines.

export async function syncBudgetFromSceneElements(
  projectId: string,
  scenes: { elements?: SceneElements }[],
  existingBudget: { id: string; category: string }[],
): Promise<{ category: string; amount: number }[]> {
  const aggregated = aggregateElements(scenes);
  const lines = computeBudgetLines(aggregated);
  const synced: { category: string; amount: number }[] = [];

  for (const cat of ELEMENT_CATEGORIES) {
    const existing = existingBudget.find(b => b.category.startsWith(CATEGORY_PREFIX[cat]));
    const line = lines.find(l => l.category.startsWith(CATEGORY_PREFIX[cat]));

    if (!line) {
      // Category has no elements: remove the stale line rather than leaving a
      // phantom cost in the budget.
      if (existing) await supabase.from('budget_items').delete().eq('id', existing.id);
      continue;
    }

    if (existing) {
      await supabase.from('budget_items').update({ category: line.category, amount: line.amount }).eq('id', existing.id);
    } else {
      await supabase.from('budget_items').insert({ project_id: projectId, category: line.category, amount: line.amount });
    }
    synced.push({ category: line.category, amount: line.amount });
  }

  return synced;
}
