import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// Phases v2 as personas: each account's interface choices are private and
// validated; the project's progress reports the signals the phase
// suggestion reads (shoot dates, breakdown, revisions).
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Phases'));
});
afterAll(async () => { await destroyCast(cast); });

describe('interface preferences (profiles.ui_prefs)', () => {
  it('start empty, save only the known keys, and stay private', async () => {
    expect((await cast.sam.client.rpc('get_my_ui_prefs')).data).toEqual({});
    const saved = await cast.sam.client.rpc('set_my_ui_prefs', { p_patch: { show_all_tools: true, seen_tools: ['schedule'] } });
    expect(saved.error).toBeNull();
    expect(saved.data).toEqual({ show_all_tools: true, seen_tools: ['schedule'] });
    // Merges, not replaces.
    expect((await cast.sam.client.rpc('set_my_ui_prefs', { p_patch: { dismissed: [`${projectId}:production`] } })).data)
      .toEqual({ show_all_tools: true, seen_tools: ['schedule'], dismissed: [`${projectId}:production`] });
    // Someone else sees only their own.
    expect((await cast.jordan.client.rpc('get_my_ui_prefs')).data).toEqual({});
    // Not readable as a column, not writable by anyone signed out.
    expect((await cast.jordan.client.from('profiles').select('ui_prefs').eq('id', cast.sam.id)).error).not.toBeNull();
    expect((await anonClient().rpc('set_my_ui_prefs', { p_patch: { show_all_tools: true } })).error).not.toBeNull();
  });

  it('refuses anything else', async () => {
    for (const bad of [{ theme: 'neon' }, { show_all_tools: 'yes' }, { seen_tools: 'schedule' }, { seen_tools: [1] }, { dismissed: ['x'.repeat(81)] }]) {
      expect((await cast.sam.client.rpc('set_my_ui_prefs', { p_patch: bad })).error, JSON.stringify(bad)).not.toBeNull();
    }
    expect((await cast.sam.client.rpc('set_my_ui_prefs', { p_patch: { seen_tools: Array.from({ length: 201 }, (_, i) => `t${i}`) } })).error).not.toBeNull();
  });
});

describe('the signals the phase suggestion reads', () => {
  it('shoot dates, breakdown elements and locked revisions', async () => {
    const empty = (await cast.jordan.client.rpc('project_progress', { p_project: projectId })).data as Record<string, unknown>;
    expect(empty).toMatchObject({ shoot_start: null, shoot_end: null, breakdown_elements: 0, revisions: 0 });

    const scriptId = await createScript(cast, projectId, 'INT. ROOM - DAY\n\nHello.\n');
    const admin = adminClient();
    expect((await admin.from('call_sheets').insert([
      { project_id: projectId, shoot_day: 1, shoot_date: '2026-11-02' },
      { project_id: projectId, shoot_day: 2, shoot_date: '2026-11-05' },
    ])).error).toBeNull();
    expect((await admin.from('script_revisions').insert({ script_id: scriptId, label: 'Blue', created_by: cast.sam.id })).error).toBeNull();
    const cat = (await admin.from('breakdown_categories').select('id').eq('project_id', projectId).eq('key', 'props').single()).data!;
    expect((await admin.from('breakdown_elements').insert({ project_id: projectId, category_id: cat.id, name: 'Lantern' })).error).toBeNull();

    const s = (await cast.jordan.client.rpc('project_progress', { p_project: projectId })).data as Record<string, unknown>;
    expect(s).toMatchObject({ shoot_start: '2026-11-02', shoot_end: '2026-11-05', breakdown_elements: 1, revisions: 1 });
    // An outsider's view of the project has nothing in it.
    expect((await cast.riley.client.rpc('project_progress', { p_project: projectId })).data).toBeNull();
  });
});
