import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Phase gates (D3): only the owner passes a gate; the decisions and the phase
// change happen together; archiving keeps the item, takes it off the share
// link and can be undone by someone who shapes the project; viewers and
// outsiders can't archive or restore; every gate is on record.
let cast: Cast;
let projectId: string;
let keep: string;
let shelve: string;
let published: string;

const admin = () => adminClient();
const sam = () => cast.sam.client;
const status = async () => (await admin().from('projects').select('status').eq('id', projectId).single()).data!.status;
const lifecycle = async (id: string) => (await admin().from('media').select('lifecycle, shared').eq('id', id).single()).data!;
async function item(title: string, extra: Record<string, unknown> = {}) {
  const res = await sam().from('media').insert({ project_id: projectId, kind: 'link', title, external_url: `https://example.com/${title}`, created_by: cast.sam.id, ...extra }).select('id').single();
  expect(res.error).toBeNull();
  return res.data!.id as string;
}

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Gate project'));
  keep = await item('keep');
  shelve = await item('shelve');
  published = await item('published', { shared: true });
});
afterAll(async () => {
  await admin().from('projects').delete().eq('id', projectId);
  await destroyCast(cast);
});

describe('who can pass a gate', () => {
  it('only the owner: crew who shape the project, viewers and outsiders cannot', async () => {
    for (const who of [cast.jordan, cast.riley]) {
      const res = await who.client.rpc('advance_phase', { p_project: projectId, p_to: 'pre-production' });
      expect(res.error).not.toBeNull();
    }
    expect((await anonClient().rpc('advance_phase', { p_project: projectId, p_to: 'pre-production' })).error).not.toBeNull();
    expect(await status()).toBe('concept');
  });

  it('refuses an unknown phase and a malformed decision, changing nothing', async () => {
    expect((await sam().rpc('advance_phase', { p_project: projectId, p_to: 'banana' })).error).not.toBeNull();
    expect((await sam().rpc('advance_phase', { p_project: projectId, p_to: 'pre-production', p_default: 'delete' })).error).not.toBeNull();
    expect((await sam().rpc('advance_phase', { p_project: projectId, p_to: 'pre-production', p_exceptions: ['not-a-uuid'] })).error).not.toBeNull();
    expect((await sam().rpc('advance_phase', { p_project: projectId, p_to: 'pre-production', p_exceptions: Array.from({ length: 1001 }, () => crypto.randomUUID()) })).error).not.toBeNull();
    expect(await status()).toBe('concept');
    expect((await lifecycle(shelve)).lifecycle).toBe('working');
  });
});

describe('passing the gate', () => {
  it('archives what was chosen, carries the rest, moves the phase and records it', async () => {
    const res = await sam().rpc('advance_phase', {
      p_project: projectId, p_to: 'pre-production',
      p_default: 'carry', p_exceptions: [shelve, published, crypto.randomUUID(), shelve],
    });
    expect(res.error).toBeNull();
    // Counts are what really happened: foreign, missing and repeated ids add nothing.
    expect(res.data).toEqual({ archived: 2, carried: 1 });
    expect(await status()).toBe('pre-production');
    expect(await lifecycle(keep)).toEqual({ lifecycle: 'working', shared: false });
    expect(await lifecycle(shelve)).toMatchObject({ lifecycle: 'archived' });
    // Archiving takes an item off the public share link, and keeps it.
    expect(await lifecycle(published)).toEqual({ lifecycle: 'archived', shared: false });
    const gates = (await sam().from('phase_gates').select('from_status, to_status, carried, archived').eq('project_id', projectId)).data!;
    expect(gates).toEqual([{ from_status: 'concept', to_status: 'pre-production', carried: 1, archived: 2 }]);
  });

  it('crew read the record but cannot write it; an outsider reads nothing', async () => {
    expect((await cast.jordan.client.from('phase_gates').select('id').eq('project_id', projectId)).data).toHaveLength(1);
    expect((await cast.jordan.client.from('phase_gates').insert({ project_id: projectId, from_status: 'a', to_status: 'b' })).error).not.toBeNull();
    expect((await cast.riley.client.from('phase_gates').select('id').eq('project_id', projectId)).data).toEqual([]);
  });

  it('an item from another project is not touched', async () => {
    const other = (await createCrewedProject(cast, 'Other')).projectId;
    const foreign = (await admin().from('media').insert({ project_id: other, kind: 'link', title: 'x', external_url: 'https://example.com/x', created_by: cast.sam.id }).select('id').single()).data!.id;
    const res = await sam().rpc('advance_phase', { p_project: projectId, p_to: 'production', p_default: 'carry', p_exceptions: [foreign] });
    expect(res.data).toEqual({ archived: 0, carried: 1 });
    expect((await lifecycle(foreign)).lifecycle).toBe('working');
    await admin().from('projects').delete().eq('id', other);
  });
});

