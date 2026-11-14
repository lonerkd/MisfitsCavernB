import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Role model, step 2: what a craft lets a person do, as named capabilities (public.my_capabilities).
// Sam owns, Jordan is crew (a contributor), Riley is outside. Nothing reads these yet: no access changes.
let cast: Cast;
let projectId: string;

const ALL = [
  'breakdown.write', 'budget.read', 'budget.write', 'callsheet.issue', 'casting.decide', 'casting.read', 'locations.write',
  'media.approve', 'media.write', 'paperwork.read', 'paperwork.write', 'review.approve', 'review.request', 'schedule.write', 'script.write',
];

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Capabilities'));
});
afterAll(async () => { await destroyCast(cast); });

const caps = async (who: 'sam' | 'jordan' | 'riley'): Promise<string[]> => {
  const r = await cast[who].client.rpc('my_capabilities', { pid: projectId });
  expect(r.error).toBeNull();
  return (r.data as string[]) ?? [];
};

/** Put Jordan back to a confirmed contributor with one craft and nothing extra. */
const setJordan = async (craft: string | null, role = 'contributor', status = 'confirmed') => {
  const sam = cast.sam.client;
  expect((await sam.from('project_crew_crafts').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id)).error).toBeNull();
  expect((await sam.from('crew_capability_overrides').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id)).error).toBeNull();
  const u = await sam.from('project_crew').update({ craft, role, status }).eq('project_id', projectId).eq('user_id', cast.jordan.id).select('user_id');
  expect(u.error).toBeNull();
  expect(u.data).toHaveLength(1);
};
beforeEach(async () => { await setJordan('Production designer'); });

describe('the list and the templates are reference data', () => {
  it('anyone may read them; nobody but an admin changes them', async () => {
    expect((await cast.riley.client.from('capabilities').select('key')).data).toHaveLength(ALL.length);
    expect(((await cast.riley.client.from('craft_capabilities').select('craft').eq('craft', 'Producer')).data ?? []).length).toBeGreaterThan(5);
    for (const who of ['sam', 'jordan', 'riley'] as const) {
      const add = await cast[who].client.from('craft_capabilities').insert({ craft: 'Actor', capability: 'budget.write' });
      expect(add.error, who).not.toBeNull();
      const del = await cast[who].client.from('craft_capabilities').delete().eq('craft', 'Producer').select('craft');
      expect(del.data ?? [], who).toEqual([]);
      expect((await cast[who].client.from('capabilities').insert({ key: 'x.y', label: 'x', area: 'x', edits: true })).error, who).not.toBeNull();
    }
  });
});

describe('who holds what', () => {
  it('the owner holds every capability, an outsider none', async () => {
    expect(await caps('sam')).toEqual(ALL);
    expect(await caps('riley')).toEqual([]);
  });

  it('a department head sees their own money but cannot edit the budget, issue call sheets or see casting', async () => {
    const c = await caps('jordan'); // Production designer
    expect(c).toEqual(expect.arrayContaining(['media.write', 'budget.read']));
    for (const no of ['budget.write', 'callsheet.issue', 'schedule.write', 'casting.read', 'casting.decide', 'script.write', 'paperwork.read']) expect(c).not.toContain(no);
  });

  it.each([
    ['First assistant director', ['breakdown.write', 'schedule.write', 'callsheet.issue'], ['budget.read', 'casting.read', 'script.write']],
    ['Production accountant', ['budget.read', 'budget.write', 'paperwork.read', 'paperwork.write'], ['script.write', 'schedule.write', 'casting.read']],
    ['Casting director', ['casting.read', 'casting.decide'], ['budget.read', 'schedule.write']],
    ['Writer', ['script.write', 'review.request'], ['budget.read', 'schedule.write', 'casting.read']],
    ['Producer', ['budget.write', 'casting.decide', 'callsheet.issue', 'review.approve', 'paperwork.write'], []],
    ['Post supervisor', ['media.approve', 'review.approve', 'budget.read'], ['budget.write', 'casting.read']],
  ])('%s', async (craft, has, hasNot) => {
    await setJordan(craft);
    const c = await caps('jordan');
    expect(c).toEqual(expect.arrayContaining(has));
    for (const no of hasNot) expect(c).not.toContain(no);
  });

  it('a client can approve and nothing else; an actor and a person with no craft hold none', async () => {
    await setJordan('Client');
    expect(await caps('jordan')).toEqual(['media.approve', 'review.approve']);
    await setJordan('Actor');
    expect(await caps('jordan')).toEqual([]);
    await setJordan(null);
    expect(await caps('jordan')).toEqual([]);
  });

  it('a pending or declined member, and a member of a private project, hold none (as with can_shape_project)', async () => {
    await setJordan('Producer', 'contributor', 'pending');
    expect(await caps('jordan')).toEqual([]);
    await setJordan('Producer', 'contributor', 'declined');
    expect(await caps('jordan')).toEqual([]);
    await setJordan('Producer');
    expect((await caps('jordan')).length).toBeGreaterThan(5);
    expect((await cast.sam.client.from('projects').update({ visibility: 'private' }).eq('id', projectId)).error).toBeNull();
    expect(await caps('jordan')).toEqual([]);
    expect(await caps('sam')).toEqual(ALL);
    await cast.sam.client.from('projects').update({ visibility: 'team' }).eq('id', projectId);
  });
});

