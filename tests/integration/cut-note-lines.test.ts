import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { parseScript } from '@/lib/scriptos/parser';

// Cut notes pinned to script lines, as personas: the crew pin a note to a
// line, the editor's margin lists them with their cut, the line is the
// author's like the text, and outsiders see nothing.
let cast: Cast;
let projectId: string;
let cutId: string;
let sceneId: string;
let noteId: string;

const TEXT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n\nSAM\nWho’s there?\n';

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Cut lines'));
  const scriptId = await createScript(cast, projectId, TEXT);
  sceneId = (await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, parseScript(TEXT).scenes))[0].id;
  cutId = (await createStudioApi(cast.sam.client).addCut(projectId, 'Assembly', { url: 'https://youtu.be/dQw4w9WgXcQ' })).id;
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('cut notes on script lines', () => {
  it('crew pin a note to a line; the margin lists it with its cut', async () => {
    const jordan = createStudioApi(cast.jordan.client);
    const note = await jordan.addPostNote({ project_id: projectId, cut_id: cutId, at_seconds: 83, department: 'sound', body: 'Line is buried under the drip', scene_id: sceneId, line_offset: 5, line_text: 'Who’s there?' });
    noteId = note.id;
    expect(note).toMatchObject({ line_offset: 5, line_text: 'Who’s there?' });
    // A note without a line isn't a margin note.
    await jordan.addPostNote({ project_id: projectId, cut_id: cutId, at_seconds: 5, department: 'edit', body: 'Tighten the open', scene_id: sceneId });
    const margin = await createStudioApi(cast.sam.client).listLineCutNotes(projectId);
    expect(margin).toHaveLength(1);
    expect(margin[0]).toMatchObject({ id: noteId, cut_title: 'Assembly', scene_id: sceneId });
  });

  it('a line needs its text, and both are bounded', async () => {
    const jordan = cast.jordan.client;
    const base = { project_id: projectId, cut_id: cutId, at_seconds: 1, department: 'edit', body: 'x', scene_id: sceneId };
    expect((await jordan.from('post_notes').insert({ ...base, line_offset: 2 })).error).not.toBeNull();
    expect((await jordan.from('post_notes').insert({ ...base, line_offset: -1, line_text: 'x' })).error).not.toBeNull();
    expect((await jordan.from('post_notes').insert({ ...base, line_offset: 1, line_text: 'x'.repeat(1001) })).error).not.toBeNull();
  });

  it('the line is the author’s: others can resolve but not move it', async () => {
    const sam = cast.sam.client;
    expect((await sam.from('post_notes').update({ line_offset: 2, line_text: 'Sam lights a match.' }).eq('id', noteId)).error).not.toBeNull();
    const resolved = await createStudioApi(sam).setPostNoteResolved(noteId, cast.sam.id, true);
    expect(resolved.line_offset).toBe(5);
    const { error } = await cast.jordan.client.from('post_notes').update({ line_offset: 2, line_text: 'Sam lights a match.' }).eq('id', noteId);
    expect(error).toBeNull();
  });

  it('outsiders see no margin notes', async () => {
    expect(await createStudioApi(cast.riley.client).listLineCutNotes(projectId)).toEqual([]);
  });
});
