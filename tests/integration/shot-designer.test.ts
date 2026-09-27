import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { parseScript } from '@/lib/scriptos/parser';

// The shot designer as personas: a shot's storyboard frame is an image from
// the same project's library, deleting the image clears the frame (never the
// shot), the camera fields are bounded, shots reorder, and a shot made from a
// margin note knows the script line it came from.
let cast: Cast;
let projectId: string;
let otherProjectId: string;
let sceneId: string;

const TEXT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n';

async function addImage(who: Cast['sam'], project: string, title: string) {
  const { data, error } = await who.client.from('media')
    .insert({ project_id: project, kind: 'link', title, external_url: 'https://example.com/frame.png', created_by: who.id })
    .select('id').single();
  if (error) throw error;
  return data.id as string;
}

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Storyboard'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Other storyboard'));
  const scriptId = await createScript(cast, projectId, TEXT);
  sceneId = (await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, parseScript(TEXT).scenes))[0].id;
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('storyboard frames', () => {
  it('crew set a frame from this project’s library; another project’s image is refused', async () => {
    const jordan = createStudioApi(cast.jordan.client);
    const shot = await jordan.addShot(projectId, sceneId, []);
    const frame = await addImage(cast.jordan, projectId, 'Board 1');
    expect((await jordan.updateShot(shot.id, { frame_media_id: frame })).frame_media_id).toBe(frame);

    const elsewhere = await addImage(cast.sam, otherProjectId, 'Not this film');
    await expect(jordan.updateShot(shot.id, { frame_media_id: elsewhere })).rejects.toThrow();
  });

  it('deleting the image clears the frame and keeps the shot', async () => {
    const sam = createStudioApi(cast.sam.client);
    const shot = await sam.addShot(projectId, sceneId, (await sam.listShots(projectId)));
    const frame = await addImage(cast.sam, projectId, 'Board 2');
    await sam.updateShot(shot.id, { frame_media_id: frame });
    expect((await cast.sam.client.from('media').delete().eq('id', frame)).error).toBeNull();
    const after = (await sam.listShots(projectId)).find((x) => x.id === shot.id);
    expect(after).toMatchObject({ id: shot.id, frame_media_id: null, project_id: projectId });
  });

  it('outsiders can’t touch a shot', async () => {
    const [shot] = await createStudioApi(cast.sam.client).listShots(projectId);
    await expect(createStudioApi(cast.riley.client).updateShot(shot.id, { shot_size: 'CU' })).rejects.toThrow();
  });
});

describe('camera and order', () => {
  it('camera fields are bounded', async () => {
    const sam = createStudioApi(cast.sam.client);
    const [shot] = await sam.listShots(projectId);
    expect((await sam.updateShot(shot.id, { shot_size: 'MCU', angle: 'low', movement: 'dolly', lens: '35mm' }))).toMatchObject({ shot_size: 'MCU', angle: 'low', movement: 'dolly', lens: '35mm' });
    await expect(sam.updateShot(shot.id, { lens: 'x'.repeat(41) })).rejects.toThrow();
    await expect(sam.updateShot(shot.id, { shot_size: 'EXTREME-WIDE-X' })).rejects.toThrow();
  });

  it('reordering writes only the shots that move', async () => {
    const sam = createStudioApi(cast.sam.client);
    const before = (await sam.listShots(projectId)).filter((x) => x.scene_id === sceneId).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    expect(before.length).toBeGreaterThanOrEqual(2);
    const reversed = [...before].reverse();
    await sam.reorderShots(reversed.map((x) => ({ id: x.id, order_index: x.order_index })));
    const after = (await sam.listShots(projectId)).filter((x) => x.scene_id === sceneId).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    expect(after.map((x) => x.id)).toEqual(reversed.map((x) => x.id));
  });
});

describe('from the script', () => {
  it('a shot made from a margin note knows its line; outsiders see none', async () => {
    const scriptId = (await cast.sam.client.from('scenes').select('script_id').eq('id', sceneId).single()).data!.script_id!;
    const { data: note, error } = await cast.jordan.client.rpc('add_script_annotation', {
      p_script: scriptId, p_line: 2, p_type: 'shot', p_text: 'Match flares in the dark', p_scene_ordinal: 0, p_scene_heading: 'INT. CAVE - NIGHT',
    });
    expect(error).toBeNull();
    const notes = await createStudioApi(cast.sam.client).listShotNotes(projectId);
    expect(notes.find((n) => n.routed_id === note!.routed_id)).toMatchObject({ text: 'Match flares in the dark', line_index: 2, script_id: scriptId });
    expect(await createStudioApi(cast.riley.client).listShotNotes(projectId)).toEqual([]);
  });
});
