import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { parseScript } from '@/lib/scriptos/parser';

// Table-read timing as personas: crew record how long a scene ran, the value
// is bounded, outsiders can't touch it, and the scene sync (which rewrites
// script-derived fields) never clears it.
let cast: Cast;
let scriptId: string;
let sceneId: string;

const TEXT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n\nSAM\nWho’s there?\n';

beforeAll(async () => {
  cast = await createCast();
  const { projectId } = await createCrewedProject(cast, 'Table read');
  scriptId = await createScript(cast, projectId, TEXT);
  sceneId = (await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, parseScript(TEXT).scenes))[0].id;
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('table-read timing', () => {
  it('crew record a scene’s read time', async () => {
    const at = new Date().toISOString();
    const row = await createStudioApi(cast.jordan.client).updateScene(sceneId, { read_seconds: 42.5, read_at: at });
    expect(row).toMatchObject({ read_seconds: 42.5 });
  });

  it('refuses impossible times', async () => {
    const jordan = createStudioApi(cast.jordan.client);
    await expect(jordan.updateScene(sceneId, { read_seconds: 0 })).rejects.toThrow();
    await expect(jordan.updateScene(sceneId, { read_seconds: 36001 })).rejects.toThrow();
  });

  it('outsiders can’t record one', async () => {
    await expect(createStudioApi(cast.riley.client).updateScene(sceneId, { read_seconds: 10 })).rejects.toThrow();
  });

  it('re-syncing the script keeps the timing (the sync only writes what comes from the text)', async () => {
    const edited = TEXT.replace('lights a match', 'lights a match and waits');
    await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, parseScript(edited).scenes);
    const { data } = await cast.sam.client.from('scenes').select('id, read_seconds, est_duration').eq('id', sceneId).single();
    expect(data).toMatchObject({ id: sceneId, read_seconds: 42.5 });
  });
});
