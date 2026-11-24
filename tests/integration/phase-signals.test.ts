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

  it('cast_roles counts the characters who are in a scene, and cast_roles_cast those with a casting (by id)', async () => {
    const admin = adminClient();
    const scene = (await admin.from('scenes').insert({ project_id: projectId, scene_number: 1, title: 'CAST', heading: 'INT. CAST - DAY' }).select('id').single()).data!.id;
    const ids = (await admin.from('characters').insert([{ project_id: projectId, name: 'MAYA' }, { project_id: projectId, name: 'IVY' }, { project_id: projectId, name: 'NOBODY' }]).select('id, name')).data ?? [];
    const idOf = (n: string) => ids.find((c) => c.name === n)!.id;
    // NOBODY is in no scene, so is not a role in the film yet.
    await admin.from('scene_characters').insert([{ scene_id: scene, character_id: idOf('MAYA'), project_id: projectId }, { scene_id: scene, character_id: idOf('IVY'), project_id: projectId }]);
    const none = await progress();
    expect(none.cast_roles).toBe(2);
    expect(none.cast_roles_cast).toBe(0);
    await cast.sam.client.from('character_castings').insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: cast.jordan.id, created_by: cast.sam.id });
    expect((await progress()).cast_roles_cast).toBe(1);
    await cast.sam.client.from('character_castings').insert({ project_id: projectId, character_name: 'IVY', crew_user_id: cast.jordan.id, created_by: cast.sam.id });
    const all = await progress();
    expect(all.cast_roles).toBe(2);
    expect(all.cast_roles_cast).toBe(2);
    // Crew sees the same; an outsider to another project gets nothing for it.
    const crew = ((await cast.jordan.client.rpc('project_progress', { p_project: projectId })).data ?? {}) as Record<string, number>;
    expect(crew.cast_roles_cast).toBe(2);
    const { projectId: other } = await createCrewedProject(cast, 'Phase signals, other');
    const outsider = await cast.riley.client.rpc('project_progress', { p_project: other });
    expect(outsider.data ?? null).toBeNull();
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
