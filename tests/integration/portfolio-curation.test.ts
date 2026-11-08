import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';

// A person arranges their own portfolio: up to three pins, their own order; nobody else can; the public page lists in that order.
let cast: Cast;
let handle: string;
const ids: Record<string, string> = {};

beforeAll(async () => {
  cast = await createCast();
  const me = await cast.sam.client.from('profiles').select('username').eq('id', cast.sam.id).single();
  if (me.error) throw me.error;
  handle = me.data.username;
  const on = await cast.sam.client.from('profiles').update({ portfolio_page: 'public' }).eq('id', cast.sam.id);
  if (on.error) throw on.error;
  for (const [title, year] of [['A', 2020], ['B', 2021], ['C', 2022], ['D', 2023]] as const) {
    const r = await cast.sam.client.from('portfolio_projects').insert({ user_id: cast.sam.id, title, year, visibility: 'public' }).select('id').single();
    if (r.error) throw r.error;
    ids[title] = r.data.id;
  }
});
afterAll(async () => { await destroyCast(cast); });

const titles = async () => ((await anonClient().rpc('get_portfolio_page', { p_handle: handle })).data as { pieces: Array<{ title: string }> }).pieces.map((p) => p.title);

describe('arranging a portfolio', () => {
  it('lists newest year first until the person arranges it', async () => {
    expect(await titles()).toEqual(['D', 'C', 'B', 'A']);
  });

  it('pinned pieces lead, then the chosen order, and anyone reads that order', async () => {
    expect((await cast.sam.client.from('portfolio_projects').update({ pinned: true, position: 0 }).eq('id', ids.A).select('id')).data).toHaveLength(1);
    await cast.sam.client.from('portfolio_projects').update({ position: 1 }).eq('id', ids.B);
    await cast.sam.client.from('portfolio_projects').update({ position: 2 }).eq('id', ids.C);
    expect(await titles()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('refuses a fourth pin, and an out-of-range position', async () => {
    await cast.sam.client.from('portfolio_projects').update({ pinned: true }).eq('id', ids.B);
    await cast.sam.client.from('portfolio_projects').update({ pinned: true }).eq('id', ids.C);
    const fourth = await cast.sam.client.from('portfolio_projects').update({ pinned: true }).eq('id', ids.D);
    expect(fourth.error?.code).toBe('23514');
    expect((await cast.sam.client.from('portfolio_projects').update({ position: -1 }).eq('id', ids.D)).error?.code).toBe('23514');
  });

  it('is only theirs to arrange: crew and outsiders change nothing', async () => {
    for (const who of ['jordan', 'riley'] as const) {
      const r = await cast[who].client.from('portfolio_projects').update({ pinned: false, position: 9 }).eq('id', ids.A).select('id');
      expect(r.data ?? [], who).toHaveLength(0);
    }
    expect(await titles()).toEqual(['A', 'B', 'C', 'D']);
  });
});
