import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// Tracks tagged to scenes: Sam owns the project, Jordan is crew, Riley is an outsider.
let cast: Cast;
let projectId: string;
let otherProjectId: string;
let sceneId: string;
let otherSceneId: string;
let refId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Tags'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Elsewhere'));
  const script = await createScript(cast, projectId, 'INT. KITCHEN - DAY\n');
  const other = await createScript(cast, otherProjectId, 'INT. GARDEN - DAY\n');
  const a = await cast.sam.client.from('scenes').insert({ project_id: projectId, script_id: script, scene_number: 1, title: 'KITCHEN' }).select('id').single();
  const b = await cast.sam.client.from('scenes').insert({ project_id: otherProjectId, script_id: other, scene_number: 1, title: 'GARDEN' }).select('id').single();
  if (a.error || b.error) throw a.error ?? b.error;
  sceneId = a.data.id; otherSceneId = b.data.id;
  const ref = await cast.sam.client.from('project_audio_references').insert({ project_id: projectId, added_by: cast.sam.id, reference_type: 'spotify', uri: 'spotify:track:abc', title: 'Theme — Ada' }).select('id').single();
  if (ref.error) throw ref.error;
  refId = ref.data.id;
});
afterAll(async () => { await destroyCast(cast); });

const tag = (who: 'sam' | 'jordan' | 'riley', patch: Record<string, unknown>) =>
  cast[who].client.from('project_audio_references').update(patch as never).eq('id', refId).select('id, for_scene, role, tags');

describe('tagging a track to a scene', () => {
  it('the owner tags a track with a scene, a role and tags', async () => {
    const r = await tag('sam', { for_scene: sceneId, role: 'theme', tags: ['tense', 'strings'] });
    expect(r.error).toBeNull();
    expect(r.data).toEqual([{ id: refId, for_scene: sceneId, role: 'theme', tags: ['tense', 'strings'] }]);
  });

  it('crew can tag it too (the tag is about the scene, not who found the song)', async () => {
    const r = await tag('jordan', { role: 'temp', tags: ['tense', 'temp score'] });
    expect(r.error).toBeNull();
    expect(r.data?.[0].role).toBe('temp');
  });

  it('an outsider can neither read nor tag it', async () => {
    expect((await cast.riley.client.from('project_audio_references').select('id').eq('id', refId)).data).toEqual([]);
    const r = await tag('riley', { role: 'theme' });
    expect(r.data ?? []).toEqual([]);
  });

  it('a scene from another project is refused', async () => {
    const r = await tag('sam', { for_scene: otherSceneId });
    expect(r.error?.message).toMatch(/not in this project/);
  });

  it('only a known role, at most twelve tags, each 1–40 characters', async () => {
    expect((await tag('sam', { role: 'banger' })).error).not.toBeNull();
    expect((await tag('sam', { tags: Array.from({ length: 13 }, (_, i) => `t${i}`) })).error).not.toBeNull();
    expect((await tag('sam', { tags: [''] })).error?.message).toMatch(/1 to 40/);
    expect((await tag('sam', { tags: ['x'.repeat(41)] })).error?.message).toMatch(/1 to 40/);
  });

  it('the track itself cannot be changed: not its uri, its title, its project or its adder', async () => {
    expect((await tag('sam', { uri: 'spotify:track:other' })).error?.code).toBe('42501');
    expect((await tag('jordan', { title: 'Renamed' })).error?.code).toBe('42501');
    // Moving it to another project is refused (its scene would not be in that project, and the project itself is fixed).
    expect((await tag('sam', { project_id: otherProjectId })).error).not.toBeNull();
    expect((await tag('sam', { added_by: cast.jordan.id })).error?.code).toBe('42501');
  });

  it('a new track can be saved already tagged, and is refused a foreign scene', async () => {
    const ok = await cast.jordan.client.from('project_audio_references').insert({ project_id: projectId, added_by: cast.jordan.id, reference_type: 'spotify', uri: 'spotify:track:def', title: 'Cue', for_scene: sceneId, role: 'source', tags: ['radio'] }).select('id').single();
    expect(ok.error).toBeNull();
    const bad = await cast.jordan.client.from('project_audio_references').insert({ project_id: projectId, added_by: cast.jordan.id, reference_type: 'spotify', uri: 'spotify:track:ghi', title: 'Cue 2', for_scene: otherSceneId });
    expect(bad.error?.message).toMatch(/not in this project/);
  });

  it('deleting the scene leaves the track, untagged from it', async () => {
    await tag('sam', { for_scene: sceneId });
    expect((await cast.sam.client.from('scenes').delete().eq('id', sceneId)).error).toBeNull();
    const r = await cast.sam.client.from('project_audio_references').select('id, for_scene, role').eq('id', refId).single();
    expect(r.data).toMatchObject({ id: refId, for_scene: null });
  });
});
