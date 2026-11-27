import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Casting candidates (4.15): a shortlist per role. Owner writes, crew reads, outsiders nothing.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Casting candidates'));
});
afterAll(async () => { await destroyCast(cast); });

const table = (c: any) => c.from('casting_candidates');
const row = (extra: object = {}) => ({ project_id: projectId, character_name: 'MAYA', name: 'Ana Reyes', ...extra });

describe('casting candidates', () => {
  it('the owner adds, updates and removes a candidate', async () => {
    const ins = await table(cast.sam.client).insert(row({ reel_url: 'https://example.com/reel', note: 'Strong tape' })).select().single();
    expect(ins.error).toBeNull();
    const up = await table(cast.sam.client).update({ status: 'callback' }).eq('id', ins.data.id).select().single();
    expect(up.data.status).toBe('callback');
    expect((await table(cast.sam.client).delete().eq('id', ins.data.id)).error).toBeNull();
  });

  it('rejects a bad status and a non-http reel link', async () => {
    expect((await table(cast.sam.client).insert(row({ status: 'hired' }))).error).not.toBeNull();
    expect((await table(cast.sam.client).insert(row({ reel_url: 'javascript:alert(1)' }))).error).not.toBeNull();
  });

  it('crew can read but not write', async () => {
    await table(cast.sam.client).insert(row());
    expect((await table(cast.jordan.client).select('name').eq('project_id', projectId)).data).toHaveLength(1);
    expect((await table(cast.jordan.client).insert(row({ name: 'x' }))).error).not.toBeNull();
    await table(cast.jordan.client).update({ status: 'passed' }).eq('project_id', projectId);
    expect((await table(cast.sam.client).select('status').eq('project_id', projectId)).data?.[0].status).toBe('shortlisted');
  });

  it('an outsider sees nothing and writes nothing; anon too', async () => {
    expect((await table(cast.riley.client).select('*').eq('project_id', projectId)).data).toEqual([]);
    expect((await table(cast.riley.client).insert(row())).error).not.toBeNull();
    expect((await table(anonClient()).select('*').eq('project_id', projectId)).data ?? []).toEqual([]);
  });
});

describe('casting candidates follow the character (20261126000100)', () => {
  const character = async (name: string) => {
    const { data } = await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', name).single();
    if (!data) throw new Error(`character ${name} not found`);
    return data;
  };

  it('a candidate added by name is linked to the character, made if new', async () => {
    const ins = await table(cast.sam.client).insert(row({ character_name: 'REX', name: 'Dee Okafor' })).select('character_id').single();
    expect(ins.error).toBeNull();
    const ch = await character('REX');
    expect(ch?.id).toBeTruthy();
    expect(ins.data.character_id).toBe(ch.id);
  });

  it('a rename carries the shortlist: the name follows, the link stays', async () => {
    const ch = await character('REX');
    expect((await cast.sam.client.from('characters').update({ name: 'REX ALDO' }).eq('id', ch.id)).error).toBeNull();
    const { data } = await table(cast.sam.client).select('character_name, character_id').eq('project_id', projectId).eq('character_id', ch.id).single();
    expect(data.character_name).toBe('REX ALDO');
    expect(data.character_id).toBe(ch.id);
  });

  it('removing the character unlinks the candidate but keeps it', async () => {
    const ch = await character('REX ALDO');
    expect((await cast.sam.client.from('characters').delete().eq('id', ch.id)).error).toBeNull();
    const { data } = await table(cast.sam.client).select('character_id').eq('project_id', projectId).eq('character_name', 'REX ALDO').single();
    expect(data).not.toBeNull();
    expect(data.character_id).toBeNull();
  });
});

describe('casting candidates follow the casting.decide capability (20261127000200)', () => {
  const grant = async (granted: boolean) => {
    await cast.sam.client.from('crew_capability_overrides').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id).eq('capability', 'casting.decide');
    return cast.sam.client.from('crew_capability_overrides').insert({ project_id: projectId, user_id: cast.jordan.id, capability: 'casting.decide', granted });
  };

  it('crew granted casting.decide adds, updates and removes a candidate; once revoked they cannot', async () => {
    expect((await grant(true)).error).toBeNull();
    const ins = await table(cast.jordan.client).insert(row({ name: 'Granted Crew' })).select().single();
    expect(ins.error).toBeNull();
    const up = await table(cast.jordan.client).update({ status: 'callback' }).eq('id', ins.data.id).select().single();
    expect(up.data.status).toBe('callback');
    expect((await table(cast.jordan.client).delete().eq('id', ins.data.id)).error).toBeNull();

    expect((await grant(false)).error).toBeNull();
    expect((await table(cast.jordan.client).insert(row({ name: 'Revoked Crew' }))).error).not.toBeNull();
  });

  it('an outsider still cannot write, even with the project id', async () => {
    expect((await table(cast.riley.client).insert(row({ name: 'Outsider' }))).error).not.toBeNull();
  });
});
