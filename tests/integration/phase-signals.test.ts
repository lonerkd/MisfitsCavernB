import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// BACKLOG 3.52: the phase milestones read real prerequisites. project_progress counts confirmed crew (an invite is not crew), locations and
// their confirmation, permits still to clear, and call sheets actually issued. Sam owns; Jordan is confirmed crew.
let cast: Cast;
let projectId: string;
const progress = async () => ((await cast.sam.client.rpc('project_progress', { p_project: projectId })).data ?? {}) as Record<string, number>;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Phase signals'));
});
afterAll(async () => { await destroyCast(cast); });

describe('project_progress: the new signals', () => {
  it('crew_confirmed leaves out a pending invitation', async () => {
    const before = await progress();
    await adminClient().from('project_crew').insert({ project_id: projectId, user_id: cast.riley.id, role: 'viewer', status: 'pending' });
    const after = await progress();
    expect(after.crew).toBe(before.crew + 1);
    expect(after.crew_confirmed).toBe(before.crew_confirmed);
    await adminClient().from('project_crew').update({ status: 'confirmed' }).eq('project_id', projectId).eq('user_id', cast.riley.id);
    expect((await progress()).crew_confirmed).toBe(before.crew_confirmed + 1);
  });

  it('locations, their confirmation and the permits still to clear', async () => {
    const admin = adminClient();
    await admin.from('project_locations').insert([
      { project_id: projectId, name: 'HARBOUR', status: 'confirmed', permit: 'granted' },
      { project_id: projectId, name: 'PIER', status: 'option', permit: 'needed' },
      { project_id: projectId, name: 'CABIN', status: 'scouting', permit: 'applied' },
    ]);
    const p = await progress();
    expect(p.locations).toBe(3);
    expect(p.locations_confirmed).toBe(1);
    expect(p.permits_open).toBe(2);
  });

  it('call sheets issued are not the same as dated', async () => {
    const admin = adminClient();
    const dated = await admin.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: '2027-03-01', general_call: '07:00' }).select('id').single();
    expect(dated.error).toBeNull();
    const p = await progress();
    expect(p.call_sheets).toBeGreaterThanOrEqual(1);
    expect(p.call_sheets_issued).toBe(0);
    const issued = await cast.sam.client.rpc('issue_call_sheet', { p_sheet: dated.data!.id });
    expect(issued.error).toBeNull();
    expect((await progress()).call_sheets_issued).toBe(1);
  });

  it('formats without a shoot skip the new pre-production milestones', async () => {
    const rows = (await adminClient().from('project_formats').select('name, skip_milestones').in('name', ['Podcast', 'Copywriting', 'Blog / Newsletter', 'Video Game', 'Documentary', 'Short Film', 'Advertising', 'YouTube', 'Commercial'])).data ?? [];
    const skips = new Map(rows.map((r: { name: string; skip_milestones: string[] }) => [r.name, r.skip_milestones]));
    for (const f of ['Podcast', 'Copywriting', 'Blog / Newsletter', 'Video Game']) for (const m of ['breakdown', 'lock-script', 'locations', 'permits', 'call-sheet']) expect(skips.get(f), `${f} skips ${m}`).toContain(m);
    expect(skips.get('Documentary')).toEqual(expect.arrayContaining(['breakdown', 'lock-script']));
    expect(skips.get('Documentary')).not.toContain('call-sheet');
    expect(skips.get('Short Film')).toEqual([]);
    for (const f of ['Advertising', 'YouTube']) for (const m of ['locations', 'permits']) expect(skips.get(f), `${f} skips ${m}`).toContain(m);
    expect(skips.get('Commercial')).not.toContain('locations');
  });
});
