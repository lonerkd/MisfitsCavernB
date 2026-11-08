import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// Notes in three layers: private (only the author), project (the project's people), writer (the people who can open the
// script). Sam owns the project, Jordan is crew, Riley is an outsider.
let cast: Cast;
let projectId: string;
let otherProjectId: string;
let scriptId: string;
let otherScriptId: string;
let sceneId: string;

type Who = 'sam' | 'jordan' | 'riley';
type Scope = 'private' | 'project' | 'writer';
const write = (who: Who, scope: Scope, body: string, extra: Record<string, unknown> = {}) =>
  cast[who].client.from('notes').insert({ scope, body, ...extra } as never).select('id, created_by, project_id, script_id').single();
const read = async (who: Who, id: string) => (await cast[who].client.from('notes').select('id, body').eq('id', id)).data ?? [];
const inbox = async (who: Who) =>
  (await cast[who].client.from('notifications').select('title, body, link, type').eq('type', 'note').order('created_at')).data ?? [];

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Notes'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Another film'));
  scriptId = await createScript(cast, projectId, 'INT. KITCHEN - DAY\n\nMAYA\nOne.\n');
  otherScriptId = await createScript(cast, otherProjectId, 'INT. GARDEN - DAY\n');
  const scene = await cast.sam.client.from('scenes').insert({ project_id: projectId, script_id: scriptId, scene_number: 1, title: 'KITCHEN' }).select('id').single();
  if (scene.error) throw scene.error;
  sceneId = scene.data.id;
});
afterAll(async () => { await destroyCast(cast); });

describe('private notes', () => {
  it('only the author reads one: not the crew, not the outsider, not even the project owner', async () => {
    const mine = await write('jordan', 'private', 'my own thoughts on the ending', { project_id: projectId });
    expect(mine.error).toBeNull();
    expect(await read('jordan', mine.data!.id)).toHaveLength(1);
    expect(await read('sam', mine.data!.id)).toEqual([]);
    expect(await read('riley', mine.data!.id)).toEqual([]);
  });

  it('a writer can keep private notes on a script too, and nobody else can open them', async () => {
    const n = await write('sam', 'private', 'cut the second beat?', { script_id: scriptId });
    expect(n.error).toBeNull();
    expect(await read('jordan', n.data!.id)).toEqual([]);
  });

  it('nobody else can edit or delete a private note', async () => {
    const n = await write('jordan', 'private', 'a private note');
    const edit = await cast.sam.client.from('notes').update({ body: 'hijacked' }).eq('id', n.data!.id).select('id');
    expect(edit.data ?? []).toEqual([]);
    const del = await cast.sam.client.from('notes').delete().eq('id', n.data!.id).select('id');
    expect(del.data ?? []).toEqual([]);
    expect((await read('jordan', n.data!.id))[0]).toMatchObject({ body: 'a private note' });
  });

  it('cannot be attached to a project or script the author cannot reach', async () => {
    expect((await write('riley', 'private', 'probing', { project_id: projectId })).error).not.toBeNull();
    expect((await write('riley', 'private', 'probing', { script_id: scriptId })).error).not.toBeNull();
  });
});

describe('project notes', () => {
  it('the owner and the crew read and write them; an outsider neither reads nor writes', async () => {
    const a = await write('sam', 'project', 'we shoot the harbour at dawn', { project_id: projectId });
    expect(a.error).toBeNull();
    expect(await read('jordan', a.data!.id)).toHaveLength(1);
    expect(await read('riley', a.data!.id)).toEqual([]);
    expect((await write('jordan', 'project', 'bring the tide tables', { project_id: projectId })).error).toBeNull();
    expect((await write('riley', 'project', 'let me in', { project_id: projectId })).error).not.toBeNull();
  });

  it('the owner may delete a crew member\'s project note; the crew may not delete the owner\'s', async () => {
    const byJordan = await write('jordan', 'project', 'remove me', { project_id: projectId });
    const bySam = await write('sam', 'project', 'keep me', { project_id: projectId });
    const sams = await cast.jordan.client.from('notes').delete().eq('id', bySam.data!.id).select('id');
    expect(sams.data ?? []).toEqual([]);
    const gone = await cast.sam.client.from('notes').delete().eq('id', byJordan.data!.id).select('id');
    expect(gone.data).toHaveLength(1);
  });

  it('a project note needs a project', async () => {
    expect((await write('sam', 'project', 'no project')).error).not.toBeNull();
  });
});

