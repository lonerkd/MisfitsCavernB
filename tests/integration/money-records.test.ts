import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Role model, step 3c: the money kinds of `production_records` (purchase orders, insurance claims) follow the budget capabilities;
// every other kind is as before. Sam owns, Jordan is crew whose craft varies, Riley is outside.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Money records'));
  const sam = cast.sam.client;
  for (const [kind, item_id] of [['purchaseOrders', 'po-1'], ['claims', 'cl-1'], ['permits', 'pm-1']] as const) {
    const r = await sam.from('production_records').insert({ project_id: projectId, kind, item_id, data: { amount: '100' } });
    expect(r.error).toBeNull();
  }
});
afterAll(async () => { await destroyCast(cast); });

/** Put Jordan on a craft and tier, with no overrides or other crafts. */
const setJordan = async (craft: string | null, role = 'contributor') => {
  const sam = cast.sam.client;
  await sam.from('project_crew_crafts').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id);
  await sam.from('crew_capability_overrides').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id);
  const u = await sam.from('project_crew').update({ craft, role, status: 'confirmed' }).eq('project_id', projectId).eq('user_id', cast.jordan.id).select('user_id');
  expect(u.data).toHaveLength(1);
};
beforeEach(async () => { await setJordan('Production accountant'); });

const jordan = () => cast.jordan.client;
const kinds = async (c: Cast['jordan']['client']) =>
  [...new Set(((await c.from('production_records').select('kind').eq('project_id', projectId)).data ?? []).map((r) => r.kind))].sort();

describe('purchase orders and insurance claims follow the budget', () => {
  it('the owner and an accountant read and run them; an outsider sees nothing', async () => {
    expect(await kinds(cast.sam.client)).toEqual(['claims', 'permits', 'purchaseOrders']);
    expect(await kinds(jordan())).toEqual(['claims', 'permits', 'purchaseOrders']);
    expect(await kinds(cast.riley.client)).toEqual([]);

    const add = await jordan().from('production_records').insert({ project_id: projectId, kind: 'purchaseOrders', item_id: 'po-2', data: { amount: '5' } });
    expect(add.error).toBeNull();
    const edit = await jordan().from('production_records').update({ data: { amount: '6' } }).eq('project_id', projectId).eq('item_id', 'po-2').select('id');
    expect(edit.data).toHaveLength(1);
    const del = await jordan().from('production_records').delete().eq('project_id', projectId).eq('item_id', 'po-2').select('id');
    expect(del.data).toHaveLength(1);
  });

  it('a department head reads them (they hold budget.read) but cannot add, change or remove', async () => {
    await setJordan('Production designer');
    expect(await kinds(jordan())).toEqual(['claims', 'permits', 'purchaseOrders']);
    const add = await jordan().from('production_records').insert({ project_id: projectId, kind: 'claims', item_id: 'cl-2', data: {} });
    expect(add.error).not.toBeNull();
    const edit = await jordan().from('production_records').update({ data: { amount: '1' } }).eq('project_id', projectId).eq('item_id', 'po-1').select('id');
    expect(edit.data ?? []).toHaveLength(0);
    const del = await jordan().from('production_records').delete().eq('project_id', projectId).eq('item_id', 'cl-1').select('id');
    expect(del.data ?? []).toHaveLength(0);
    expect(await kinds(cast.sam.client)).toEqual(['claims', 'permits', 'purchaseOrders']);
  });

  it('a role with no budget sees neither kind, and cannot add one, but every other tool is as before', async () => {
    await setJordan(null);
    expect(await kinds(jordan())).toEqual(['permits']);
    const po = await jordan().from('production_records').insert({ project_id: projectId, kind: 'purchaseOrders', item_id: 'po-3', data: {} });
    expect(po.error).not.toBeNull();
    const permit = await jordan().from('production_records').insert({ project_id: projectId, kind: 'permits', item_id: 'pm-2', data: {} });
    expect(permit.error).toBeNull();
  });

  it('the owner can grant the money to one person, and take it back', async () => {
    await setJordan(null);
    const sam = cast.sam.client;
    for (const capability of ['budget.read', 'budget.write']) {
      const g = await sam.from('crew_capability_overrides').insert({ project_id: projectId, user_id: cast.jordan.id, capability, granted: true });
      expect(g.error).toBeNull();
    }
    expect(await kinds(jordan())).toEqual(['claims', 'permits', 'purchaseOrders']);
    const add = await jordan().from('production_records').insert({ project_id: projectId, kind: 'claims', item_id: 'cl-3', data: {} });
    expect(add.error).toBeNull();
    await sam.from('production_records').delete().eq('project_id', projectId).eq('item_id', 'cl-3');
    await sam.from('crew_capability_overrides').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect(await kinds(jordan())).toEqual(['permits']);
  });

  it('a view-only accountant reads them and cannot change them (the tier is the ceiling)', async () => {
    await setJordan('Production accountant', 'viewer');
    expect(await kinds(jordan())).toEqual(['claims', 'permits', 'purchaseOrders']);
    const add = await jordan().from('production_records').insert({ project_id: projectId, kind: 'purchaseOrders', item_id: 'po-4', data: {} });
    expect(add.error).not.toBeNull();
  });
});
