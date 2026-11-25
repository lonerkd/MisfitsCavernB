import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client as Pg } from 'pg';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// BACKLOG 3.53, slice 3: a shoot day within three days at a location whose permit is still open tells the owner and the leads once, by name.
// Sam owns; Jordan is confirmed crew (a contributor, not a lead); Riley is an outsider.
let cast: Cast;
let projectId: string;
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const runWorker = async () => {
  const pg = new Pg({ connectionString: process.env.SUPABASE_TEST_DB_URL });
  await pg.connect();
  try { await pg.query('select internal.notify_shoot_soon_permits()'); } finally { await pg.end(); }
};
const noticesFor = async (userId: string) => ((await adminClient().from('notifications').select('title, body, link, type').eq('user_id', userId).eq('type', 'permit')).data ?? []);

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Shoot soon'));
  const admin = adminClient();
  await admin.from('project_locations').insert([
    { project_id: projectId, name: 'DOCK', status: 'option', permit: 'needed' },
    { project_id: projectId, name: 'CABIN', status: 'confirmed', permit: 'granted' },
    { project_id: projectId, name: 'QUARRY', status: 'option', permit: 'applied' },
  ]);
  await admin.from('shoot_days').insert([
    { project_id: projectId, day_number: 1, shoot_date: day(2) },
    { project_id: projectId, day_number: 2, shoot_date: day(10) },
  ]);
  // Scenes are written the way the app writes them: the place is the location text and the day is the day
  // number; the scenes_link_place_and_day trigger derives location_id / shoot_day_id from those. Writing
  // the FK columns directly is overwritten by that trigger (location text empty -> location_id set null).
  await admin.from('scenes').insert([
    { project_id: projectId, scene_number: 1, title: 'A', heading: 'EXT. DOCK - DAY', location: 'DOCK', shoot_day: 1 },
    { project_id: projectId, scene_number: 2, title: 'B', heading: 'INT. CABIN - DAY', location: 'CABIN', shoot_day: 1 },
    { project_id: projectId, scene_number: 3, title: 'C', heading: 'EXT. QUARRY - DAY', location: 'QUARRY', shoot_day: 2 },
  ]);
});
afterAll(async () => { await destroyCast(cast); });

describe('shoot soon with an open permit', () => {
  it('tells the owner once, by place, day and date; not for a granted permit or a day further away', async () => {
    await runWorker();
    const sam = await noticesFor(cast.sam.id);
    expect(sam).toHaveLength(1);
    expect(sam[0].title).toBe('Permit still open for DOCK');
    expect(sam[0].body).toContain('Day 1 shoots at DOCK on ' + day(2));
    expect(sam[0].link).toBe(`/studio?project=${projectId}&tab=production&view=locations`);
  });

  it('running it again says nothing new', async () => {
    await runWorker();
    expect(await noticesFor(cast.sam.id)).toHaveLength(1);
  });

  it('a contributor is not told, and neither is an outsider', async () => {
    expect(await noticesFor(cast.jordan.id)).toHaveLength(0);
    expect(await noticesFor(cast.riley.id)).toHaveLength(0);
  });

  it('a moved shoot day is a new fact, and a lead is told too', async () => {
    const admin = adminClient();
    await admin.from('project_crew').update({ role: 'lead' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    await admin.from('shoot_days').update({ shoot_date: day(3) }).eq('project_id', projectId).eq('day_number', 1);
    await runWorker();
    expect(await noticesFor(cast.sam.id)).toHaveLength(2);
    expect(await noticesFor(cast.jordan.id)).toHaveLength(1);
  });

  it('nobody can read or write the notice log through the API', async () => {
    const read = await cast.sam.client.from('context_notices').select('*');
    expect(read.data ?? []).toEqual([]);
    const write = await cast.sam.client.from('context_notices').insert({ project_id: projectId, kind: 'x', key: 'y' });
    expect(write.error).not.toBeNull();
  });
});
