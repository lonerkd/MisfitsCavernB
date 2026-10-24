import { describe, expect, it } from 'vitest';
import { createFakeSupabase, type FakeResults } from '@/tests/unit-support/fakeSupabase';
import { getPortfolioPreview } from './public';

type Db = Parameters<typeof getPortfolioPreview>[0];
const db = (r: FakeResults) => createFakeSupabase(r).client as unknown as Db;
const row = { title: 'T', description: null, year: 2024, role: 'Director', profiles: { username: 'sam' } };

describe('getPortfolioPreview', () => {
  it('is null without a client or a token, and asks nothing', async () => {
    expect(await getPortfolioPreview(null, 'tok')).toBeNull();
    const f = createFakeSupabase({});
    expect(await getPortfolioPreview(f.client as unknown as Db, '')).toBeNull();
    expect(f.calls).toEqual([]);
  });
  it('looks up by share token', async () => {
    const f = createFakeSupabase({ portfolio_projects: { data: { ...row, portfolio_media: [] } } });
    await getPortfolioPreview(f.client as unknown as Db, 'tok');
    expect(f.argsOf('portfolio_projects', 'eq')).toEqual([['share_token', 'tok']]);
  });
  it('is null when nothing matches or the read fails', async () => {
    expect(await getPortfolioPreview(db({ portfolio_projects: { data: null } }), 'tok')).toBeNull();
    expect(await getPortfolioPreview(db({ portfolio_projects: { data: row, error: { message: 'x' } } }), 'tok')).toBeNull();
  });
  it('always gives portfolio_media as an array', async () => {
    const p = await getPortfolioPreview(db({ portfolio_projects: { data: { ...row, portfolio_media: null } } }), 'tok');
    expect(p?.portfolio_media).toEqual([]);
  });
  it('keeps the media and the author', async () => {
    const media = [{ url: 'https://x/a.png', thumbnail_url: null, media_type: 'image' }];
    const p = await getPortfolioPreview(db({ portfolio_projects: { data: { ...row, portfolio_media: media } } }), 'tok');
    expect(p).toMatchObject({ title: 'T', profiles: { username: 'sam' }, portfolio_media: media });
  });
  it('takes the first author if the join comes back as a list', async () => {
    const p = await getPortfolioPreview(db({ portfolio_projects: { data: { ...row, profiles: [{ username: 'jo' }], portfolio_media: [] } } }), 'tok');
    expect(p?.profiles?.username).toBe('jo');
  });
});
