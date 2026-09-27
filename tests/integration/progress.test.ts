import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { anonClient, createCast, destroyCast, type Cast, type Client } from './support/personas';
import { createCrewedProject, createScript, setVisibility } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { parseScript } from '@/lib/scriptos/parser';
import { computeProgress, toSignals } from '@/lib/os/progress';

// The phase engine's counts, as personas: what each of them can see decides
// what the project has done — and outsiders learn nothing.
let cast: Cast;
let projectId: string;

const TEXT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n\nEXT. RIDGE - DAWN\n\nThey climb.\n';

const signalsFor = async (client: Client, id = projectId) => {
  const { data, error } = await client.rpc('project_progress', { p_project: id });
  expect(error).toBeNull();
  return toSignals(data);
};

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Progress'));
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('project_progress', () => {
  it('a new project starts in development with nothing done but its crew', async () => {
    const s = (await signalsFor(cast.sam.client))!;
    expect(s).toMatchObject({ status: 'concept', logline: false, scripts: 0, scenes: 0, crew: 1, unlock_all: false });
    const p = computeProgress(s);
    expect(p.current.id).toBe('development');
    expect(p.current.done).toBe(0);
  });

  it('counts the work as it happens', async () => {
    await cast.sam.client.from('projects').update({ description: 'A match, a cave, a way out.' }).eq('id', projectId);
    const scriptId = await createScript(cast, projectId, TEXT);
    const scenes = await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, parseScript(TEXT).scenes);
    await cast.jordan.client.from('shots').insert({ project_id: projectId, scene_id: scenes[0].id, shot_number: '1A' });
    await cast.jordan.client.from('scenes').update({ status: 'wrapped' }).eq('id', scenes[0].id);
    await cast.jordan.client.from('post_cuts').insert({ project_id: projectId, title: 'Assembly', url: 'https://example.com/cut' });
    await cast.sam.client.from('projects').update({
      festival_submissions: [{ id: 'f1', name: 'Fest', status: 'submitted' }, { id: 'f2', name: 'Other', status: 'planned' }],
    }).eq('id', projectId);

    const s = (await signalsFor(cast.sam.client))!;
    expect(s).toMatchObject({ logline: true, scripts: 1, scenes: 2, scenes_wrapped: 1, shots: 1, cuts: 1, festivals_submitted: 1 });

    // Work started early opens its tools before their phase.
    const p = computeProgress(s);
    expect(p.tools.find((t) => t.id === 'scenes')).toMatchObject({ unlocked: true, early: true });
    expect(p.tools.find((t) => t.id === 'post')).toMatchObject({ unlocked: true, early: true });
  });

  it('crew see the same progress as the owner', async () => {
    expect(await signalsFor(cast.jordan.client)).toEqual(await signalsFor(cast.sam.client));
  });

  it('outsiders learn nothing, even of a public project; signed-out callers cannot call it', async () => {
    expect(await signalsFor(cast.riley.client)).toBeNull();
    await setVisibility(cast, projectId, 'public');
    // A public project's row is visible, but its crew-only records are not.
    const s = await signalsFor(cast.riley.client);
    expect(s?.shots ?? 0).toBe(0);
    expect(s?.cuts ?? 0).toBe(0);
    await setVisibility(cast, projectId, 'team');
    const anon = await anonClient().rpc('project_progress', { p_project: projectId });
    expect(anon.error).not.toBeNull();
  });

  it('only the owner moves the phase or opens every tool', async () => {
    const byCrew = await cast.jordan.client.from('projects').update({ status: 'pre-production' }).eq('id', projectId).select('id');
    expect(byCrew.data ?? []).toEqual([]);
    expect((await signalsFor(cast.sam.client))!.status).toBe('concept');

    await cast.sam.client.from('projects').update({ status: 'pre-production', settings: { unlockAllTools: true } }).eq('id', projectId);
    const s = (await signalsFor(cast.jordan.client))!;
    expect(s).toMatchObject({ status: 'pre-production', unlock_all: true });
    expect(computeProgress(s).tools.every((t) => t.unlocked)).toBe(true);
  });
});
