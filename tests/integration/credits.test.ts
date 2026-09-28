import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, setVisibility } from './support/project';

// Credits as personas: derived from the work (crew craft, casting, the
// creator), shown to outsiders only for public projects, to teammates always;
// the share page's press kit only for link/public projects, with accepted
// festivals as laurels.
let cast: Cast;
let projectId: string;
let shareToken: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Salt'));
  const sam = cast.sam.client;
  expect((await sam.from('character_castings').insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: cast.jordan.id, created_by: cast.sam.id })).error).toBeNull();
  expect((await sam.from('projects').update({ festival_submissions: [
    { id: 'f1', name: 'Sundance', status: 'accepted' },
    { id: 'f2', name: 'Cannes', status: 'rejected' },
    { id: 'f3', name: 'SXSW', status: 'submitted' },
  ] }).eq('id', projectId)).error).toBeNull();
  shareToken = (await sam.from('projects').select('share_token').eq('id', projectId).single()).data!.share_token;
});

afterAll(async () => {
  await destroyCast(cast);
});

const creditsOf = async (client: ReturnType<typeof anonClient>, user: string) =>
  ((await client.rpc('get_person_credits', { p_user: user })).data ?? []) as Array<{ project_id: string; kind: string; credit: string; character_name: string | null }>;

describe('credits', () => {
  it('teammates see each other’s credits, from the work itself', async () => {
    const jordan = (await creditsOf(cast.sam.client, cast.jordan.id)).filter((c) => c.project_id === projectId);
    expect(jordan.map((c) => [c.kind, c.credit, c.character_name])).toEqual([
      ['crew', 'Production designer', null],
      ['cast', 'Cast', 'MAYA'],
    ]);
    expect((await creditsOf(cast.jordan.client, cast.sam.id)).some((c) => c.project_id === projectId && c.kind === 'creator')).toBe(true);
  });

  it('outsiders see a team project’s credits only once it’s public', async () => {
    expect((await creditsOf(cast.riley.client, cast.jordan.id)).some((c) => c.project_id === projectId)).toBe(false);
    expect((await creditsOf(anonClient(), cast.jordan.id)).some((c) => c.project_id === projectId)).toBe(false);
    await setVisibility(cast, projectId, 'public');
    expect((await creditsOf(cast.riley.client, cast.jordan.id)).filter((c) => c.project_id === projectId)).toHaveLength(2);
    await setVisibility(cast, projectId, 'team');
  });

  it('the press kit: only for a shared project; credits and accepted festivals', async () => {
    expect((await anonClient().rpc('get_press_kit', { p_token: shareToken })).data).toBeNull();
    await setVisibility(cast, projectId, 'link');
    const { data } = await anonClient().rpc('get_press_kit', { p_token: shareToken });
    const kit = data as { credits: Array<{ kind: string; username: string; credit: string }>; laurels: Array<{ name: string }> };
    expect(kit.laurels).toEqual([{ name: 'Sundance' }]);
    expect(kit.credits.map((c) => c.kind)).toEqual(['creator', 'crew', 'cast']);
    expect((await anonClient().rpc('get_press_kit', { p_token: 'nope' })).data).toBeNull();
  });

  it('a credit becomes a portfolio entry linked to its project, once', async () => {
    const jordan = cast.jordan.client;
    const add = () => jordan.from('portfolio_projects').insert({ user_id: cast.jordan.id, title: 'Salt', role: 'Production designer', source_project_id: projectId }).select('id').single();
    expect((await add()).error).toBeNull();
    expect((await add()).error).not.toBeNull();
    const mine = (await creditsOf(jordan, cast.jordan.id)).find((c) => c.project_id === projectId) as { portfolio_project_id: string | null } | undefined;
    expect(mine?.portfolio_project_id).toBeTruthy();
  });
});