describe('several crafts on one project', () => {
  it('a writer-director holds what both grant; the owner adds and removes the second', async () => {
    await setJordan('Writer');
    expect(await caps('jordan')).not.toContain('casting.decide');
    const add = await cast.sam.client.from('project_crew_crafts').insert({ project_id: projectId, user_id: cast.jordan.id, craft: 'Director' });
    expect(add.error).toBeNull();
    const c = await caps('jordan');
    expect(c).toEqual(expect.arrayContaining(['script.write', 'casting.decide', 'media.approve']));
    expect((await cast.sam.client.from('project_crew_crafts').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id).eq('craft', 'Director')).error).toBeNull();
    expect(await caps('jordan')).not.toContain('casting.decide');
  });

  it('only a member of the crew can have one, it must be a real craft, and only the owner changes it', async () => {
    expect((await cast.sam.client.from('project_crew_crafts').insert({ project_id: projectId, user_id: cast.jordan.id, craft: 'Not a craft' })).error).not.toBeNull();
    expect((await cast.sam.client.from('project_crew_crafts').insert({ project_id: projectId, user_id: cast.riley.id, craft: 'Director' })).error).not.toBeNull();
    // Crew cannot give themselves a craft, and an outsider cannot either.
    expect((await cast.jordan.client.from('project_crew_crafts').insert({ project_id: projectId, user_id: cast.jordan.id, craft: 'Producer' })).error).not.toBeNull();
    expect((await cast.riley.client.from('project_crew_crafts').insert({ project_id: projectId, user_id: cast.jordan.id, craft: 'Producer' })).error).not.toBeNull();
    await cast.sam.client.from('project_crew_crafts').insert({ project_id: projectId, user_id: cast.jordan.id, craft: 'Writer' });
    // The crew sees it; an outsider does not; nobody but the owner removes it.
    expect((await cast.jordan.client.from('project_crew_crafts').select('craft').eq('project_id', projectId)).data).toEqual([{ craft: 'Writer' }]);
    expect((await cast.riley.client.from('project_crew_crafts').select('craft').eq('project_id', projectId)).data ?? []).toEqual([]);
    expect((await cast.jordan.client.from('project_crew_crafts').delete().eq('project_id', projectId).select('craft')).data ?? []).toEqual([]);
    expect((await cast.sam.client.from('project_crew_crafts').select('craft').eq('project_id', projectId)).data).toHaveLength(1);
  });
});

describe('the owner’s per-person overrides', () => {
  const override = (capability: string, granted: boolean, who: 'sam' | 'jordan' | 'riley' = 'sam') =>
    cast[who].client.from('crew_capability_overrides').insert({ project_id: projectId, user_id: cast.jordan.id, capability, granted });

  it('a grant adds a capability and a removal takes one away, only for that person on that project', async () => {
    expect((await override('callsheet.issue', true)).error).toBeNull();
    expect((await override('budget.read', false)).error).toBeNull();
    const c = await caps('jordan');
    expect(c).toContain('callsheet.issue');
    expect(c).not.toContain('budget.read');
    expect(c).toContain('media.write'); // the rest of the template stands
    expect((await cast.sam.client.from('crew_capability_overrides').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id)).error).toBeNull();
    expect(await caps('jordan')).toContain('budget.read');
  });

  it('only the owner writes them; the person reads their own; an outsider reads none; a made-up capability is refused', async () => {
    expect((await override('budget.write', true, 'jordan')).error).not.toBeNull();
    expect((await override('budget.write', true, 'riley')).error).not.toBeNull();
    expect((await override('made.up', true)).error).not.toBeNull();
    expect((await override('budget.write', true)).error).toBeNull();
    expect((await cast.jordan.client.from('crew_capability_overrides').select('capability').eq('project_id', projectId)).data).toEqual([{ capability: 'budget.write' }]);
    expect((await cast.riley.client.from('crew_capability_overrides').select('capability').eq('project_id', projectId)).data ?? []).toEqual([]);
    // Jordan cannot undo or edit it.
    expect((await cast.jordan.client.from('crew_capability_overrides').delete().eq('project_id', projectId).select('capability')).data ?? []).toEqual([]);
    expect((await cast.jordan.client.from('crew_capability_overrides').update({ granted: false }).eq('project_id', projectId).select('capability')).data ?? []).toEqual([]);
  });

  it('the tier is the ceiling: a view-only member never holds a capability that edits, even when granted; reads and approvals stand', async () => {
    await setJordan('Production designer', 'viewer');
    expect(await caps('jordan')).toEqual(['budget.read']); // media.write edits, so it is gone
    expect((await override('callsheet.issue', true)).error).toBeNull(); // the owner may try
    expect((await override('review.approve', true)).error).toBeNull();
    const c = await caps('jordan');
    expect(c).not.toContain('callsheet.issue');
    expect(c).toEqual(['budget.read', 'review.approve']);
  });
});
