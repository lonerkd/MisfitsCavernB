import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject } from './support/project';

// Sample data (the demo world) stays inside the demo: Sam's project is a
// sample project with Jordan on its crew; Nova is a sample person. Riley, an
// ordinary user, doesn't see their casting calls or recent work — Sam and
// Jordan, inside the production, do. Nobody flags or unflags themselves.
let cast: Cast;
let nova: Persona;
let projectId: string;
let sampleJob: string;
let novaJob: string;

beforeAll(async () => {
  cast = await createCast();
  nova = await createPersona('nova');
  ({ projectId } = await createCrewedProject(cast, 'Sample world'));
  const admin = adminClient();
  expect((await admin.from('projects').update({ is_sample: true }).eq('id', projectId)).error).toBeNull();
  expect((await admin.from('profiles').update({ is_sample: true }).eq('id', nova.id)).error).toBeNull();
  sampleJob = (await admin.from('jobs').insert({ project_id: projectId, title: 'Casting call: JUNIE', role: 'Actor', created_by: cast.sam.id, status: 'open' }).select('id').single()).data!.id;
  novaJob = (await admin.from('jobs').insert({ title: 'Boom operator', role: 'Boom operator', created_by: nova.id, status: 'open' }).select('id').single()).data!.id;
  await admin.from('portfolio_projects').insert({ user_id: cast.sam.id, title: `Sample short ${Date.now()}`, source_project_id: projectId });
});
afterAll(async () => {
  await adminClient().from('jobs').delete().in('id', [sampleJob, novaJob]);
  await destroyCast({ ...cast, nova });
});

const sees = async (client: Cast['sam']['client'], id: string) => ((await client.from('jobs').select('id').eq('id', id)).data ?? []).length === 1;

describe('sample work stays in the demo', () => {
  it('a sample production’s casting call is listed for its owner and crew only', async () => {
    expect(await sees(cast.sam.client, sampleJob)).toBe(true);
    expect(await sees(cast.jordan.client, sampleJob)).toBe(true);
    expect(await sees(cast.riley.client, sampleJob)).toBe(false);
  });

  it('a sample person’s posting isn’t on anyone else’s board', async () => {
    expect(await sees(cast.riley.client, novaJob)).toBe(false);
    expect(await sees(nova.client, novaJob)).toBe(true);
  });

  it('the crew directory can leave sample people out', async () => {
    const { data, error } = await cast.riley.client.from('profiles').select('id').eq('is_sample', false).in('id', [nova.id, cast.jordan.id]);
    expect(error).toBeNull();
    expect((data ?? []).map((p) => p.id)).toEqual([cast.jordan.id]);
  });

  it('recent work leaves sample work out', async () => {
    const titles = ((await cast.riley.client.rpc('get_recent_work', { p_limit: 24 })).data ?? []).map((w) => w.title);
    expect(titles.some((t) => t.startsWith('Sample short'))).toBe(false);
  });

  it('the platform totals leave out a sample account’s loose script, and count an ordinary one', async () => {
    const admin = adminClient();
    const scripts = async () => Number(((await cast.riley.client.rpc('get_platform_stats')).data ?? [])[0]?.scripts);
    const before = await scripts();
    const mk = async (by: string) => (await admin.from('scripts').insert({ title: `Loose ${Date.now()}`, content: 'INT. ROOM - DAY\n', created_by: by, last_edited_by: by }).select('id').single()).data!.id;
    const novaScript = await mk(nova.id);
    const rileyScript = await mk(cast.riley.id);
    try {
      // Nova is a sample person: her script adds nothing; Riley's, an ordinary one, adds one.
      expect(await scripts()).toBe(before + 1);
    } finally {
      await admin.from('scripts').delete().in('id', [novaScript, rileyScript]);
    }
  });

  it('nobody flags or unflags themselves', async () => {
    expect((await cast.riley.client.from('profiles').update({ is_sample: true }).eq('id', cast.riley.id)).error).not.toBeNull();
    expect((await nova.client.from('profiles').update({ is_sample: false }).eq('id', nova.id)).error).not.toBeNull();
    // Ordinary profile edits still work.
    expect((await cast.riley.client.from('profiles').update({ bio: 'Editor' }).eq('id', cast.riley.id)).error).toBeNull();
  });
});
