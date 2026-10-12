import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The deep brain, B8: what a person tells the reader about a name, kept per
// project. As personas: Sam owns, Jordan is crew, Riley is outside.
let cast: Cast;
let projectId: string;
let otherProjectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Corrections'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Another film'));
});
afterAll(async () => { await destroyCast(cast); });

const add = (who: 'sam' | 'jordan' | 'riley', name: string, kind = 'not_character', project = projectId) =>
  cast[who].client.from('reading_corrections').insert({ project_id: project, kind, name }).select('id, kind, name, created_by').single();

describe('what a person tells the reader', () => {
  it('the owner and the crew can say a name is not a character, and it records who said it', async () => {
    const a = await add('sam', 'DARKNESS');
    expect(a.error).toBeNull();
    expect(a.data).toMatchObject({ kind: 'not_character', name: 'DARKNESS', created_by: cast.sam.id });
    const b = await add('jordan', 'SILENCE');
    expect(b.error).toBeNull();
    expect(b.data?.created_by).toBe(cast.jordan.id);
    const rows = (await cast.sam.client.from('reading_corrections').select('name').eq('project_id', projectId)).data!.map((r) => r.name).sort();
    expect(rows).toEqual(['DARKNESS', 'SILENCE']);
  });

  it('one verdict per name per project: the opposite replaces, a repeat is refused', async () => {
    expect((await add('sam', 'DARKNESS')).error).not.toBeNull();
    const { error } = await cast.sam.client.from('reading_corrections').update({ kind: 'character' }).eq('project_id', projectId).eq('name', 'DARKNESS');
    expect(error).toBeNull();
    expect((await cast.sam.client.from('reading_corrections').select('kind').eq('project_id', projectId).eq('name', 'DARKNESS').single()).data!.kind).toBe('character');
  });

  it('names are stored upper-case and trimmed, and the kind is one of two', async () => {
    expect((await add('sam', 'lowercase')).error).not.toBeNull();
    expect((await add('sam', ' PADDED ')).error).not.toBeNull();
    expect((await add('sam', 'SOMEONE', 'villain')).error).not.toBeNull();
    expect((await add('sam', '')).error).not.toBeNull();
  });

  it('projects are kept apart: the same name is a separate verdict in another film', async () => {
    expect((await add('sam', 'DARKNESS', 'not_character', otherProjectId)).error).toBeNull();
    expect((await cast.sam.client.from('reading_corrections').select('id').eq('project_id', otherProjectId)).data).toHaveLength(1);
  });

  it('a person can take a correction back', async () => {
    const made = await add('jordan', 'TEMPORARY');
    expect((await cast.jordan.client.from('reading_corrections').delete().eq('id', made.data!.id)).error).toBeNull();
    expect((await cast.sam.client.from('reading_corrections').select('id').eq('name', 'TEMPORARY')).data).toEqual([]);
  });
});

describe('who can see and change it', () => {
  it('an outsider sees nothing and changes nothing; anon too', async () => {
    expect((await cast.riley.client.from('reading_corrections').select('name').eq('project_id', projectId)).data).toEqual([]);
    expect((await add('riley', 'INTRUDER')).error).not.toBeNull();
    const upd = await cast.riley.client.from('reading_corrections').update({ kind: 'character' }).eq('project_id', projectId).select();
    expect(upd.data ?? []).toEqual([]);
    const del = await cast.riley.client.from('reading_corrections').delete().eq('project_id', projectId).select();
    expect(del.data ?? []).toEqual([]);
    expect((await anonClient().from('reading_corrections').select('name').eq('project_id', projectId)).data ?? []).toEqual([]);
    expect((await cast.sam.client.from('reading_corrections').select('name').eq('project_id', projectId)).data!.length).toBeGreaterThan(0);
  });

  it('nobody can put a correction on a project they cannot open', async () => {
    const foreign = await cast.jordan.client.from('reading_corrections').insert({ project_id: '00000000-0000-0000-0000-000000000000', kind: 'not_character', name: 'X' });
    expect(foreign.error).not.toBeNull();
  });
});
