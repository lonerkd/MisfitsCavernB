import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject } from './support/project';

// Schedule versions as personas. Sam (owner) saves, reads and removes; Jordan, a confirmed first AD on a team project, reads and
// (as a contributor who shapes the project) saves; Casey, a viewer, cannot read or save (so cannot restore, which saves first);
// Riley (outsider) sees nothing. A saved version cannot be changed by anyone.
let cast: Cast;
let casey: Persona;
let projectId: string;
let versionId: string;
const snapshot = { scenes: [{ id: '00000000-0000-0000-0000-000000000001', scene_number: 1, shoot_day: 1 }], days: [{ day: 1, date: '2026-12-01' }] };

beforeAll(async () => {
  cast = await createCast();
  casey = await createPersona('casey');
  ({ projectId } = await createCrewedProject(cast, 'Versions'));
  await adminClient().from('projects').update({ visibility: 'team' }).eq('id', projectId);
  await adminClient().from('project_crew').update({ craft: 'First assistant director', role: 'contributor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  await adminClient().from('project_crew').insert({ project_id: projectId, user_id: casey.id, role: 'viewer', status: 'confirmed', craft: 'First assistant director' });
});
afterAll(async () => { await destroyCast({ ...cast, casey }); });

const insert = (p: Persona, label: string, extra: Record<string, unknown> = {}) =>
  p.client.from('schedule_versions').insert({ project_id: projectId, label, snapshot, created_by: p.id, ...extra }).select('id').single();

describe('saving', () => {
  it('Sam saves a version', async () => {
    const r = await insert(cast.sam, 'First pass');
    expect(r.error).toBeNull();
    versionId = r.data!.id;
  });

  it('Jordan, a contributor with the schedule craft, saves one too', async () => {
    expect((await insert(cast.jordan, 'Jordan’s try')).error).toBeNull();
  });

  it('a version cannot be saved as someone else', async () => {
    expect((await insert(cast.jordan, 'Forged', { created_by: cast.sam.id })).error).not.toBeNull();
  });

  it('a viewer on the crew (so: no restore, which saves first) and an outsider cannot save', async () => {
    expect((await insert(casey, 'No')).error).not.toBeNull();
    expect((await insert(cast.riley, 'No')).error).not.toBeNull();
  });

  it('refuses a label that is empty or a snapshot that is not shaped right', async () => {
    expect((await insert(cast.sam, '   ')).error).not.toBeNull();
    expect((await insert(cast.sam, 'Bad', { snapshot: { scenes: 'x', days: [] } })).error).not.toBeNull();
  });
});

describe('reading', () => {
  it('Sam and Jordan read the versions; a viewer and an outsider read none', async () => {
    expect((await cast.sam.client.from('schedule_versions').select('id').eq('project_id', projectId)).data).toHaveLength(2);
    expect((await cast.jordan.client.from('schedule_versions').select('id').eq('project_id', projectId)).data).toHaveLength(2);
    expect((await casey.client.from('schedule_versions').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
    expect((await cast.riley.client.from('schedule_versions').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
  });

  it('a signed-out visitor reads none', async () => {
    const { anonClient } = await import('./support/personas');
    expect((await anonClient().from('schedule_versions').select('id')).data ?? []).toEqual([]);
  });
});

describe('immutability and removal', () => {
  it('nobody can change a saved version, not even the owner', async () => {
    const r = await cast.sam.client.from('schedule_versions').update({ label: 'Renamed' }).eq('id', versionId).select('id');
    expect(r.data ?? []).toEqual([]); // no UPDATE policy: the row is not even visible to a write
    const row = (await adminClient().from('schedule_versions').select('label, snapshot').eq('id', versionId).single()).data;
    expect(row?.label).toBe('First pass');
    expect(row?.snapshot).toEqual(snapshot);
    expect((await adminClient().from('schedule_versions').update({ label: 'x' }).eq('id', versionId)).error).not.toBeNull();
  });

  it('an outsider and a viewer cannot remove one; the owner can', async () => {
    await cast.riley.client.from('schedule_versions').delete().eq('id', versionId);
    await casey.client.from('schedule_versions').delete().eq('id', versionId);
    expect((await adminClient().from('schedule_versions').select('id').eq('id', versionId)).data).toHaveLength(1);
    expect((await cast.sam.client.from('schedule_versions').delete().eq('id', versionId).select('id')).data).toHaveLength(1);
  });
});

describe('a private project', () => {
  it('shows crew nothing, but the owner still reads and saves', async () => {
    await adminClient().from('projects').update({ visibility: 'private' }).eq('id', projectId);
    expect((await cast.jordan.client.from('schedule_versions').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
    expect((await insert(cast.jordan, 'No')).error).not.toBeNull();
    expect((await insert(cast.sam, 'Owner on private')).error).toBeNull();
    expect((await cast.sam.client.from('schedule_versions').select('id').eq('project_id', projectId)).data!.length).toBeGreaterThan(0);
  });
});
