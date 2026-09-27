// The breakdown data layer. Takes the Supabase client as a parameter: the app
// passes its browser client (lib/breakdown/index.ts), integration tests pass a
// signed-in persona, so the tests exercise this exact code.

import type { Client } from '@/lib/studio/api';
import type { BreakdownCategory, BreakdownElement, ElementStatus, SceneElementTag } from './core';
import { categoryKey, nameKey } from './core';

function fail(error: { message?: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

const num = (v: unknown) => (v == null ? null : Number(v));
const toCategory = (r: Record<string, unknown>): BreakdownCategory => ({ ...(r as unknown as BreakdownCategory), unit_cost: Number(r.unit_cost) || 0 });
const toElement = (r: Record<string, unknown>): BreakdownElement => ({ ...(r as unknown as BreakdownElement), cost: num(r.cost) });

export type ElementPatch = Partial<Pick<BreakdownElement, 'name' | 'notes' | 'status' | 'cost' | 'assigned_to' | 'category_id'>>;
export type CategoryPatch = Partial<Pick<BreakdownCategory, 'label' | 'color' | 'position' | 'unit_cost'>>;

export function createBreakdownApi(db: Client) {
  async function listCategories(projectId: string): Promise<BreakdownCategory[]> {
    const { data, error } = await db.from('breakdown_categories').select('*').eq('project_id', projectId).order('position');
    if (error) fail(error, 'Could not load breakdown categories');
    return data.map(toCategory);
  }

  async function addCategory(projectId: string, label: string, color: string, existingKeys: Set<string>, position: number): Promise<BreakdownCategory> {
    const { data, error } = await db.from('breakdown_categories')
      .insert({ project_id: projectId, key: categoryKey(label, existingKeys), label: label.trim(), color, position })
      .select('*').single();
    if (error) fail(error, 'Could not add the category');
    return toCategory(data);
  }

  async function updateCategory(id: string, patch: CategoryPatch): Promise<BreakdownCategory> {
    const { data, error } = await db.from('breakdown_categories').update(patch).eq('id', id).select('*').single();
    if (error) fail(error, 'Could not update the category');
    return toCategory(data);
  }

  async function deleteCategory(id: string): Promise<void> {
    const { data, error } = await db.from('breakdown_categories').delete().eq('id', id).select('id');
    if (error) fail(error, 'Could not delete the category');
    if (!data.length) throw new Error('Only the project owner can delete a category');
  }

  async function listElements(projectId: string): Promise<BreakdownElement[]> {
    const { data, error } = await db.from('breakdown_elements').select('*').eq('project_id', projectId);
    if (error) fail(error, 'Could not load the breakdown');
    return data.map(toElement);
  }

  async function updateElement(id: string, patch: ElementPatch): Promise<BreakdownElement> {
    const { data, error } = await db.from('breakdown_elements').update(patch).eq('id', id).select('*').single();
    if (error) fail(error, error.code === '23505' ? 'Another element already has that name' : 'Could not update the element');
    return toElement(data);
  }

  async function deleteElement(id: string): Promise<void> {
    const { error } = await db.from('breakdown_elements').delete().eq('id', id);
    if (error) fail(error, 'Could not delete the element');
  }

  async function listTags(projectId: string): Promise<SceneElementTag[]> {
    const { data, error } = await db.from('scene_elements').select('*').eq('project_id', projectId);
    if (error) fail(error, 'Could not load scene tags');
    return data;
  }

  /** Tags the element in the scene, creating it (in `categoryId`) if the project doesn't have it yet. */
  async function tag(sceneId: string, name: string, categoryId: string): Promise<string> {
    const { data, error } = await db.rpc('tag_scene_element', { p_scene: sceneId, p_name: name, p_category: categoryId });
    if (error) fail(error, 'Could not tag the element');
    return data as string;
  }

  async function untag(sceneId: string, elementId: string): Promise<void> {
    const { error } = await db.from('scene_elements').delete().eq('scene_id', sceneId).eq('element_id', elementId);
    if (error) fail(error, 'Could not remove the tag');
  }

  async function listDismissed(projectId: string): Promise<Array<{ project_id: string; name_key: string }>> {
    const { data, error } = await db.from('breakdown_dismissals').select('project_id, name_key').eq('project_id', projectId);
    if (error) fail(error, 'Could not load dismissed suggestions');
    return data;
  }

  async function dismiss(projectId: string, name: string): Promise<{ project_id: string; name_key: string }> {
    const key = nameKey(name).slice(0, 120);
    if (!key) throw new Error('Nothing to dismiss');
    const { error } = await db.from('breakdown_dismissals').upsert({ project_id: projectId, name_key: key }, { onConflict: 'project_id,name_key', ignoreDuplicates: true });
    if (error) fail(error, 'Could not dismiss the suggestion');
    return { project_id: projectId, name_key: key };
  }

  async function undismiss(projectId: string, nameKeyValue: string): Promise<void> {
    const { error } = await db.from('breakdown_dismissals').delete().eq('project_id', projectId).eq('name_key', nameKeyValue);
    if (error) fail(error, 'Could not restore the suggestion');
  }

  /**
   * Writes the breakdown's cost into the budget: one line per category with a
   * cost ("Breakdown · Props"), updated in place, and removes breakdown lines
   * whose category no longer costs anything. Other budget lines are left alone.
   */
  async function syncBudget(projectId: string, costs: Array<{ label: string; amount: number }>): Promise<{ added: number; updated: number; removed: number }> {
    const { data: existing, error } = await db.from('budget_items').select('id, category, amount').eq('project_id', projectId).like('category', `${BUDGET_PREFIX}%`);
    if (error) fail(error, 'Could not load the budget');
    const want = new Map(costs.filter((c) => c.amount > 0).map((c) => [`${BUDGET_PREFIX}${c.label}`, Math.round(c.amount * 100) / 100]));
    let added = 0, updated = 0, removed = 0;
    for (const row of existing) {
      const amount = want.get(row.category);
      if (amount === undefined) {
        const { error: e } = await db.from('budget_items').delete().eq('id', row.id);
        if (e) fail(e, 'Could not update the budget');
        removed++;
      } else {
        if (Number(row.amount) !== amount) {
          const { error: e } = await db.from('budget_items').update({ amount }).eq('id', row.id);
          if (e) fail(e, 'Could not update the budget');
          updated++;
        }
        want.delete(row.category);
      }
    }
    for (const [category, amount] of Array.from(want)) {
      const { error: e } = await db.from('budget_items').insert({ project_id: projectId, category, amount });
      if (e) fail(e, 'Could not update the budget');
      added++;
    }
    return { added, updated, removed };
  }

  return {
    syncBudget,
    listCategories, addCategory, updateCategory, deleteCategory,
    listElements, updateElement, deleteElement,
    listTags, tag, untag,
    listDismissed, dismiss, undismiss,
  };
}

/** Budget lines the breakdown owns start with this. */
export const BUDGET_PREFIX = 'Breakdown · ';

export type BreakdownApi = ReturnType<typeof createBreakdownApi>;
export type { ElementStatus };
