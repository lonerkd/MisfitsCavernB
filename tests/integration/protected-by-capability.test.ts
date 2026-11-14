import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, tinyPng } from './support/project';

// Role model, step 3a: the budget, who is cast and the paperwork follow a person's role (their craft's capabilities, the
// owner's overrides, the tier as the ceiling), not just "is on the project". Sam owns, Jordan is crew, Riley is outside.
const BUCKET = 'project-papers';
let cast: Cast;
let projectId: string;
let budgetLine: string;
let vendorId: string;
let castingId: string;
let paperId: string;
const uploaded: string[] = [];

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Protected'));
  const sam = cast.sam.client;
  budgetLine = (await sam.from('budget_items').insert({ project_id: projectId, category: 'Camera', amount: 1000 }).select('id').single()).data!.id;
  vendorId = (await sam.from('vendors').insert({ project_id: projectId, name: 'Lens House' }).select('id').single()).data!.id;
  castingId = (await sam.from('character_castings').insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: cast.sam.id }).select('id').single()).data!.id;
  paperId = (await sam.from('project_documents').insert({ project_id: projectId, kind: 'insurance', title: 'General liability' }).select('id').single()).data!.id;
});
afterAll(async () => {
  if (uploaded.length) await adminClient().storage.from(BUCKET).remove(uploaded);
  await destroyCast(cast);
});

/** Put Jordan on a craft and tier, with no overrides or other crafts. */
const setJordan = async (craft: string | null, role = 'contributor') => {
  const sam = cast.sam.client;
  await sam.from('project_crew_crafts').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id);
  await sam.from('crew_capability_overrides').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id);
  const u = await sam.from('project_crew').update({ craft, role, status: 'confirmed' }).eq('project_id', projectId).eq('user_id', cast.jordan.id).select('user_id');
  expect(u.data).toHaveLength(1);
};
beforeEach(async () => { await setJordan('Production designer'); });

const jordan = () => cast.jordan.client;
const readsBudget = async (who: 'sam' | 'jordan' | 'riley') => ((await cast[who].client.from('budget_items').select('id').eq('project_id', projectId)).data ?? []).length;
const writesBudget = async () => (await jordan().from('budget_items').update({ amount: 1001 }).eq('id', budgetLine).select('id')).data?.length === 1;