describe('archive-all with exceptions', () => {
  it('archives everything working except the listed ids, in one step', async () => {
    const a = await item('bulk-a');
    const b = await item('bulk-b');
    const res = await sam().rpc('advance_phase', { p_project: projectId, p_to: 'post-production', p_default: 'archive', p_exceptions: [b] });
    expect(res.error).toBeNull();
    expect((await lifecycle(a)).lifecycle).toBe('archived');
    expect((await lifecycle(b)).lifecycle).toBe('working');
    expect((await lifecycle(keep)).lifecycle).toBe('archived');
    expect(res.data).toMatchObject({ carried: 1 });
  });
});

describe('an archived item is never public', () => {
  it('archiving, republishing and inserting archived all end unshared; only shapers can archive on insert', async () => {
    const id = await item('shared-one', { shared: true });
    await admin().from('media').update({ lifecycle: 'archived' }).eq('id', id);
    expect(await lifecycle(id)).toEqual({ lifecycle: 'archived', shared: false });
    // Republishing without restoring is undone.
    await sam().from('media').update({ shared: true }).eq('id', id);
    expect(await lifecycle(id)).toEqual({ lifecycle: 'archived', shared: false });
    const born = await item('born-archived', { lifecycle: 'archived', shared: true });
    expect(await lifecycle(born)).toEqual({ lifecycle: 'archived', shared: false });
    // A viewer can add ordinary items but not archived ones.
    await admin().from('project_crew').update({ role: 'viewer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect((await cast.jordan.client.from('media').insert({ project_id: projectId, kind: 'link', title: 'v1', external_url: 'https://example.com/v1', created_by: cast.jordan.id })).error).toBeNull();
    expect((await cast.jordan.client.from('media').insert({ project_id: projectId, kind: 'link', title: 'v2', external_url: 'https://example.com/v2', lifecycle: 'archived', created_by: cast.jordan.id })).error).not.toBeNull();
    await admin().from('project_crew').update({ role: 'contributor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  });
});

describe('restoring and the library', () => {
  it('someone who shapes the project can restore; a viewer and an outsider cannot archive or restore', async () => {
    expect((await cast.jordan.client.from('media').update({ lifecycle: 'working' }).eq('id', shelve)).error).toBeNull();
    expect((await lifecycle(shelve)).lifecycle).toBe('working');
    await admin().from('project_crew').update({ role: 'viewer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect((await cast.jordan.client.from('media').update({ lifecycle: 'archived' }).eq('id', shelve)).error).not.toBeNull();
    await cast.riley.client.from('media').update({ lifecycle: 'archived' }).eq('id', shelve); // no row visible: nothing changes
    expect((await lifecycle(shelve)).lifecycle).toBe('working');
    // A viewer can still rename an item (the guard only watches the lifecycle).
    expect((await cast.jordan.client.from('media').update({ title: 'renamed' }).eq('id', shelve)).error).toBeNull();
    await admin().from('project_crew').update({ role: 'contributor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  });

  it('an archived item is still there for the team to read', async () => {
    const rows = (await cast.jordan.client.from('media').select('id, lifecycle').eq('id', published)).data!;
    expect(rows).toEqual([{ id: published, lifecycle: 'archived' }]);
  });
});

describe('a null argument is refused, not treated as the default', () => {
  it('null phase or null default changes nothing', async () => {
    const before = await status();
    expect((await sam().rpc('advance_phase', { p_project: projectId, p_to: null as never })).error).not.toBeNull();
    expect((await sam().rpc('advance_phase', { p_project: projectId, p_to: 'production', p_default: null as never })).error).not.toBeNull();
    expect(await status()).toBe(before);
  });
});
