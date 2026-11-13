import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, adminClient, type Cast } from './support/personas';

// The public directory: only people whose page is PUBLIC are listed (link only is the opt-out, off does not exist), with public
// profile fields and a count and cover of their PUBLIC pieces. Sample accounts are never listed.
let cast: Cast;
const names: Record<string, string> = {};
const list = (args: Record<string, unknown> = {}, who: 'anon' | 'riley' = 'anon') =>
  (who === 'anon' ? anonClient() : cast.riley.client).rpc('list_public_portfolios', args as never);
type Row = { username: string; role: string | null; location: string | null; bio: string | null; pieces: number; cover_url: string | null } & Record<string, unknown>;
const rows = async (args: Record<string, unknown> = {}, who: 'anon' | 'riley' = 'anon') => {
  const r = await list(args, who);
  expect(r.error).toBeNull();
  return (r.data ?? []) as Row[];
};
const setPage = async (who: 'sam' | 'jordan' | 'riley', value: string) =>
  expect((await cast[who].client.from('profiles').update({ portfolio_page: value }).eq('id', cast[who].id)).error).toBeNull();

beforeAll(async () => {
  cast = await createCast();
  for (const w of ['sam', 'jordan', 'riley'] as const) {
    names[w] = (await cast[w].client.from('profiles').select('username').eq('id', cast[w].id).single()).data!.username;
  }
  // Sam: public page, a public piece with a cover, a link-only piece and a private one (only the public one counts).
  // A person's role is one of the suite's crafts (a foreign key), so use one that exists.
  expect((await adminClient().from('profiles').update({ role: 'Gaffer', location: 'Lisbon', bio: 'Light, mostly.' }).eq('id', cast.sam.id)).error).toBeNull();
  const mk = (title: string, visibility: string, cover_url: string | null) =>
    cast.sam.client.from('portfolio_projects').insert({ user_id: cast.sam.id, title, visibility, cover_url, year: 2026 });
  for (const r of [await mk('Public Film', 'public', 'https://images.example.com/c.jpg'), await mk('Link Film', 'unlisted', null), await mk('Private Film', 'private', null)]) {
    expect(r.error).toBeNull();
  }
  await setPage('sam', 'public');
  await setPage('jordan', 'unlisted');   // the opt-out: reachable by name, never listed
  // Riley's page stays off.
});
afterAll(async () => { await destroyCast(cast); });

describe('the public directory of portfolios', () => {
  it('lists a public page to anyone, with only public fields and the count and cover of the PUBLIC pieces', async () => {
    for (const who of ['anon', 'riley'] as const) {
      const sam = (await rows({}, who)).find((r) => r.username === names.sam);
      expect(sam, who).toBeTruthy();
      expect(sam!.pieces).toBe(1);
      expect(sam!.cover_url).toBe('https://images.example.com/c.jpg');
      expect(Object.keys(sam!).sort()).toEqual(['avatar_url', 'bio', 'cover_url', 'location', 'pieces', 'role', 'status', 'username']);
    }
  });

  it('never lists a link-only page (the opt-out) or a page that is off', async () => {
    const all = (await rows()).map((r) => r.username);
    expect(all).not.toContain(names.jordan);
    expect(all).not.toContain(names.riley);
  });

  it('searches by name, craft or place, ignoring case, and treats % and _ as plain characters', async () => {
    expect((await rows({ p_query: names.sam.toUpperCase() })).map((r) => r.username)).toContain(names.sam);
    expect((await rows({ p_query: 'gaff' })).map((r) => r.username)).toContain(names.sam);
    expect((await rows({ p_query: 'lisb' })).map((r) => r.username)).toContain(names.sam);
    expect(await rows({ p_query: 'no-such-person-or-craft' })).toEqual([]);
    expect(await rows({ p_query: '%' })).toEqual([]);
    expect(await rows({ p_query: '_' })).toEqual([]);
  });

  it('pages: the limit is clamped and an offset past the end is empty', async () => {
    expect((await rows({ p_limit: 1000 })).length).toBeLessThanOrEqual(49);
    expect((await rows({ p_limit: 0 })).length).toBeLessThanOrEqual(1);
    expect(await rows({ p_offset: 100000 })).toEqual([]);
  });

  it('a sample account is never listed, and publishing then opting out removes a person', async () => {
    await adminClient().from('profiles').update({ is_sample: true }).eq('id', cast.sam.id);
    expect((await rows()).map((r) => r.username)).not.toContain(names.sam);
    await adminClient().from('profiles').update({ is_sample: false }).eq('id', cast.sam.id);
    expect((await rows()).map((r) => r.username)).toContain(names.sam);
    await setPage('sam', 'unlisted');
    expect((await rows()).map((r) => r.username)).not.toContain(names.sam);
  });
});
