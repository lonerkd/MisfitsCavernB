import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject, setVisibility } from './support/project';

// Festivals on a person's page, two tiers: VERIFIED (accepted submissions of a public film they are credited on, set by the film's
// owner) and SELF-REPORTED (a laurel they add to their own piece). A person cannot verify themselves; the laurel table is private.
let cast: Cast;
let handle: string;
let pieceId: string;
let film: string;

type Page = { pieces: Array<{ title: string; laurels: Array<{ name: string; kind: string; year: number | null }> }>; verified_laurels: Array<{ film: string; name: string }> };
const page = async (): Promise<Page> => (await anonClient().rpc('get_portfolio_page', { p_handle: handle })).data as Page;

beforeAll(async () => {
  cast = await createCast();
  const me = await cast.jordan.client.from('profiles').select('username').eq('id', cast.jordan.id).single();
  if (me.error) throw me.error;
  handle = me.data.username;
  expect((await cast.jordan.client.from('profiles').update({ portfolio_page: 'public' }).eq('id', cast.jordan.id)).error).toBeNull();
  const piece = await cast.jordan.client.from('portfolio_projects').insert({ user_id: cast.jordan.id, title: 'My Short', visibility: 'public' }).select('id').single();
  if (piece.error) throw piece.error;
  pieceId = piece.data.id;
  ({ projectId: film } = await createCrewedProject(cast, 'Festival Film'));
  await setVisibility(cast, film, 'public');
});
afterAll(async () => { await destroyCast(cast); });

describe('verified laurels come from the film, not from the person', () => {
  it('accepted submissions of a public film the person is crewed on show as verified; others do not', async () => {
    const set = await cast.sam.client.from('projects').update({ festival_submissions: [{ name: 'Rotterdam', status: 'accepted' }, { name: 'Sundance', status: 'submitted' }] }).eq('id', film).select('id');
    expect(set.data).toHaveLength(1);
    const d = await page();
    expect(d.verified_laurels.map((l) => `${l.film}: ${l.name}`)).toEqual(['Festival Film: Rotterdam']);
  });

  it('a film made private drops its laurels at once; an outsider is not credited on it', async () => {
    await setVisibility(cast, film, 'private');
    expect((await page()).verified_laurels).toEqual([]);
    await setVisibility(cast, film, 'public');
    const riley = await cast.riley.client.from('profiles').select('username').eq('id', cast.riley.id).single();
    await cast.riley.client.from('profiles').update({ portfolio_page: 'public' }).eq('id', cast.riley.id);
    const r = (await anonClient().rpc('get_portfolio_page', { p_handle: riley.data!.username })).data as Page;
    expect(r.verified_laurels).toEqual([]);
  });
});

describe('self-reported laurels', () => {
  it('a person adds one to their own piece; anyone reads it with the piece', async () => {
    const add = await cast.jordan.client.from('portfolio_laurels').insert({ portfolio_project_id: pieceId, name: 'Local Shorts Night', kind: 'screening', year: 2026 }).select('id');
    expect(add.error).toBeNull();
    const d = await page();
    expect(d.pieces[0].laurels).toEqual([{ name: 'Local Shorts Night', kind: 'screening', year: 2026 }]);
  });

  it('nobody else can add one to their piece, read their table, change or remove theirs', async () => {
    for (const who of ['sam', 'riley'] as const) {
      expect((await cast[who].client.from('portfolio_laurels').insert({ portfolio_project_id: pieceId, name: 'Fake Award' })).error, who).not.toBeNull();
      expect((await cast[who].client.from('portfolio_laurels').select('id')).data ?? [], who).toHaveLength(0);
      expect((await cast[who].client.from('portfolio_laurels').update({ name: 'Hacked' }).eq('portfolio_project_id', pieceId).select('id')).data ?? [], who).toHaveLength(0);
      expect((await cast[who].client.from('portfolio_laurels').delete().eq('portfolio_project_id', pieceId).select('id')).data ?? [], who).toHaveLength(0);
    }
    expect((await anonClient().from('portfolio_laurels').select('id')).data ?? []).toHaveLength(0);
    expect((await page()).pieces[0].laurels).toHaveLength(1);
  });

  it('is small and well-formed: a known kind, a sane year, at most twelve per piece, and it keeps its piece', async () => {
    expect((await cast.jordan.client.from('portfolio_laurels').insert({ portfolio_project_id: pieceId, name: 'X', kind: 'trophy' })).error?.code).toBe('23514');
    expect((await cast.jordan.client.from('portfolio_laurels').insert({ portfolio_project_id: pieceId, name: 'X', year: 1700 })).error?.code).toBe('23514');
    for (let i = 0; i < 11; i++) expect((await cast.jordan.client.from('portfolio_laurels').insert({ portfolio_project_id: pieceId, name: `L${i}` })).error).toBeNull();
    expect((await cast.jordan.client.from('portfolio_laurels').insert({ portfolio_project_id: pieceId, name: 'one too many' })).error?.code).toBe('23514');
    const other = await cast.jordan.client.from('portfolio_projects').insert({ user_id: cast.jordan.id, title: 'Other', visibility: 'private' }).select('id').single();
    const moved = await cast.jordan.client.from('portfolio_laurels').update({ portfolio_project_id: other.data!.id }).eq('portfolio_project_id', pieceId).limit(1);
    expect(moved.error?.code ?? 'none').not.toBe('none');
  });
});
