import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject, setVisibility } from './support/project';

// Pocket: notes in the library (words only, never shared) and the last place
// worked on each kind of device (ui_prefs.places), as each persona.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Pocket'));
});
afterAll(async () => { await destroyCast(cast); });

const note = (who: Cast['sam'], fields: Record<string, unknown> = {}) =>
  who.client.from('media').insert({ project_id: projectId, kind: 'note', title: 'Boat', notes: 'The boat leaves at six.', created_by: who.id, ...fields } as never).select('id, shared').single();

describe('notes in the library', () => {
  it('owner and crew write notes; both see them', async () => {
    const mine = await note(cast.sam);
    const theirs = await note(cast.jordan, { title: 'Coats', notes: 'Bring warm coats.' });
    expect(mine.error).toBeNull();
    expect(theirs.error).toBeNull();
    for (const who of [cast.sam, cast.jordan]) {
      const { data } = await who.client.from('media').select('title, notes').eq('project_id', projectId).eq('kind', 'note').order('title');
      expect(data).toEqual([{ title: 'Boat', notes: 'The boat leaves at six.' }, { title: 'Coats', notes: 'Bring warm coats.' }]);
    }
  });

  it('outsiders and anon see and add nothing', async () => {
    expect((await cast.riley.client.from('media').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await anonClient().from('media').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await note(cast.riley)).error).not.toBeNull();
  });

  it('a note is words only: not empty, no file, no link', async () => {
    expect((await note(cast.sam, { notes: '   ' })).error).not.toBeNull();
    expect((await note(cast.sam, { notes: null })).error).not.toBeNull();
    expect((await note(cast.sam, { external_url: 'https://example.com' })).error).not.toBeNull();
  });

  it('is never part of a share link, even for the owner', async () => {
    await setVisibility(cast, projectId, 'link');
    expect((await note(cast.sam, { shared: true })).error).not.toBeNull();
    const { data } = await note(cast.sam, { title: 'Private' });
    expect((await cast.sam.client.from('media').update({ shared: true }).eq('id', data!.id)).error).not.toBeNull();
  });

  it('other kinds still need exactly one source', async () => {
    expect((await cast.sam.client.from('media').insert({ project_id: projectId, kind: 'link', created_by: cast.sam.id, notes: 'x' })).error).not.toBeNull();
  });
});

const setPlaces = (who: Cast['sam'], places: unknown) => who.client.rpc('set_my_ui_prefs', { p_patch: { places } as never });
const at = '2026-09-29T11:40:00.000Z';

describe('ui_prefs.places', () => {
  it('keeps where you were on the phone and at the desk', async () => {
    const places = {
      desktop: { path: '/editor?script=11111111-2222-4333-8444-555555555555', label: 'Night Shift — script', at, project: projectId },
      phone: { path: '/studio?tab=library', label: 'Night Shift — Studio › Library', at: '2026-09-29T12:00:00Z', project: null },
    };
    expect((await setPlaces(cast.sam, places)).error).toBeNull();
    expect((await cast.sam.client.rpc('get_my_ui_prefs')).data).toMatchObject({ places });
    expect((await setPlaces(cast.sam, { phone: null })).error).toBeNull();
  });

  it('refuses anything that is not a place in the suite', async () => {
    const ok = { path: '/today', label: 'x', at };
    for (const bad of [
      'phone', { tablet: ok }, { phone: 'x' },
      { phone: { ...ok, path: '//evil.example' } }, { phone: { ...ok, path: 'https://evil.example' } },
      { phone: { ...ok, path: '/x"><script>' } }, { phone: { ...ok, label: '' } }, { phone: { ...ok, label: 'x'.repeat(121) } },
      { phone: { ...ok, at: 'yesterday' } }, { phone: { ...ok, project: 'nope' } }, { phone: { ...ok, extra: 1 } },
    ]) {
      expect((await setPlaces(cast.sam, bad)).error, JSON.stringify(bad)).not.toBeNull();
    }
  });

  it('is its owner’s alone', async () => {
    await setPlaces(cast.jordan, { phone: { path: '/lounge', label: 'Jordan', at } });
    expect((await cast.sam.client.rpc('get_my_ui_prefs')).data).not.toMatchObject({ places: { phone: { label: 'Jordan' } } });
    expect((await anonClient().rpc('set_my_ui_prefs', { p_patch: { places: {} } as never })).error).not.toBeNull();
  });
});
