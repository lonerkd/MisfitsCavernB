import { describe, expect, it } from 'vitest';
import { createFakeSupabase } from '@/tests/unit-support/fakeSupabase';
import { getPortfolioPreview } from './public';

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