describe('the budget', () => {
  it('the owner holds it; an outsider sees nothing and writes nothing', async () => {
    expect(await readsBudget('sam')).toBe(1);
    expect(await readsBudget('riley')).toBe(0);
    expect((await cast.riley.client.from('budget_items').insert({ project_id: projectId, category: 'Sneaky', amount: 1 })).error).not.toBeNull();
  });

  it('a department head sees the budget but cannot change it, nor the spend or the vendors', async () => {
    expect(await readsBudget('jordan')).toBe(1); // Production designer: budget.read
    expect(await writesBudget()).toBe(false);
    expect((await jordan().from('budget_items').insert({ project_id: projectId, category: 'Art', amount: 5 })).error).not.toBeNull();
    expect((await jordan().from('budget_items').delete().eq('id', budgetLine).select('id')).data ?? []).toEqual([]);
    expect((await jordan().from('vendors').select('id').eq('project_id', projectId)).data).toHaveLength(1);
    expect((await jordan().from('vendors').update({ name: 'X' }).eq('id', vendorId).select('id')).data ?? []).toEqual([]);
    expect((await jordan().from('expenses').insert({ project_id: projectId, description: 'x', amount: 1 })).error).not.toBeNull();
  });

  it('a role with no budget sees none of it', async () => {
    await setJordan('Casting director');
    expect(await readsBudget('jordan')).toBe(0);
    expect((await jordan().from('vendors').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
    await setJordan(null);
    expect(await readsBudget('jordan')).toBe(0);
  });

  it('an accountant reads and writes all of it', async () => {
    await setJordan('Production accountant');
    expect(await writesBudget()).toBe(true);
    const e = await jordan().from('expenses').insert({ project_id: projectId, budget_item_id: budgetLine, description: 'Rental', amount: 10 }).select('id').single();
    expect(e.error).toBeNull();
    expect((await jordan().from('expenses').delete().eq('id', e.data!.id).select('id')).data).toHaveLength(1);
    expect((await jordan().from('vendors').update({ category: 'Rentals' }).eq('id', vendorId).select('id')).data).toHaveLength(1);
  });

  it('a view-only member can read what their craft shows but never write, even as an accountant (this used to be open)', async () => {
    await setJordan('Production accountant', 'viewer');
    expect(await readsBudget('jordan')).toBe(1);
    expect(await writesBudget()).toBe(false);
    expect((await jordan().from('budget_items').insert({ project_id: projectId, category: 'Sneaky', amount: 1 })).error).not.toBeNull();
    // Not even when the owner grants it: the tier is the ceiling.
    await cast.sam.client.from('crew_capability_overrides').insert({ project_id: projectId, user_id: cast.jordan.id, capability: 'budget.write', granted: true });
    expect(await writesBudget()).toBe(false);
  });

  it('the owner’s per-person grant and removal take effect', async () => {
    await cast.sam.client.from('crew_capability_overrides').insert({ project_id: projectId, user_id: cast.jordan.id, capability: 'budget.write', granted: true });
    expect(await writesBudget()).toBe(true);
    await cast.sam.client.from('crew_capability_overrides').update({ capability: 'budget.write', granted: false }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect(await writesBudget()).toBe(false);
    await cast.sam.client.from('crew_capability_overrides').insert({ project_id: projectId, user_id: cast.jordan.id, capability: 'budget.read', granted: false });
    expect(await readsBudget('jordan')).toBe(0);
  });
});

describe('hours', () => {
  it('everyone logs and sees their own; the budget holders see and approve everyone’s', async () => {
    const jordansHours = (await jordan().from('timesheets').insert({ project_id: projectId, work_date: '2026-11-04', hours: 3 }).select('id').single());
    expect(jordansHours.error).toBeNull();
    const samsHours = (await cast.sam.client.from('timesheets').insert({ project_id: projectId, work_date: '2026-11-04', hours: 5 }).select('id').single()).data!;
    // A designer sees only their own; cannot approve anyone's.
    expect((await jordan().from('timesheets').select('id').eq('project_id', projectId)).data).toHaveLength(1);
    expect((await jordan().from('timesheets').update({ status: 'approved' }).eq('id', samsHours.id).select('id')).data ?? []).toEqual([]);
    // An accountant sees all of them.
    await setJordan('Production accountant');
    expect((await jordan().from('timesheets').select('id').eq('project_id', projectId)).data!.length).toBeGreaterThanOrEqual(2);
  });
});

describe('who is cast', () => {
  it('everyone on the crew still reads it; only those who decide casting change it', async () => {
    expect((await jordan().from('character_castings').select('id').eq('project_id', projectId)).data).toHaveLength(1);
    expect((await cast.riley.client.from('character_castings').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
    // A designer cannot recast, add or remove.
    expect((await jordan().from('character_castings').update({ crew_user_id: cast.jordan.id }).eq('id', castingId).select('id')).data ?? []).toEqual([]);
    expect((await jordan().from('character_castings').insert({ project_id: projectId, character_name: 'NIKO', crew_user_id: cast.jordan.id })).error).not.toBeNull();
    expect((await jordan().from('character_castings').delete().eq('id', castingId).select('id')).data ?? []).toEqual([]);
    // A casting director can.
    await setJordan('Casting director');
    const add = await jordan().from('character_castings').insert({ project_id: projectId, character_name: 'NIKO', crew_user_id: cast.jordan.id }).select('id').single();
    expect(add.error).toBeNull();
    expect((await jordan().from('character_castings').delete().eq('id', add.data!.id).select('id')).data).toHaveLength(1);
  });

  it('a view-only casting director cannot decide (it edits)', async () => {
    await setJordan('Casting director', 'viewer');
    expect((await jordan().from('character_castings').insert({ project_id: projectId, character_name: 'ZED', crew_user_id: cast.jordan.id })).error).not.toBeNull();
  });
});

describe('the paperwork', () => {
  it('a designer holds none of it; a coordinator holds it; a document about you stays yours', async () => {
    expect((await jordan().from('project_documents').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
    expect((await jordan().from('project_documents').insert({ project_id: projectId, kind: 'other', title: 'x' })).error).not.toBeNull();
    // A document about Jordan is theirs to read whatever their craft.
    const mine = (await cast.sam.client.from('project_documents').insert({ project_id: projectId, kind: 'contract', title: 'Deal memo — jordan', person_id: cast.jordan.id }).select('id').single()).data!;
    expect((await jordan().from('project_documents').select('id').eq('project_id', projectId)).data).toEqual([{ id: mine.id }]);
    expect((await jordan().from('project_documents').update({ status: 'done' }).eq('id', mine.id).select('id')).data ?? []).toEqual([]);

    await setJordan('Production coordinator');
    expect((await jordan().from('project_documents').select('id').eq('project_id', projectId)).data!.length).toBeGreaterThanOrEqual(2);
    expect((await jordan().from('project_documents').update({ status: 'done' }).eq('id', paperId).select('id')).data).toHaveLength(1);
    expect((await cast.riley.client.from('project_documents').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
  });

  it('the files follow: only paperwork holders upload and delete; read follows the document rules', async () => {
    const doc = (await cast.sam.client.from('project_documents').insert({ project_id: projectId, kind: 'permit', title: 'Permit' }).select('id').single()).data!;
    const path = `${projectId}/${doc.id}/p.png`;
    expect((await jordan().storage.from(BUCKET).upload(path, tinyPng(), { contentType: 'image/png' })).error).not.toBeNull(); // designer
    await setJordan('Production coordinator');
    expect((await jordan().storage.from(BUCKET).upload(path, tinyPng(), { contentType: 'image/png' })).error).toBeNull();
    uploaded.push(path);
    await cast.sam.client.from('project_documents').update({ storage_path: path, file_name: 'p.png', mime_type: 'image/png', size_bytes: 1 }).eq('id', doc.id);
    expect((await jordan().storage.from(BUCKET).createSignedUrl(path, 60)).error).toBeNull();
    await setJordan('Production designer');
    expect((await jordan().storage.from(BUCKET).createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await cast.riley.client.storage.from(BUCKET).createSignedUrl(path, 60)).error).not.toBeNull();
  });
});
