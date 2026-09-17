import { supabase } from './client';
import type { Json } from './database.types';
import { parseScript } from '@/lib/scriptos/parser';
import { ELEMENT_CATEGORIES, CATEGORY_PREFIX, aggregateElements, computeBudgetLines } from '@/lib/scriptos/breakdown';
import type { ElementCategory, SceneElements } from '@/lib/scriptos/breakdown';

export { ELEMENT_CATEGORIES };
export type { ElementCategory, SceneElements };

export async function syncSceneElementsFromScript(projectId: string, existingScenes: { id: string; scene_number: number }[]): Promise<Record<string, SceneElements>> {
  const { data } = await supabase.from('scripts').select('content').eq('project_id', projectId).order('updated_at', { ascending: false });
  const withContent = (data || []).find((s: any) => s.content && s.content.trim().length > 0);
  if (!withContent) throw new Error('No script content yet — write one in ScriptOS first.');

  const parsed = parseScript(withContent.content ?? '');
  const parsedScenes = parsed.scenes.filter((s: any) => !s.omitted);
  const byNumber = new Map(existingScenes.map(s => [s.scene_number, s.id]));

  const updates: { id: string; elements: SceneElements }[] = [];
  const elementsById: Record<string, SceneElements> = {};
  parsedScenes.forEach((s: any, i: number) => {
    const num = i + 1;
    const sceneId = byNumber.get(num);
    if (!sceneId) return;
    const elements: SceneElements = s.elements || {};
    updates.push({ id: sceneId, elements });
    elementsById[sceneId] = elements;
  });

  if (updates.length === 0) return {};
  await Promise.all(updates.map(u => supabase.from('scenes').update({ elements: u.elements as unknown as Json }).eq('id', u.id)));
  return elementsById;
}

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
