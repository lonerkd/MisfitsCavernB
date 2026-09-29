import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Guides as personas: how someone works is theirs (ui_prefs.guide, checked
// strictly); their guide on a project — the workflow they chose, the steps
// they ticked — is theirs alone. Sam owns the project, Jordan is on its crew,
// Riley is an outsider who can't keep a guide on it.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Guided'));
});
afterAll(async () => { await destroyCast(cast); });

describe('the guide profile', () => {
  it('is saved and read back, and replaced whole', async () => {
    const set = await cast.sam.client.rpc('set_my_ui_prefs', { p_patch: { guide: { hours: 12, experience: 'first', team: 'solo' } } });
    expect(set.error).toBeNull();
    const again = await cast.sam.client.rpc('set_my_ui_prefs', { p_patch: { guide: { hours: 5, experience: 'seasoned', team: 'crew', depth: 'walkthrough' } } });
    expect(again.error).toBeNull();
    expect((await cast.sam.client.rpc('get_my_ui_prefs')).data).toMatchObject({ guide: { hours: 5, experience: 'seasoned', team: 'crew', depth: 'walkthrough' } });
    // null forgets it; other prefs are untouched.
    await cast.sam.client.rpc('set_my_ui_prefs', { p_patch: { show_all_tools: true } });
    await cast.sam.client.rpc('set_my_ui_prefs', { p_patch: { guide: null } });
    expect((await cast.sam.client.rpc('get_my_ui_prefs')).data).toMatchObject({ guide: null, show_all_tools: true });
  });

  it('accepts only the known answers', async () => {
    const bad = [
      { hours: 0, experience: 'first' }, { hours: 81 }, { hours: 2.5 }, { hours: '8' },
      { experience: 'expert' }, { team: 'army' }, { depth: 'deep' }, { depth: 3 }, { secret: 1 }, 'walkthrough', [1],
    ];
    for (const guide of bad) {
      const { error } = await cast.jordan.client.rpc('set_my_ui_prefs', { p_patch: { guide } });
      expect(error, JSON.stringify(guide)).not.toBeNull();
    }
    expect((await cast.jordan.client.rpc('get_my_ui_prefs')).data).not.toHaveProperty('guide');
  });

  it('needs a signed-in person', async () => {
    expect((await anonClient().rpc('set_my_ui_prefs', { p_patch: { guide: { experience: 'some' } } })).error).not.toBeNull();
  });
});

describe('guide_progress', () => {
  it('each person keeps their own guide on a project they can open', async () => {
    const sam = await cast.sam.client.from('guide_progress').insert({ user_id: cast.sam.id, project_id: projectId, workflow: 'feature', done: ['draft'] });
    expect(sam.error).toBeNull();
    const jordan = await cast.jordan.client.from('guide_progress')
      .upsert({ user_id: cast.jordan.id, project_id: projectId, workflow: 'on-the-crew', done: ['crew-read'] }, { onConflict: 'user_id,project_id' });
    expect(jordan.error).toBeNull();
    // Ticking again updates the same row.
    const again = await cast.jordan.client.from('guide_progress')
      .upsert({ user_id: cast.jordan.id, project_id: projectId, workflow: 'on-the-crew', done: ['crew-read', 'crew-hello'] }, { onConflict: 'user_id,project_id' });
    expect(again.error).toBeNull();

    const mine = (await cast.jordan.client.from('guide_progress').select('user_id, done')).data ?? [];
    expect(mine).toEqual([{ user_id: cast.jordan.id, done: ['crew-read', 'crew-hello'] }]);
    const samSees = (await cast.sam.client.from('guide_progress').select('user_id').eq('project_id', projectId)).data ?? [];
    expect(samSees.map((r) => r.user_id)).toEqual([cast.sam.id]);
  });

  it('nobody writes someone else’s guide, and outsiders keep none on the project', async () => {
    const forged = await cast.jordan.client.from('guide_progress').insert({ user_id: cast.sam.id, project_id: projectId, done: ['x'] });
    expect(forged.error).not.toBeNull();
    await cast.jordan.client.from('guide_progress').update({ done: [] }).eq('user_id', cast.sam.id);
    const sam = (await adminClient().from('guide_progress').select('done').eq('user_id', cast.sam.id).eq('project_id', projectId).single()).data;
    expect(sam?.done).toEqual(['draft']);

    const riley = await cast.riley.client.from('guide_progress').insert({ user_id: cast.riley.id, project_id: projectId });
    expect(riley.error).not.toBeNull();
    expect((await anonClient().from('guide_progress').select('user_id')).data ?? []).toEqual([]);
  });

  it('keeps workflow ids and ticks short', async () => {
    const odd = await cast.sam.client.from('guide_progress').update({ workflow: 'Drop Table;' }).eq('user_id', cast.sam.id);
    expect(odd.error).not.toBeNull();
    const many = await cast.sam.client.from('guide_progress').update({ done: Array.from({ length: 201 }, (_, i) => `s${i}`) }).eq('user_id', cast.sam.id);
    expect(many.error).not.toBeNull();
  });
});
