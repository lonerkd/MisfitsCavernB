import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, setVisibility } from './support/project';

// Role model, step 7: a person's credit follows every craft they held, in the three places credits are derived.
let cast: Cast;
let projectId: string;
let token: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Two Hats'));
  await setVisibility(cast, projectId, 'public');
  const p = await adminClient().from('projects').select('share_token').eq('id', projectId).single();
  token = p.data!.share_token as string;
  await adminClient().from('profiles').update({ portfolio_page: 'public' }).eq('id', cast.jordan.id);
  const add = await cast.sam.client.from('project_crew_crafts').insert([
    { project_id: projectId, user_id: cast.jordan.id, craft: 'Director' },
    { project_id: projectId, user_id: cast.jordan.id, craft: 'Production designer' }, // the primary again: must not double
  ]);
  expect(add.error).toBeNull();
});
afterAll(async () => { await destroyCast(cast); });

const crewCredits = (rows: Array<{ kind: string; credit: string }> | null) => (rows ?? []).filter((r) => r.kind === 'crew').map((r) => r.credit).sort();

describe('credits for every craft held', () => {
  it("a person's credits list the primary craft and each extra one once", async () => {
    const r = await anonClient().rpc('get_person_credits', { p_user: cast.jordan.id });
    expect(r.error).toBeNull();
    const mine = (r.data ?? []).filter((x: { project_id: string }) => x.project_id === projectId);
    expect(crewCredits(mine)).toEqual(['Director', 'Production designer']);
  });

  it('the press kit names them under both crafts', async () => {
    const r = await anonClient().rpc('get_press_kit', { p_token: token });
    expect(r.error).toBeNull();
    const credits = (r.data as { credits: Array<{ user_id: string; kind: string; credit: string }> }).credits.filter((c) => c.user_id === cast.jordan.id);
    expect(crewCredits(credits)).toEqual(['Director', 'Production designer']);
  });

  it("their public page lists both, and a stranger still sees nothing private", async () => {
    const r = await anonClient().rpc('get_portfolio_page', { p_handle: (await adminClient().from('profiles').select('username').eq('id', cast.jordan.id).single()).data!.username });
    expect(r.error).toBeNull();
    const credits = (r.data as { credits: Array<{ share_token: string; kind: string; credit: string }> }).credits.filter((c) => c.share_token === token);
    expect(crewCredits(credits)).toEqual(['Director', 'Production designer']);
  });

  it('a pending member is not credited for extra crafts, and a private project shows none to a stranger', async () => {
    await adminClient().from('project_crew').update({ status: 'pending' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    const pending = await anonClient().rpc('get_press_kit', { p_token: token });
    expect((pending.data as { credits: Array<{ user_id: string }> }).credits.some((c) => c.user_id === cast.jordan.id)).toBe(false);
    await adminClient().from('project_crew').update({ status: 'confirmed' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    await setVisibility(cast, projectId, 'private');
    const priv = await anonClient().rpc('get_person_credits', { p_user: cast.jordan.id });
    expect((priv.data ?? []).filter((x: { project_id: string }) => x.project_id === projectId)).toHaveLength(0);
  });
});
