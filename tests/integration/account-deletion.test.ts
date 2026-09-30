import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, createPersona, destroyCast, adminClient, type Cast, type Persona } from './support/personas';

// Leaving the suite. Handing a project over is the owner's alone, to someone on
// its crew. Deleting an account is refused while it owns a project other people
// work on; otherwise its own projects go with it, while what it wrote in other
// people's projects stays with the author cleared ("Deleted account").
let cast: Cast;
let dana: Persona;
let shared: string; // Sam's project, Jordan and Dana on the crew

const ok = <T extends { error: unknown }>(r: T) => { expect(r.error).toBeNull(); return r; };

beforeAll(async () => {
  cast = await createCast();
  dana = await createPersona('dana');
  shared = ok(await cast.sam.client.from('projects').insert({ title: 'Handover', creator_id: cast.sam.id }).select('id').single()).data!.id;
  ok(await cast.sam.client.from('project_crew').insert([
    { project_id: shared, user_id: cast.jordan.id, craft: 'Editor', status: 'confirmed' },
    { project_id: shared, user_id: dana.id, craft: 'Writer', status: 'confirmed' },
  ]));
});
afterAll(async () => {
  await destroyCast({ ...cast, dana });
});

describe('handing a project over', () => {
  it('only the owner can, and only to someone confirmed on the crew', async () => {
    const byOutsider = await cast.riley.client.rpc('transfer_project', { p_project: shared, p_to: cast.riley.id });
    expect(byOutsider.error?.code).toBe('42501');
    const byCrew = await cast.jordan.client.rpc('transfer_project', { p_project: shared, p_to: cast.jordan.id });
    expect(byCrew.error?.code).toBe('42501');
    const toOutsider = await cast.sam.client.rpc('transfer_project', { p_project: shared, p_to: cast.riley.id });
    expect(toOutsider.error?.code).toBe('22023');
  });

  it('the new owner owns it, the old owner stays on as a lead, job posts move with it', async () => {
    const job = ok(await cast.sam.client.from('jobs').insert({ title: 'Gaffer', role: 'Gaffer', created_by: cast.sam.id, project_id: shared }).select('id').single()).data!;
    ok(await cast.sam.client.rpc('transfer_project', { p_project: shared, p_to: cast.jordan.id }));

    const project = ok(await cast.jordan.client.from('projects').select('creator_id').eq('id', shared).single()).data!;
    expect(project.creator_id).toBe(cast.jordan.id);
    const crew = ok(await cast.jordan.client.from('project_crew').select('user_id, role').eq('project_id', shared)).data!;
    expect(crew.find((c) => c.user_id === cast.sam.id)?.role).toBe('lead');
    expect(crew.find((c) => c.user_id === cast.jordan.id)).toBeUndefined();
    expect(ok(await cast.sam.client.from('projects').select('id').eq('id', shared)).data).toHaveLength(1);
    expect(ok(await adminClient().from('jobs').select('created_by').eq('id', job.id).single()).data!.created_by).toBe(cast.jordan.id);

    // Sam can't hand it on any more — it's Jordan's.
    expect((await cast.sam.client.rpc('transfer_project', { p_project: shared, p_to: dana.id })).error?.code).toBe('42501');
  });
});

describe('deleting an account', () => {
  it('needs the username typed, and is refused while owning a project others work on', async () => {
    expect((await cast.jordan.client.rpc('delete_my_account', { p_confirm: 'yes' })).error?.code).toBe('22023');
    const plan = ok(await cast.jordan.client.rpc('account_deletion_plan')).data as { shared: { id: string; crew: { id: string }[] }[] };
    expect(plan.shared.map((p) => p.id)).toContain(shared);
    expect(plan.shared[0].crew.map((c) => c.id).sort()).toEqual([cast.sam.id, dana.id].sort());
    expect((await cast.jordan.client.rpc('delete_my_account', { p_confirm: cast.jordan.username })).error?.code).toBe('55000');
    expect((await adminClient().auth.admin.getUserById(cast.jordan.id)).data.user).not.toBeNull();
  });

  it('their own projects go; what they wrote in others\' projects stays, author cleared', async () => {
    // Dana's own project, and her work on Jordan's (formerly Sam's) project.
    const solo = ok(await dana.client.from('projects').insert({ title: 'Dana solo', creator_id: dana.id }).select('id').single()).data!.id;
    const script = ok(await dana.client.from('scripts').insert({ title: 'Draft', project_id: shared, created_by: dana.id, last_edited_by: dana.id }).select('id').single()).data!.id;
    const channel = randomUUID();
    ok(await cast.jordan.client.from('channels').insert({ id: channel, name: 'general', project_id: shared, created_by: cast.jordan.id }));
    const said = ok(await dana.client.from('messages').insert({ sender_id: dana.id, channel_uuid: channel, content: 'On my way' }).select('id').single()).data!.id;
    const dmOut = ok(await dana.client.from('messages').insert({ sender_id: dana.id, receiver_id: cast.sam.id, content: 'hi' }).select('id').single()).data!.id;
    const dmIn = ok(await cast.sam.client.from('messages').insert({ sender_id: cast.sam.id, receiver_id: dana.id, content: 'hey' }).select('id').single()).data!.id;
    const hours = ok(await dana.client.from('timesheets').insert({ project_id: shared, hours: 8, work_date: '2026-09-01' }).select('id').single()).data!.id;
    const job = ok(await dana.client.from('jobs').insert({ title: 'Grip', role: 'Grip', created_by: dana.id, project_id: shared }).select('id').single()).data!.id;
    const ownJob = ok(await dana.client.from('jobs').insert({ title: 'Script editor', role: 'Writer', created_by: dana.id }).select('id').single()).data!.id;

    const plan = ok(await dana.client.rpc('account_deletion_plan')).data as { shared: unknown[]; solo: { id: string }[] };
    expect(plan.shared).toEqual([]);
    expect(plan.solo.map((p) => p.id)).toEqual([solo]);

    ok(await dana.client.rpc('delete_my_account', { p_confirm: dana.username }));

    const admin = adminClient();
    expect((await admin.auth.admin.getUserById(dana.id)).data.user).toBeNull();
    expect(ok(await admin.from('profiles').select('id').eq('id', dana.id)).data).toEqual([]);
    expect(ok(await admin.from('projects').select('id').eq('id', solo)).data).toEqual([]);
    expect(ok(await admin.from('scripts').select('created_by, last_edited_by').eq('id', script).single()).data).toEqual({ created_by: null, last_edited_by: null });
    expect(ok(await admin.from('messages').select('sender_id').eq('id', said).single()).data!.sender_id).toBeNull();
    expect(ok(await admin.from('messages').select('id').in('id', [dmOut, dmIn])).data).toEqual([]);
    expect(ok(await admin.from('timesheets').select('user_id').eq('id', hours).single()).data!.user_id).toBeNull();
    expect(ok(await admin.from('jobs').select('created_by').eq('id', job).single()).data!.created_by).toBe(cast.jordan.id);
    expect(ok(await admin.from('jobs').select('id').eq('id', ownJob)).data).toEqual([]);
    // The project's owner still sees the work, and the crew message.
    expect(ok(await cast.jordan.client.from('scripts').select('id').eq('id', script)).data).toHaveLength(1);
    expect(ok(await cast.jordan.client.from('messages').select('id').eq('id', said)).data).toHaveLength(1);
  });

  it('signed out, nothing happens', async () => {
    const { anonClient } = await import('./support/personas');
    expect((await anonClient().rpc('delete_my_account', { p_confirm: 'x' })).error).not.toBeNull();
  });
});
