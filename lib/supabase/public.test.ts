import { describe, expect, it } from 'vitest';
import { createFakeSupabase } from '@/tests/unit-support/fakeSupabase';
import { getPortfolioPage, getPortfolioPreview, listPublicPortfolios } from './public';

type Db = Parameters<typeof getPortfolioPreview>[0];
const dbWith = (data: unknown, error: { message: string } | null = null) => createFakeSupabase({}, { get_shared_portfolio: { data, error } }).client as unknown as Db;
const row = { title: 'T', description: null, year: 2024, role: 'Director', profiles: { username: 'sam' } };

describe('getPortfolioPreview', () => {
  it('is null without a client or a token, and asks nothing', async () => {
    expect(await getPortfolioPreview(null, 'tok')).toBeNull();
    const f = createFakeSupabase({});
    expect(await getPortfolioPreview(f.client as unknown as Db, '')).toBeNull();
    expect(f.calls).toEqual([]);
  });
  it('looks up by share token through the share function, never the table', async () => {
    const f = createFakeSupabase({}, { get_shared_portfolio: { data: { ...row, portfolio_media: [] } } });
    await getPortfolioPreview(f.client as unknown as Db, 'tok');
    expect(f.argsOf('rpc:get_shared_portfolio', 'rpc')).toEqual([[{ p_token: 'tok' }]]);
    expect(f.calls.filter((c) => c.table === 'portfolio_projects')).toEqual([]);
  });
  it('is null when nothing matches (a private piece, an unknown token) or the read fails', async () => {
    expect(await getPortfolioPreview(dbWith(null), 'tok')).toBeNull();
    expect(await getPortfolioPreview(dbWith(row, { message: 'x' }), 'tok')).toBeNull();
  });
  it('always gives portfolio_media as an array', async () => {
    const p = await getPortfolioPreview(dbWith({ ...row, portfolio_media: null }), 'tok');
    expect(p?.portfolio_media).toEqual([]);
  });
  it('keeps the media and the author', async () => {
    const media = [{ url: 'https://x/a.png', thumbnail_url: null, media_type: 'image' }];
    const p = await getPortfolioPreview(dbWith({ ...row, portfolio_media: media }), 'tok');
    expect(p).toMatchObject({ title: 'T', profiles: { username: 'sam' }, portfolio_media: media });
  });
  it('has no author when the piece has none', async () => {
    const p = await getPortfolioPreview(dbWith({ ...row, profiles: null, portfolio_media: [] }), 'tok');
    expect(p?.profiles).toBeNull();
  });
});

describe('getPortfolioPreview cover', () => {
  it('carries the piece’s cover for the link preview, and none when it has none', async () => {
    expect((await getPortfolioPreview(dbWith({ ...row, cover_url: 'https://x/c.jpg', portfolio_media: [] }), 'tok'))?.cover_url).toBe('https://x/c.jpg');
    expect((await getPortfolioPreview(dbWith({ ...row, portfolio_media: [] }), 'tok'))?.cover_url).toBeNull();
  });
});

describe('getPortfolioPage', () => {
  const page = { page: 'public', profile: { username: 'maya', role: 'Director', location: null, bio: null, avatar_url: null, status: null }, pieces: [] };
  const dbPage = (data: unknown, error: { message: string } | null = null) => createFakeSupabase({}, { get_portfolio_page: { data, error } }).client as unknown as Db;

  it('is null without a client or a handle, and asks nothing', async () => {
    expect(await getPortfolioPage(null, 'maya')).toBeNull();
    const f = createFakeSupabase({});
    expect(await getPortfolioPage(f.client as unknown as Db, '  ')).toBeNull();
    expect(f.calls).toEqual([]);
  });
  it('asks the page function by handle, never the profiles table', async () => {
    const f = createFakeSupabase({}, { get_portfolio_page: { data: page } });
    await getPortfolioPage(f.client as unknown as Db, 'maya');
    expect(f.argsOf('rpc:get_portfolio_page', 'rpc')).toEqual([[{ p_handle: 'maya' }]]);
    expect(f.calls.filter((c) => c.table === 'profiles')).toEqual([]);
  });
  it('is null when there is no page (unknown name, page off) or the read fails', async () => {
    expect(await getPortfolioPage(dbPage(null), 'maya')).toBeNull();
    expect(await getPortfolioPage(dbPage(page, { message: 'x' }), 'maya')).toBeNull();
  });
  it('trusts only the two published settings, and always gives pieces as an array', async () => {
    expect(await getPortfolioPage(dbPage({ ...page, page: 'off' }), 'maya')).toBeNull();
    expect(await getPortfolioPage(dbPage({ ...page, page: 'whatever' }), 'maya')).toBeNull();
    expect((await getPortfolioPage(dbPage({ ...page, pieces: null }), 'maya'))?.pieces).toEqual([]);
    expect((await getPortfolioPage(dbPage({ ...page, credits: null }), 'maya'))?.credits).toEqual([]);
    expect((await getPortfolioPage(dbPage({ ...page, credits: [{ title: 'Pier', share_token: 't' }] }), 'maya'))?.credits).toHaveLength(1);
    expect((await getPortfolioPage(dbPage({ ...page, page: 'unlisted' }), 'maya'))?.page).toBe('unlisted');
  });
});

describe('listPublicPortfolios', () => {
  const dbList = (data: unknown, error: { message: string } | null = null) => createFakeSupabase({}, { list_public_portfolios: { data, error } }).client as unknown as Db;
  it('is empty without a client, and when the read fails or returns something else', async () => {
    expect(await listPublicPortfolios(null, { limit: 5, offset: 0 })).toEqual([]);
    expect(await listPublicPortfolios(dbList([{ username: 'a' }], { message: 'x' }), { limit: 5, offset: 0 })).toEqual([]);
    expect(await listPublicPortfolios(dbList(null), { limit: 5, offset: 0 })).toEqual([]);
  });
  it('asks the directory function (never the profiles table), with the search, limit and offset', async () => {
    const f = createFakeSupabase({}, { list_public_portfolios: { data: [{ username: 'maya', pieces: 2 }] } });
    const rows = await listPublicPortfolios(f.client as unknown as Db, { q: 'gaffer', limit: 25, offset: 24 });
    expect(rows).toEqual([{ username: 'maya', pieces: 2 }]);
    expect(f.argsOf('rpc:list_public_portfolios', 'rpc')).toEqual([[{ p_query: 'gaffer', p_limit: 25, p_offset: 24 }]]);
    expect(f.calls.filter((c) => c.table === 'profiles')).toEqual([]);
  });
  it('sends no search text (so the database default applies) when there is none', async () => {
    const f = createFakeSupabase({}, { list_public_portfolios: { data: [] } });
    await listPublicPortfolios(f.client as unknown as Db, { q: '', limit: 25, offset: 0 });
    expect(f.argsOf('rpc:list_public_portfolios', 'rpc')).toEqual([[{ p_limit: 25, p_offset: 0 }]]);
  });
});
