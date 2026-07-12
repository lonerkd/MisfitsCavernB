import { supabase } from './client';
import type { Json } from './database.types';
import { parseScript } from '@/lib/scriptos/parser';

export type ElementCategory = 'props' | 'wardrobe' | 'vehicles' | 'sfx' | 'vfx';
export const ELEMENT_CATEGORIES: ElementCategory[] = ['props', 'wardrobe', 'vehicles', 'sfx', 'vfx'];

const BUDGET_RATE: Record<ElementCategory, number> = { props: 75, wardrobe: 120, vehicles: 400, sfx: 300, vfx: 500 };
const CATEGORY_LABEL: Record<ElementCategory, (n: number) => string> = {
  props: n => `Props (${n} items)`,
  wardrobe: n => `Wardrobe (${n} items)`,
  vehicles: n => `Vehicles (${n})`,
  sfx: n => `Special FX (${n})`,
  vfx: n => `Visual FX (${n})`,
};
const CATEGORY_PREFIX: Record<ElementCategory, string> = { props: 'Props (', wardrobe: 'Wardrobe (', vehicles: 'Vehicles (', sfx: 'Special FX (', vfx: 'Visual FX (' };

export interface SceneElements { props?: string[]; wardrobe?: string[]; vehicles?: string[]; sfx?: string[]; vfx?: string[] }

export async function syncSceneElementsFromScript(projectId: string, existingScenes: { id: string; scene_number: number }[]): Promise<Record<string, SceneElements>> {
  const { data } = await supabase.from('scripts').select('content').eq('project_id', projectId).order('updated_at', { ascending: false });
  const withContent = (data || []).find((s: any) => s.content && s.content.trim().length > 0);
  if (!withContent) throw new Error('No script content yet — write one in ScriptOS first.');

  const parsed = parseScript(withContent.content);
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
  const synced: { category: string; amount: number }[] = [];
  for (const cat of ELEMENT_CATEGORIES) {
    const set = new Set<string>();
    scenes.forEach(s => (s.elements?.[cat] || []).forEach(v => set.add(v)));
    const count = set.size;
    const existing = existingBudget.find(b => b.category.startsWith(CATEGORY_PREFIX[cat]));
    if (count === 0) {
      if (existing) await supabase.from('budget_items').delete().eq('id', existing.id);
      continue;
    }
    const category = CATEGORY_LABEL[cat](count);
    const amount = count * BUDGET_RATE[cat];
    if (existing) {
      await supabase.from('budget_items').update({ category, amount }).eq('id', existing.id);
    } else {
      await supabase.from('budget_items').insert({ project_id: projectId, category, amount });
    }
    synced.push({ category, amount });
  }
  return synced;
}
