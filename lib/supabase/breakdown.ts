import { supabase } from './client';
import { parseScript } from '@/lib/scriptos/parser';

// The real script -> schedule -> budget breakdown hinge (build spec's
// "single highest-leverage fix"): re-parse the script, persist each scene's
// tagged production elements onto scenes.elements, then roll every category
// up into budget_items — so tagging an element on a scene actually reaches
// the stripboard and the budget, live, instead of rendering fake demo tags.

export type ElementCategory = 'props' | 'wardrobe' | 'vehicles' | 'sfx' | 'vfx';
export const ELEMENT_CATEGORIES: ElementCategory[] = ['props', 'wardrobe', 'vehicles', 'sfx', 'vfx'];

// Per-item budget rate and the exact category-label convention already used
// by the projects hub's one-shot budget suggestion, so a synced line item
// reads the same whether it came from there or from here.
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

// Re-parse the project's latest non-empty script, match scenes to the
// existing schedule by scene_number (same numbering importScenesFromScript
// uses), and write each scene's tagged elements back to scenes.elements.
// Returns the updated element map per scene id, for the caller to roll into
// budget without a second round-trip.
export async function syncSceneElementsFromScript(projectId: string, existingScenes: { id: string; scene_number: number }[]): Promise<Record<string, SceneElements>> {
  const { data } = await supabase.from('scripts').select('content').eq('project_id', projectId).order('updated_at', { ascending: false });
  const withContent = (data || []).find((s: any) => s.content && s.content.trim().length > 0);
  if (!withContent) throw new Error('No script content yet — write one in ScriptOS first.');

  const parsed = parseScript(withContent.content);
  const parsedScenes = parsed.scenes.filter((s: any) => !s.omitted);

  // Both this function and importScenesFromScript (app/studio/page.tsx)
  // number scenes by their position in the same "!omitted" filtered list, so
  // re-syncing stays aligned as long as which scenes are omitted hasn't
  // changed since the schedule was imported. If a later script revision
  // marks a previously-real scene OMITTED (or un-omits one), every scene
  // number after that point shifts — and without this check, the update
  // below would silently write one scene's breakdown tags onto a different
  // scene's row (same failure mode a page-eighths/DOOD recount would want
  // caught too). Bail with a clear error instead of misassigning data.
  const existingNums = new Set(existingScenes.map(s => s.scene_number));
  const parsedNums = new Set(parsedScenes.map((_: any, i: number) => i + 1));
  const numsMatch = existingNums.size === parsedNums.size && [...existingNums].every(n => parsedNums.has(n));
  if (!numsMatch) {
    throw new Error('The script\'s scene numbering no longer matches the imported schedule (a scene was likely marked OMITTED or restored since the schedule was imported). Re-import the schedule from ScriptOS before syncing the breakdown, so scenes don\'t get mismatched.');
  }

  const byNumber = new Map(existingScenes.map(s => [s.scene_number, s.id]));

  const updates: { id: string; elements: SceneElements }[] = [];
  const elementsById: Record<string, SceneElements> = {};
  parsedScenes.forEach((s: any, i: number) => {
    const num = i + 1;
    const sceneId = byNumber.get(num);
    if (!sceneId) return; // scene not imported into the schedule yet
    const elements: SceneElements = s.elements || {};
    updates.push({ id: sceneId, elements });
    elementsById[sceneId] = elements;
  });

  if (updates.length === 0) return {};
  await Promise.all(updates.map(u => supabase.from('scenes').update({ elements: u.elements }).eq('id', u.id)));
  return elementsById;
}

// Aggregate unique element names per category across every scene, then
// upsert one budget_items row per non-empty category — matching by category
// prefix so a re-sync updates the existing row instead of duplicating it.
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