describe('writer notes', () => {
  it('the people who can open the script read them; an outsider does not and cannot write one', async () => {
    const n = await write('sam', 'writer', 'the cold open drags', { script_id: scriptId });
    expect(n.error).toBeNull();
    expect(n.data!.project_id).toBe(projectId); // taken from the script, not from the client
    expect(await read('jordan', n.data!.id)).toHaveLength(1);
    expect(await read('riley', n.data!.id)).toEqual([]);
    expect((await write('riley', 'writer', 'hello', { script_id: scriptId })).error).not.toBeNull();
  });

  it('a writer note needs a script', async () => {
    expect((await write('sam', 'writer', 'no script', { project_id: projectId })).error).not.toBeNull();
  });

  it('only the author may delete it (the owner can delete project notes, not writer notes)', async () => {
    const n = await write('jordan', 'writer', 'a writer note', { script_id: scriptId });
    const del = await cast.sam.client.from('notes').delete().eq('id', n.data!.id).select('id');
    expect(del.data ?? []).toEqual([]);
    expect((await cast.jordan.client.from('notes').delete().eq('id', n.data!.id).select('id')).data).toHaveLength(1);
  });
});

describe('what can change', () => {
  it('the author edits the text; the layer, the place and the author never change', async () => {
    const n = await write('sam', 'project', 'first draft', { project_id: projectId });
    const id = n.data!.id;
    expect((await cast.sam.client.from('notes').update({ body: 'second draft' }).eq('id', id)).error).toBeNull();
    expect((await read('sam', id))[0]).toMatchObject({ body: 'second draft' });
    expect((await cast.sam.client.from('notes').update({ scope: 'private' }).eq('id', id)).error).not.toBeNull();
    expect((await cast.sam.client.from('notes').update({ project_id: otherProjectId }).eq('id', id)).error).not.toBeNull();
    expect((await cast.sam.client.from('notes').update({ created_by: cast.jordan.id }).eq('id', id)).error).not.toBeNull();
    // Jordan, who can read it, cannot edit it.
    const edit = await cast.jordan.client.from('notes').update({ body: 'mine now' }).eq('id', id).select('id');
    expect(edit.data ?? []).toEqual([]);
  });

  it('a forged author is ignored: the note is the caller\'s', async () => {
    const n = await write('jordan', 'project', 'signed by someone else?', { project_id: projectId, created_by: cast.sam.id });
    expect(n.error).toBeNull();
    expect(n.data!.created_by).toBe(cast.jordan.id);
  });

  it('the text must be there and not enormous; the layer must be one of the three', async () => {
    expect((await write('sam', 'private', '   ')).error).not.toBeNull();
    expect((await write('sam', 'private', 'x'.repeat(4001))).error).not.toBeNull();
    expect((await write('sam', 'secret' as Scope, 'what layer is this')).error).not.toBeNull();
  });
});

describe('notes on a scene', () => {
  it('a scene must be in the note\'s script', async () => {
    expect((await write('sam', 'writer', 'on a scene', { script_id: otherScriptId, scene_id: sceneId })).error?.message).toMatch(/not in this script/);
    expect((await write('sam', 'writer', 'on a scene', { script_id: scriptId, scene_id: sceneId })).error).toBeNull();
  });

  it('a note outlives its scene and keeps the line of context it was written with', async () => {
    const n = await write('sam', 'writer', 'this scene needs a button', { script_id: scriptId, scene_id: sceneId, context: 'Scene 1 · INT. KITCHEN - DAY' });
    expect(n.error).toBeNull();
    const scene = await cast.sam.client.from('scenes').insert({ project_id: projectId, script_id: scriptId, scene_number: 9, title: 'TEMP' }).select('id').single();
    const withTemp = await write('sam', 'writer', 'on the scene about to go', { script_id: scriptId, scene_id: scene.data!.id, context: 'Scene 9 · TEMP' });
    expect((await cast.sam.client.from('scenes').delete().eq('id', scene.data!.id)).error).toBeNull();
    const after = await cast.sam.client.from('notes').select('scene_id, context, body').eq('id', withTemp.data!.id).single();
    expect(after.data).toEqual({ scene_id: null, context: 'Scene 9 · TEMP', body: 'on the scene about to go' });
  });
});

describe('who is told', () => {
  it('a project note tells the owner and the crew except the author, and never the outsider', async () => {
    const before = { sam: (await inbox('sam')).length, jordan: (await inbox('jordan')).length, riley: (await inbox('riley')).length };
    expect((await write('sam', 'project', 'call time moves to 6', { project_id: projectId })).error).toBeNull();
    expect(await inbox('sam')).toHaveLength(before.sam); // not the author
    const jordan = await inbox('jordan');
    expect(jordan).toHaveLength(before.jordan + 1);
    expect(jordan[jordan.length - 1]).toMatchObject({ type: 'note', link: `/studio?project=${projectId}` });
    expect(jordan[jordan.length - 1].title).toMatch(/added a project note/);
    expect(await inbox('riley')).toHaveLength(before.riley);
  });

  it('a writer note tells the people on the script, linking to it', async () => {
    const before = (await inbox('jordan')).length;
    expect((await write('sam', 'writer', 'page 4 needs a rewrite', { script_id: scriptId, context: 'Page 4' })).error).toBeNull();
    const now = await inbox('jordan');
    expect(now).toHaveLength(before + 1);
    expect(now[now.length - 1]).toMatchObject({ type: 'note', link: `/editor?script=${scriptId}` });
    expect(now[now.length - 1].body).toBe('Page 4: page 4 needs a rewrite');
  });

  it('a private note tells nobody', async () => {
    const before = { sam: (await inbox('sam')).length, jordan: (await inbox('jordan')).length };
    expect((await write('sam', 'private', 'a thought for me only', { project_id: projectId })).error).toBeNull();
    expect((await write('jordan', 'private', 'and one for me', { project_id: projectId })).error).toBeNull();
    expect(await inbox('sam')).toHaveLength(before.sam);
    expect(await inbox('jordan')).toHaveLength(before.jordan);
  });
});

