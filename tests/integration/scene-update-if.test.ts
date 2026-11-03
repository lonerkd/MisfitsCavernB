import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';
import { createStudioApi } from '@/lib/studio/api';

// The write behind Undo for a scene's day and status: it changes the scene only if the scene still holds what the action
// left it with, in one statement, so an undo never overwrites a newer change. The owner can; a stale write changes
// nothing; an outsider changes nothing.
let cast: Cast;
let projectId: string;
let sceneId: string;
const read = async () => (await cast.sam.client.from('scenes').select('shoot_day, status').eq('id', sceneId).single()).data!;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Scene undo'));
  sceneId = (await cast.sam.client.from('scenes').insert({ project_id: projectId, scene_number: 1, title: 'Scene 1', shoot_day: 2, status: 'shot' }).select('id').single()).data!.id;
});
afterAll(async () => { await destroyCast(cast); });

describe('updateSceneIf', () => {
  it('the owner puts a scene back when it still holds what the action left', async () => {
    const row = await createStudioApi(cast.sam.client).updateSceneIf(sceneId, { shoot_day: 2 }, { shoot_day: 1 });
    expect(row?.shoot_day).toBe(1);
    expect((await read()).shoot_day).toBe(1);
  });

  it('writes nothing when the scene has changed since (a newer move is kept)', async () => {
    await cast.sam.client.from('scenes').update({ shoot_day: 4 }).eq('id', sceneId);
    const row = await createStudioApi(cast.sam.client).updateSceneIf(sceneId, { shoot_day: 2 }, { shoot_day: 1 });
    expect(row).toBeNull();
    expect((await read()).shoot_day).toBe(4);
  });

  it('matches a status the same way', async () => {
    const api = createStudioApi(cast.sam.client);
    expect(await api.updateSceneIf(sceneId, { status: 'planned' }, { status: 'wrapped' })).toBeNull();
    expect((await api.updateSceneIf(sceneId, { status: 'shot' }, { status: 'planned' }))?.status).toBe('planned');
    expect((await read()).status).toBe('planned');
  });

  it('an outsider changes nothing', async () => {
    const before = await read();
    const row = await createStudioApi(cast.riley.client).updateSceneIf(sceneId, { shoot_day: before.shoot_day }, { shoot_day: 9 });
    expect(row).toBeNull();
    expect(await read()).toEqual(before);
  });
});
