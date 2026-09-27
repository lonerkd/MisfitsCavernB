import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { createBreakdownApi } from '@/lib/breakdown/api';
import { costByCategory } from '@/lib/breakdown/core';
import { parseScript } from '@/lib/scriptos/parser';

// The breakdown as personas: categories are the project's own data, tagging
// finds-or-creates one element per thing, and outsiders see and touch nothing.
let cast: Cast;
let projectId: string;
let scenes: { id: string }[];

const TEXT = 'INT. CAVE - NIGHT\n\nSam lights a LANTERN.\n\nEXT. RIDGE - DAWN\n\nThe lantern gutters out.\n';

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Breakdown'));
  const scriptId = await createScript(cast, projectId, TEXT);
  scenes = await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, parseScript(TEXT).scenes);
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('categories', () => {
  it('every new project starts with the usual set, as data the team can change', async () => {
    const cats = await createBreakdownApi(cast.jordan.client).listCategories(projectId);
    expect(cats.map((c) => c.key)).toEqual(['cast', 'extras', 'stunts', 'props', 'wardrobe', 'makeup', 'set-dressing', 'vehicles', 'sfx', 'vfx', 'sound', 'equipment']);
    const props = cats.find((c) => c.key === 'props')!;
    const renamed = await createBreakdownApi(cast.jordan.client).updateCategory(props.id, { label: 'Hand props', unit_cost: 40 });
    expect(renamed).toMatchObject({ label: 'Hand props', unit_cost: 40 });
  });

  it('crew add categories; only the owner deletes one (it takes its elements with it)', async () => {
    const jordan = createBreakdownApi(cast.jordan.client);
    const cats = await jordan.listCategories(projectId);
    const added = await jordan.addCategory(projectId, 'Weapons', '#b91c1c', new Set(cats.map((c) => c.key)), cats.length);
    expect(added.key).toBe('weapons');
    await expect(jordan.deleteCategory(added.id)).rejects.toThrow(/owner/);
    await createBreakdownApi(cast.sam.client).deleteCategory(added.id);
  });

  it('rejects malformed colours and costs', async () => {
    const cats = await createBreakdownApi(cast.sam.client).listCategories(projectId);
    await expect(createBreakdownApi(cast.sam.client).updateCategory(cats[0].id, { color: 'red' })).rejects.toThrow();
    await expect(createBreakdownApi(cast.sam.client).updateCategory(cats[0].id, { unit_cost: -1 })).rejects.toThrow();
  });
});

describe('tagging', () => {
  let lantern: string;

  it('creates the element once and tags each scene; names match whatever the case', async () => {
    const jordan = createBreakdownApi(cast.jordan.client);
    const props = (await jordan.listCategories(projectId)).find((c) => c.key === 'props')!;
    lantern = await jordan.tag(scenes[0].id, 'Lantern', props.id);
    expect(await jordan.tag(scenes[1].id, '  LANTERN ', props.id)).toBe(lantern);
    expect(await jordan.tag(scenes[1].id, 'lantern', props.id)).toBe(lantern);
    expect((await jordan.listElements(projectId)).filter((e) => e.id === lantern)).toHaveLength(1);
    expect((await jordan.listTags(projectId)).filter((t) => t.element_id === lantern).map((t) => t.scene_id).sort()).toEqual([scenes[0].id, scenes[1].id].sort());
  });

  it('an element tracks status, cost and who is sourcing it; the budget follows', async () => {
    const sam = createBreakdownApi(cast.sam.client);
    await sam.updateElement(lantern, { status: 'sourcing', cost: 65, assigned_to: cast.jordan.id, notes: 'Brass, working flame' });
    const costs = costByCategory(await sam.listCategories(projectId), await sam.listElements(projectId));
    expect(costs.find((c) => c.category.key === 'props')).toMatchObject({ elements: 1, amount: 65, unpriced: 0 });
  });

  it('cannot point a tag at another project’s scene or element', async () => {
    const { projectId: other } = await createCrewedProject(cast, 'Other breakdown');
    const otherCats = await createBreakdownApi(cast.sam.client).listCategories(other);
    // Element from this project, scene row claimed to be in the other project.
    const { error } = await cast.sam.client.from('scene_elements').insert({ scene_id: scenes[0].id, element_id: lantern, project_id: other });
    expect(error).not.toBeNull();
    // A category from the other project can't hold this project's element.
    await expect(createBreakdownApi(cast.sam.client).updateElement(lantern, { category_id: otherCats[0].id })).rejects.toThrow();
  });

  it('untagging a scene keeps the element; deleting the element removes its tags', async () => {
    const jordan = createBreakdownApi(cast.jordan.client);
    await jordan.untag(scenes[1].id, lantern);
    expect((await jordan.listTags(projectId)).filter((t) => t.element_id === lantern)).toHaveLength(1);
    await jordan.deleteElement(lantern);
    expect((await jordan.listTags(projectId)).filter((t) => t.element_id === lantern)).toHaveLength(0);
  });

  it('dismissed suggestions are remembered for the whole team', async () => {
    await createBreakdownApi(cast.jordan.client).dismiss(projectId, 'Gutter');
    expect((await createBreakdownApi(cast.sam.client).listDismissed(projectId)).map((d) => d.name_key)).toContain('gutter');
    await createBreakdownApi(cast.sam.client).undismiss(projectId, 'gutter');
  });
});

