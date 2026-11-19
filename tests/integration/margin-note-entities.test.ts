import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// Editor rung E5 (BACKLOG 3.18): a plain margin note is an entity of kind `note`, so it has a card and can be linked. As personas: Sam owns,
// Jordan is crew, Riley is outside.
let cast: Cast;
let projectId: string;
let scriptId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Margin notes'));
  scriptId = await createScript(cast, projectId, 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n');
});
afterAll(async () => { await destroyCast(cast); });

const addNote = async (client: Cast['sam']['client'], type: string, text: string) => {
  const { data, error } = await client.rpc('add_script_annotation', { p_script: scriptId, p_line: 0, p_type: type, p_text: text });
  if (error) throw error;
  return data as { id: string };
};
const entityOf = async (client: Cast['sam']['client'], id: string) =>
  (await client.from('entities').select('kind, label').eq('id', id).maybeSingle()).data;

describe('a margin note as a thing in the graph', () => {
  it('a note, a revision note and a reference become note entities; a shot does not', async () => {
    const note = await addNote(cast.sam.client, 'note', 'Check   the\nlamp continuity');
    const revision = await addNote(cast.sam.client, 'revision', 'Cut the second line');
    expect(await entityOf(cast.sam.client, note.id)).toEqual({ kind: 'note', label: 'Check the lamp continuity' });
    expect(await entityOf(cast.sam.client, revision.id)).toMatchObject({ kind: 'note' });
    const todo = await addNote(cast.sam.client, 'todo', 'Book the lamp');
    expect(await entityOf(cast.sam.client, todo.id)).toBeNull();
  });

  it('a changed text renames the entity; deleting the note removes it and its links', async () => {
    const note = await addNote(cast.sam.client, 'note', 'First words');
    // Notes are not edited through the app (no update policy); a change made by the service role still renames the entity.
    await adminClient().from('script_annotations').update({ text: 'Second words' }).eq('id', note.id);
    expect((await entityOf(cast.sam.client, note.id))?.label).toBe('Second words');

    const scene = (await cast.sam.client.from('scenes').insert({ project_id: projectId, script_id: scriptId, scene_number: 1, title: 'KITCHEN', heading: 'INT. KITCHEN - NIGHT' }).select('id').single()).data!;
    const link = await cast.jordan.client.from('links').insert({ project_id: projectId, from_entity: note.id, to_entity: scene.id, kind: 'about' });
    expect(link.error).toBeNull();
    expect((await cast.sam.client.from('links').select('id').eq('from_entity', note.id)).data).toHaveLength(1);
    await cast.sam.client.from('script_annotations').delete().eq('id', note.id);
    expect(await entityOf(cast.sam.client, note.id)).toBeNull();
    expect((await cast.sam.client.from('links').select('id').eq('from_entity', note.id)).data).toEqual([]);
  });

  it('crew see the note entity; an outsider and anon see nothing', async () => {
    const note = await addNote(cast.sam.client, 'note', 'Private to the project');
    expect(await entityOf(cast.jordan.client, note.id)).toMatchObject({ kind: 'note' });
    expect(await entityOf(cast.riley.client, note.id)).toBeNull();
    expect((await anonClient().from('entities').select('id').eq('id', note.id)).data ?? []).toEqual([]);
  });
});
