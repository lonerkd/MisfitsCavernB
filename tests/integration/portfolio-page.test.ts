import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';

// A person's own page: off until they publish it; then only their PUBLIC pieces and a few public profile fields, to anyone.
let cast: Cast;
let handle: string;
const anon = () => anonClient();

beforeAll(async () => {
  cast = await createCast();
  const me = await cast.sam.client.from('profiles').select('username').eq('id', cast.sam.id).single();
  if (me.error) throw me.error;
  handle = me.data.username;
  const rows = [
    { title: 'Public Film', visibility: 'public', year: 2026 },
    { title: 'Link Only Film', visibility: 'unlisted', year: 2025 },
    { title: 'Private Film', visibility: 'private', year: 2024 },
  ];
  for (const r of rows) {
    const ins = await cast.sam.client.from('portfolio_projects').insert({ user_id: cast.sam.id, ...r }).select('id');
    if (ins.error) throw ins.error;
  }
});
afterAll(async () => { await destroyCast(cast); });

const page = (who: 'sam' | 'jordan' | 'riley' | 'anon', h = handle) =>
  (who === 'anon' ? anon() : cast[who].client).rpc('get_portfolio_page', { p_handle: h });
const mine = async () => (await cast.sam.client.rpc('get_my_portfolio_page')).data;
const setPage = (value: string) => cast.sam.client.from('profiles').update({ portfolio_page: value }).eq('id', cast.sam.id);

describe('a person’s portfolio page', () => {
  it('is off by default: nobody, signed in or not, gets a page', async () => {
    expect(await mine()).toBe('off');
    for (const who of ['sam', 'jordan', 'riley', 'anon'] as const) {
      const r = await page(who);
      expect(r.error, who).toBeNull();
      expect(r.data, who).toBeNull();
    }
  });

  it('only the person can turn it on or change it, and only to a known setting', async () => {
    // Someone else's update touches no row (the own-row policy), so it changes nothing and reads back as before.
    await cast.riley.client.from('profiles').update({ portfolio_page: 'public' }).eq('id', cast.sam.id);
    expect(await mine()).toBe('off');
    expect((await setPage('everyone')).error?.code).toBe('23514');
    expect((await setPage('public')).error).toBeNull();
    expect(await mine()).toBe('public');
  });

  it('public: anyone reads the profile fields and ONLY the public pieces (never a link-only or private one)', async () => {
    for (const who of ['anon', 'riley', 'jordan'] as const) {
      const r = await page(who);
      expect(r.error, who).toBeNull();
      const d = r.data as { page: string; profile: Record<string, unknown>; pieces: Array<{ title: string; share_token: string }> };
      expect(d.page, who).toBe('public');
      expect(d.pieces.map((p) => p.title), who).toEqual(['Public Film']);
      // Nothing but the public fields: no email, no admin flag, no account ids.
      expect(Object.keys(d.profile).sort(), who).toEqual(['avatar_url', 'bio', 'location', 'role', 'status', 'username']);
    }
  });

  it('the handle matches without regard to case, and an unknown or empty handle is null', async () => {
    expect((await page('anon', handle.toUpperCase())).data).not.toBeNull();
    expect((await page('anon', `  ${handle} `)).data).not.toBeNull();
    expect((await page('anon', 'nobody-by-this-name')).data).toBeNull();
    expect((await page('anon', '')).data).toBeNull();
  });

  it('unlisted: reachable by the handle and says so (the page keeps it out of the index), still only the public pieces', async () => {
    await setPage('unlisted');
    const d = (await page('anon')).data as { page: string; pieces: Array<{ title: string }> };
    expect(d.page).toBe('unlisted');
    expect(d.pieces.map((p) => p.title)).toEqual(['Public Film']);
  });

  it('turning it off closes it again', async () => {
    await setPage('off');
    expect((await page('anon')).data).toBeNull();
  });

  it('the setting is not readable through the table by anyone (nobody can enumerate link-only pages), and a visitor has no my-page function', async () => {
    for (const who of ['anon', 'riley', 'sam'] as const) {
      const r = await (who === 'anon' ? anon() : cast[who].client).from('profiles').select('portfolio_page').eq('id', cast.sam.id);
      expect(r.error?.code, who).toBe('42501');
    }
    expect((await anon().rpc('get_my_portfolio_page')).error?.code).toBe('42501');
    expect(await (async () => (await cast.riley.client.rpc('get_my_portfolio_page')).data)()).toBe('off');
  });
});