describe('someone who has left the project', () => {
  it('is not told, cannot read, and cannot edit their own earlier shared note', async () => {
    const { projectId: pid } = await createCrewedProject(cast, 'Left behind');
    const sid = await createScript(cast, pid, 'INT. HALL - DAY\n');
    // Jordan edited the script and wrote a project note while on the crew.
    expect((await cast.sam.client.from('scripts').update({ last_edited_by: cast.jordan.id }).eq('id', sid)).error).toBeNull();
    const mine = await write('jordan', 'project', 'my earlier note', { project_id: pid });
    expect(mine.error).toBeNull();
    expect((await cast.sam.client.from('project_crew').delete().eq('project_id', pid).eq('user_id', cast.jordan.id)).error).toBeNull();

    const before = (await inbox('jordan')).length;
    expect((await write('sam', 'writer', 'cut the betrayal scene', { script_id: sid })).error).toBeNull();
    expect((await write('sam', 'project', 'new call time', { project_id: pid })).error).toBeNull();
    expect(await inbox('jordan')).toHaveLength(before);

    const edit = await cast.jordan.client.from('notes').update({ body: 'still here?' }).eq('id', mine.data!.id).select('id');
    expect(edit.data ?? []).toEqual([]);
    expect((await write('jordan', 'project', 'let me back in', { project_id: pid })).error).not.toBeNull();
  });
});

describe('what the guard fixes', () => {
  it('a note\'s time is the server\'s, not the client\'s', async () => {
    const n = await write('sam', 'private', 'backdated?', { created_at: '2000-01-01T00:00:00Z', updated_at: '2000-01-01T00:00:00Z' });
    const row = await cast.sam.client.from('notes').select('created_at').eq('id', n.data!.id).single();
    expect(Date.parse(row.data!.created_at)).toBeGreaterThan(Date.parse('2026-01-01'));
  });

  it('a script from another project than the one named is refused', async () => {
    const r = await write('sam', 'project', 'mixed up', { project_id: otherProjectId, script_id: scriptId });
    expect(r.error?.message).toMatch(/not in this project/);
  });

  it('a project note can hang on a scene of that project without naming a script, but not on another project\'s', async () => {
    expect((await write('sam', 'project', 'on a scene', { project_id: projectId, scene_id: sceneId })).error).toBeNull();
    expect((await write('sam', 'project', 'wrong project', { project_id: otherProjectId, scene_id: sceneId })).error?.message).toMatch(/not in this script/);
  });
});

describe('the guard after review', () => {
  it('the author cannot rewrite a note\'s context or clear its scene', async () => {
    const n = await write('sam', 'writer', 'pinned', { script_id: scriptId, scene_id: sceneId, context: 'Scene 1' });
    expect(n.error).toBeNull();
    const ctx = await cast.sam.client.from('notes').update({ context: 'Scene 99' }).eq('id', n.data!.id);
    expect(ctx.error).not.toBeNull();
    const clear = await cast.sam.client.from('notes').update({ scene_id: null }).eq('id', n.data!.id);
    expect(clear.error).not.toBeNull();
    const row = await cast.sam.client.from('notes').select('scene_id, context').eq('id', n.data!.id).single();
    expect(row.data).toEqual({ scene_id: sceneId, context: 'Scene 1' });
  });

  it('a loose script\'s author fields are not a mailing list: a note tells nobody, even if Riley is named as its author', async () => {
    const before = (await inbox('riley')).length;
    const sid = await createScript(cast, null, 'INT. ROOF - NIGHT\n');
    // Whether or not the database lets this field be rewritten, the note must not read it.
    await cast.sam.client.from('scripts').update({ created_by: cast.riley.id, last_edited_by: cast.riley.id }).eq('id', sid);
    expect((await write('sam', 'writer', 'a private thought on a loose script', { script_id: sid })).error).toBeNull();
    expect(await inbox('riley')).toHaveLength(before);
  });
});