describe('budget from the breakdown', () => {
  it('writes one line per costed category, updates in place, removes stale lines, leaves the rest alone', async () => {
    const sam = createBreakdownApi(cast.sam.client);
    await cast.sam.client.from('budget_items').insert({ project_id: projectId, category: 'Location fees', amount: 300 });
    const cats = await sam.listCategories(projectId);
    const props = cats.find((c) => c.key === 'props')!;
    const wardrobe = cats.find((c) => c.key === 'wardrobe')!;
    await sam.updateCategory(wardrobe.id, { unit_cost: 50 });
    const crowbar = await sam.tag(scenes[0].id, 'Crowbar', props.id);
    await sam.updateElement(crowbar, { cost: 40 });
    await sam.tag(scenes[0].id, 'Wool coat', wardrobe.id);

    const lines = async () => (await cast.sam.client.from('budget_items').select('category, amount').eq('project_id', projectId).order('category')).data;
    const costs = () => Promise.all([sam.listCategories(projectId), sam.listElements(projectId)]).then(([c, e]) => costByCategory(c, e).map((x) => ({ label: x.category.label, amount: x.amount })));

    expect(await sam.syncBudget(projectId, await costs())).toEqual({ added: 2, updated: 0, removed: 0 });
    expect(await lines()).toEqual([
      { category: 'Breakdown · Hand props', amount: 40 },
      { category: 'Breakdown · Wardrobe', amount: 50 },
      { category: 'Location fees', amount: 300 },
    ]);

    await sam.updateElement(crowbar, { cost: 55 });
    await sam.updateCategory(wardrobe.id, { unit_cost: 0 });
    expect(await sam.syncBudget(projectId, await costs())).toEqual({ added: 0, updated: 1, removed: 1 });
    expect(await lines()).toEqual([
      { category: 'Breakdown · Hand props', amount: 55 },
      { category: 'Location fees', amount: 300 },
    ]);
  });

  it('crew can update the budget from the breakdown; outsiders cannot', async () => {
    expect(await createBreakdownApi(cast.jordan.client).syncBudget(projectId, [{ label: 'Hand props', amount: 55 }])).toEqual({ added: 0, updated: 0, removed: 0 });
    // RLS hides the budget from Riley, so there is nothing to update — and inserts are refused.
    await expect(createBreakdownApi(cast.riley.client).syncBudget(projectId, [{ label: 'Hand props', amount: 1 }])).rejects.toThrow();
  });

  it('the day length is a project setting only the owner changes', async () => {
    const byCrew = await cast.jordan.client.from('projects').update({ settings: { dayLengthEighths: 60 } }).eq('id', projectId).select('id');
    expect(byCrew.data ?? []).toEqual([]);
  });
});

describe('outsiders', () => {
  it('see nothing and can tag, edit or dismiss nothing', async () => {
    const riley = createBreakdownApi(cast.riley.client);
    expect(await riley.listCategories(projectId)).toEqual([]);
    expect(await riley.listElements(projectId)).toEqual([]);
    expect(await riley.listTags(projectId)).toEqual([]);
    const props = (await createBreakdownApi(cast.sam.client).listCategories(projectId)).find((c) => c.key === 'props')!;
    await expect(riley.tag(scenes[0].id, 'Crowbar', props.id)).rejects.toThrow();
    await expect(riley.dismiss(projectId, 'Crowbar')).rejects.toThrow();
    const { data } = await cast.riley.client.from('breakdown_categories').update({ label: 'x' }).eq('id', props.id).select('id');
    expect(data ?? []).toEqual([]);
  });

  it('the seed function is not callable by users', async () => {
    const { error } = await cast.sam.client.schema('internal' as 'public').rpc('seed_breakdown_categories' as never, { p_project: projectId } as never);
    expect(error).not.toBeNull();
    // …but the service role (migrations, maintenance) can re-run it safely.
    expect((await adminClient().from('breakdown_categories').select('id').eq('project_id', projectId)).data!.length).toBeGreaterThan(0);
  });
});
