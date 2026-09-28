import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript, setVisibility } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { parseScript } from '@/lib/scriptos/parser';

// Post-production as personas: cuts, timecoded notes tied to scenes, the
// pipeline and deliverables.
let cast: Cast;
let projectId: string;
let sceneId: string;
let cutId: string;

const TEXT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n';

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Post'));
  const scriptId = await createScript(cast, projectId, TEXT);
  sceneId = (await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, parseScript(TEXT).scenes))[0].id;
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('cuts', () => {
  it('crew add a cut by link; it needs exactly one source', async () => {
    const { data, error } = await cast.jordan.client.from('post_cuts').insert({ project_id: projectId, title: 'Assembly', url: 'https://youtu.be/dQw4w9WgXcQ' }).select('id, created_by').single();
    expect(error).toBeNull();
    expect(data!.created_by).toBe(cast.jordan.id);
    cutId = data!.id;
    expect((await cast.jordan.client.from('post_cuts').insert({ project_id: projectId, title: 'No source' })).error).not.toBeNull();
    expect((await cast.jordan.client.from('post_cuts').insert({ project_id: projectId, title: 'Bad', url: 'javascript:alert(1)' })).error).not.toBeNull();
  });

  it('outsiders see nothing and can add nothing', async () => {
    expect((await cast.riley.client.from('post_cuts').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.riley.client.from('post_cuts').insert({ project_id: projectId, title: 'x', url: 'https://example.com' })).error).not.toBeNull();
  });
});

describe('timecoded notes', () => {
  let noteId: string;

  it('are tied to a cut, a moment and optionally a scene', async () => {
    const { data, error } = await cast.jordan.client.from('post_notes')
      .insert({ project_id: projectId, cut_id: cutId, scene_id: sceneId, at_seconds: 83.5, department: 'sound', body: 'Match strike too quiet' })
      .select('id').single();
    expect(error).toBeNull();
    noteId = data!.id;
  });

  it('cannot point at another project’s cut or scene', async () => {
    const { projectId: other } = await createCrewedProject(cast, 'Other post');
    expect((await cast.sam.client.from('post_notes').insert({ project_id: other, cut_id: cutId, at_seconds: 1, body: 'x' })).error).not.toBeNull();
    const { data: otherCut } = await cast.sam.client.from('post_cuts').insert({ project_id: other, title: 'O', url: 'https://example.com/v' }).select('id').single();
    expect((await cast.sam.client.from('post_notes').insert({ project_id: other, cut_id: otherCut!.id, scene_id: sceneId, at_seconds: 1, body: 'x' })).error).not.toBeNull();
  });

  it('anyone on the team resolves (as themselves); only the author edits the text', async () => {
    const resolve = await cast.sam.client.from('post_notes').update({ resolved_at: new Date().toISOString(), resolved_by: cast.sam.id }).eq('id', noteId).select('resolved_by').single();
    expect(resolve.error).toBeNull();
    expect(resolve.data!.resolved_by).toBe(cast.sam.id);
    const spoof = await cast.sam.client.from('post_notes').update({ resolved_by: cast.jordan.id }).eq('id', noteId);
    expect(spoof.error).not.toBeNull();
    const edit = await cast.sam.client.from('post_notes').update({ body: 'rewritten by someone else' }).eq('id', noteId);
    expect(edit.error?.message).toMatch(/Only the author/);
    expect((await cast.jordan.client.from('post_notes').update({ body: 'Match strike too quiet — boost 3dB' }).eq('id', noteId)).error).toBeNull();
  });

  it('survive their scene being deleted (the note just loses the scene)', async () => {
    const { data: extra } = await cast.sam.client.from('scenes').insert({ project_id: projectId, title: 'Temp', scene_number: 99 }).select('id').single();
    const { data: n } = await cast.jordan.client.from('post_notes').insert({ project_id: projectId, cut_id: cutId, scene_id: extra!.id, at_seconds: 5, body: 'temp' }).select('id').single();
    await cast.sam.client.from('scenes').delete().eq('id', extra!.id);
    expect((await cast.sam.client.from('post_notes').select('scene_id, project_id').eq('id', n!.id).single()).data).toEqual({ scene_id: null, project_id: projectId });
  });

  it('go private with the project', async () => {
    await setVisibility(cast, projectId, 'private');
    expect((await cast.jordan.client.from('post_notes').select('id').eq('project_id', projectId)).data).toEqual([]);
    await setVisibility(cast, projectId, 'team');
  });
});

describe('pipeline and deliverables', () => {
  it('track status, due date and owner per item', async () => {
    const { data, error } = await cast.jordan.client.from('post_items').insert([
      { project_id: projectId, kind: 'stage', title: 'Sound mix', department: 'sound', position: 0 },
      { project_id: projectId, kind: 'deliverable', title: 'Subtitles (SRT)', position: 0, due_date: '2026-11-01', assigned_to: cast.jordan.id },
    ]).select('id, status');
    expect(error).toBeNull();
    expect(data!.map((d) => d.status)).toEqual(['todo', 'todo']);
    expect((await cast.sam.client.from('post_items').update({ status: 'done' }).eq('id', data![0].id)).error).toBeNull();
    expect((await cast.sam.client.from('post_items').update({ status: 'shipped' }).eq('id', data![0].id)).error).not.toBeNull();
    expect((await cast.riley.client.from('post_items').select('id').eq('project_id', projectId)).data).toEqual([]);
  });
});
