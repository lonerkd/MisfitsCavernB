import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Casting notes (4.15): per character, per project. Owner writes, crew reads, outsiders nothing.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Casting notes'));
});
afterAll(async () => { await destroyCast(cast); });

const table = (c: any) => c.from('casting_notes');

describe('casting notes', () => {
  it('the owner writes and reads a note', async () => {
    const { error } = await table(cast.sam.client).insert({ project_id: projectId, character_name: 'MAYA', note: 'Try a softer read' });
    expect(error).toBeNull();
    const { data } = await table(cast.sam.client).select('note').eq('project_id', projectId);
    expect(data).toHaveLength(1);
  });

  it('crew can read but not write', async () => {
    const { data } = await table(cast.jordan.client).select('note').eq('project_id', projectId);
    expect(data).toHaveLength(1);
    const { error } = await table(cast.jordan.client).insert({ project_id: projectId, character_name: 'MAYA', note: 'hacked' });
    expect(error).not.toBeNull();
  });

  it('an outsider sees nothing and writes nothing; anon too', async () => {
    expect((await table(cast.riley.client).select('*').eq('project_id', projectId)).data).toEqual([]);
    expect((await table(cast.riley.client).insert({ project_id: projectId, character_name: 'MAYA', note: 'x' })).error).not.toBeNull();
    expect((await table(anonClient()).select('*').eq('project_id', projectId)).data ?? []).toEqual([]);
  });
});

describe('casting notes follow the character (20261126000100)', () => {
  const character = async (name: string) => {
    const { data } = await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', name).single();
    if (!data) throw new Error(`character ${name} not found`);
    return data;
  };

  it('a note written by name is linked to the character, made if new', async () => {
    const { error } = await table(cast.sam.client).insert({ project_id: projectId, character_name: 'NOVA', note: 'First read' });
    expect(error).toBeNull();
    const ch = await character('NOVA');
    expect(ch?.id).toBeTruthy();
    const { data } = await table(cast.sam.client).select('character_id').eq('project_id', projectId).eq('character_name', 'NOVA').single();
    expect(data.character_id).toBe(ch.id);
    // Crew reads the linked note too — the link changes nothing about who may see it.
    expect((await table(cast.jordan.client).select('note').eq('character_id', ch.id)).data).toHaveLength(1);
    // And crew still cannot rewrite one: the update policy is the creator's alone.
    await table(cast.jordan.client).update({ note: 'rewritten' }).eq('project_id', projectId).eq('character_name', 'NOVA');
    expect((await table(cast.sam.client).select('note').eq('character_name', 'NOVA').single()).data.note).toBe('First read');
  });

  it('a rename carries the note: the name follows, the link stays', async () => {
    const ch = await character('NOVA');
    const { error } = await cast.sam.client.from('characters').update({ name: 'NOVA PRIME' }).eq('id', ch.id);
    expect(error).toBeNull();
    const { data } = await table(cast.sam.client).select('character_name, character_id').eq('project_id', projectId).eq('character_id', ch.id).single();
    expect(data.character_name).toBe('NOVA PRIME');
    expect(data.character_id).toBe(ch.id);
  });

  it('removing the character unlinks the note but keeps it', async () => {
    const ch = await character('NOVA PRIME');
    expect((await cast.sam.client.from('characters').delete().eq('id', ch.id)).error).toBeNull();
    const { data } = await table(cast.sam.client).select('character_id').eq('project_id', projectId).eq('character_name', 'NOVA PRIME').single();
    expect(data).not.toBeNull();
    expect(data.character_id).toBeNull();
  });
});

describe('a rename by crew carries the notes too', () => {
  it('Jordan (crew, not the creator) renames a character: the owner\'s note and a candidate follow the new name', async () => {
    expect((await table(cast.sam.client).insert({ project_id: projectId, character_name: 'ORION', note: 'Quiet, then loud' })).error).toBeNull();
    const { data: ch } = await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'ORION').single();
    expect(ch).not.toBeNull();
    expect((await cast.sam.client.from('casting_candidates').insert({ project_id: projectId, character_name: 'ORION', name: 'A. Actor' })).error).toBeNull();

    const { error } = await cast.jordan.client.from('characters').update({ name: 'ORION PRIME' }).eq('id', ch!.id);
    expect(error).toBeNull();
    const renamed = await cast.sam.client.from('characters').select('name').eq('id', ch!.id).single();
    expect(renamed.data?.name).toBe('ORION PRIME');

    // The name text on the linked rows follows the character, whoever renamed it.
    const note = await table(cast.sam.client).select('character_name').eq('character_id', ch!.id).single();
    expect(note.data?.character_name).toBe('ORION PRIME');
    const cand = await cast.sam.client.from('casting_candidates').select('character_name').eq('character_id', ch!.id).single();
    expect(cand.data?.character_name).toBe('ORION PRIME');
  });
});
