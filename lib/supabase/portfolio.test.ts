import { describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));

import {
  addPortfolioMedia, findPitchBoard, getPitchMaterial, getPortfolioBlocks, getPortfolioOwner, getPortfolioProjects, getPublicPortfolio, hasPortfolioPage, getMyPortfolioPage, setMyPortfolioPage, reorderPortfolioBlocks, setPortfolioCover, setPortfolioVisibility,
} from './portfolio';

const boom = { message: 'nope' };

describe('addPortfolioMedia', () => {
  it('needs a URL', async () => {
    useFake();
    await expect(addPortfolioMedia({ media_type: 'image' })).rejects.toThrow('URL is required');
  });

  it.each([
    'https://youtube.com/watch?v=abc',
    'https://www.youtube.com/watch?v=abc',
    'https://youtu.be/abc',
  ])('accepts the YouTube link %s', async (url) => {
    const f = useFake({ portfolio_media: { data: { id: 'm1' } } });
    expect(await addPortfolioMedia({ media_type: 'youtube', url })).toEqual({ id: 'm1' });
    expect(f.argsOf('portfolio_media', 'insert')).toHaveLength(1);
  });

  it.each([
    'https://youtube.com.evil.example/watch?v=abc',
    'https://notyoutube.com/watch',
    'not a url',
    'javascript:alert(1)',
  ])('refuses the YouTube link %s, and saves nothing', async (url) => {
    const f = useFake({ portfolio_media: {} });
    await expect(addPortfolioMedia({ media_type: 'youtube', url })).rejects.toThrow('Invalid YouTube URL');
    expect(f.calls).toEqual([]);
  });

  it('takes a direct image link only', async () => {
    useFake({ portfolio_media: { data: { id: 'm2' } } });
    await expect(addPortfolioMedia({ media_type: 'image', url: 'https://cdn.example/a/b.PNG' })).resolves.toEqual({ id: 'm2' });
    await expect(addPortfolioMedia({ media_type: 'image', url: 'https://example.com/page' })).rejects.toThrow('Invalid image URL');
    await expect(addPortfolioMedia({ media_type: 'image', url: 'nope.png' })).rejects.toThrow('Invalid image URL');
  });

  it('does not judge other kinds of media, and throws a failed save', async () => {
    useFake({ portfolio_media: { data: { id: 'm3' } } });
    await expect(addPortfolioMedia({ media_type: 'link', url: 'https://example.com' })).resolves.toEqual({ id: 'm3' });
    useFake({ portfolio_media: { error: boom } });
    await expect(addPortfolioMedia({ media_type: 'link', url: 'https://example.com' })).rejects.toBe(boom);
  });
});

describe('getPortfolioProjects', () => {
  it('narrows to a person only when asked', async () => {
    const all = useFake({ portfolio_projects: { data: [] } });
    await getPortfolioProjects();
    expect(all.argsOf('portfolio_projects', 'eq')).toEqual([]);
    const mine = useFake({ portfolio_projects: { data: [] } });
    await getPortfolioProjects('u1');
    expect(mine.argsOf('portfolio_projects', 'eq')).toEqual([['user_id', 'u1']]);
  });

  it('throws on an error', async () => {
    useFake({ portfolio_projects: { error: boom } });
    await expect(getPortfolioProjects()).rejects.toBe(boom);
  });
});

describe('blocks', () => {
  it('lists none rather than null', async () => {
    useFake({ portfolio_blocks: { data: null } });
    expect(await getPortfolioBlocks('pp1')).toEqual([]);
  });

  it('reorderPortfolioBlocks numbers them from zero in the order given', async () => {
    const f = useFake({ portfolio_blocks: {} });
    await reorderPortfolioBlocks(['b', 'a', 'c']);
    expect(f.argsOf('portfolio_blocks', 'update')).toEqual([[{ position: 0 }], [{ position: 1 }], [{ position: 2 }]]);
    expect(f.argsOf('portfolio_blocks', 'eq')).toEqual([['id', 'b'], ['id', 'a'], ['id', 'c']]);
  });
});

describe('findPitchBoard', () => {
  it('returns the board, or null when there is none yet', async () => {
    useFake({ portfolio_projects: { data: [{ id: 'pp1', share_token: 't' }] } });
    expect(await findPitchBoard('p1', 'u1')).toEqual({ id: 'pp1', share_token: 't' });
    useFake({ portfolio_projects: { data: [] } });
    expect(await findPitchBoard('p1', 'u1')).toBeNull();
  });

  it('throws on a failed lookup, so it is never mistaken for "none yet"', async () => {
    useFake({ portfolio_projects: { error: boom } });
    await expect(findPitchBoard('p1', 'u1')).rejects.toBe(boom);
  });
});

describe('getPitchMaterial', () => {
  it('turns budget amounts into numbers and takes the latest script', async () => {
    useFake({
      media: { data: [{ id: 'i1' }] },
      scenes: { data: [{ id: 's1' }] },
      budget_items: { data: [{ category: 'Camera', amount: '1200.5' }, { category: 'Food', amount: null }] },
      scripts: { data: [{ content: 'INT. KITCHEN' }] },
    });
    const m = await getPitchMaterial('p1');
    expect(m.budget).toEqual([{ category: 'Camera', amount: 1200.5 }, { category: 'Food', amount: 0 }]);
    expect(m.scriptContent).toBe('INT. KITCHEN');
    expect(m.images).toHaveLength(1);
  });

  it('has no script text when there is no script', async () => {
    useFake({ scripts: { data: [] } });
    expect((await getPitchMaterial('p1')).scriptContent).toBeNull();
  });

  it('throws when any part fails', async () => {
    useFake({ scenes: { error: boom } });
    await expect(getPitchMaterial('p1')).rejects.toBe(boom);
  });
});

describe('the person a portfolio belongs to', () => {
  it('reads their profile, and none when there is none', async () => {
    const f = useFake({ profiles: { data: { username: 'mara', role: 'DP', location: null, bio: null, avatar_url: null, status: 'OPEN' } } });
    expect(await getPortfolioOwner('u1')).toMatchObject({ username: 'mara', role: 'DP' });
    expect(f.argsOf('profiles', 'eq')).toEqual([['id', 'u1']]);
    useFake({ profiles: { data: null } });
    expect(await getPortfolioOwner('u2')).toBeNull();
  });
  it('throws on an error', async () => {
    useFake({ profiles: { error: boom } });
    await expect(getPortfolioOwner('u1')).rejects.toBe(boom);
  });
});

describe('setPortfolioCover', () => {
  it('saves an https image link, trimmed, and clears with null', async () => {
    const f = useFake({ portfolio_projects: { data: [{ id: 'p1' }] } });
    await setPortfolioCover('p1', '  https://img.example.com/a.jpg ');
    await setPortfolioCover('p1', null);
    expect(f.argsOf('portfolio_projects', 'update')).toEqual([[{ cover_url: 'https://img.example.com/a.jpg' }], [{ cover_url: null }]]);
  });
  it('refuses anything else, and saves nothing', async () => {
    const f = useFake({ portfolio_projects: {} });
    for (const bad of ['http://img.example.com/a.jpg', 'javascript:alert(1)', 'nope']) await expect(setPortfolioCover('p1', bad)).rejects.toThrow('starts with https://');
    expect(f.calls).toEqual([]);
  });
  it('says so when nothing changed (not the owner), and when the write fails', async () => {
    useFake({ portfolio_projects: { data: [] } });
    await expect(setPortfolioCover('p1', 'https://img.example.com/a.jpg')).rejects.toThrow('You cannot change this piece.');
    useFake({ portfolio_projects: { error: boom } });
    await expect(setPortfolioCover('p1', 'https://img.example.com/a.jpg')).rejects.toBe(boom);
  });
});

describe('who may see a piece', () => {
  it('publishes and hides a piece, only to a known state', async () => {
    const f = useFake({ portfolio_projects: { data: [{ id: 'p1' }] } });
    await setPortfolioVisibility('p1', 'unlisted');
    await setPortfolioVisibility('p1', 'private');
    expect(f.argsOf('portfolio_projects', 'update')).toEqual([[{ visibility: 'unlisted' }], [{ visibility: 'private' }]]);
    const g = useFake({ portfolio_projects: {} });
    await expect(setPortfolioVisibility('p1', 'friends' as never)).rejects.toThrow('Choose private');
    expect(g.calls).toEqual([]);
  });
  it('says so when nothing changed (not the owner), and when the write fails', async () => {
    useFake({ portfolio_projects: { data: [] } });
    await expect(setPortfolioVisibility('p1', 'public')).rejects.toThrow('You cannot change this piece.');
    useFake({ portfolio_projects: { error: boom } });
    await expect(setPortfolioVisibility('p1', 'public')).rejects.toBe(boom);
  });
  it('reads a shared piece by its link through the share function', async () => {
    const f = useFake({}, { get_shared_portfolio: { data: { id: 'p1', title: 'T', portfolio_media: [], portfolio_blocks: [], profiles: null } } });
    expect(await getPublicPortfolio('tok')).toMatchObject({ id: 'p1' });
    expect(f.argsOf('rpc:get_shared_portfolio', 'rpc')).toEqual([[{ p_token: 'tok' }]]);
    useFake({}, { get_shared_portfolio: { data: null } });
    expect(await getPublicPortfolio('nope')).toBeNull();
    useFake({}, { get_shared_portfolio: { error: boom } });
    await expect(getPublicPortfolio('tok')).rejects.toBe(boom);
  });
});

describe('a person’s page setting and whether someone has one', () => {
  it('hasPortfolioPage asks the page function by handle, never the profiles table, and is false for nothing, an error or a blank handle', async () => {
    const f = useFake({}, { get_portfolio_page: { data: { page: 'public' } } });
    expect(await hasPortfolioPage('maya')).toBe(true);
    expect(f.argsOf('rpc:get_portfolio_page', 'rpc')).toEqual([[{ p_handle: 'maya' }]]);
    expect(f.calls.filter((c) => c.table === 'profiles')).toEqual([]);
    useFake({}, { get_portfolio_page: { data: null } });
    expect(await hasPortfolioPage('maya')).toBe(false);
    useFake({}, { get_portfolio_page: { data: { page: 'public' }, error: boom } });
    expect(await hasPortfolioPage('maya')).toBe(false);
    expect(await hasPortfolioPage('   ')).toBe(false);
  });

  it('getMyPortfolioPage reads the setting through its function, and anything unknown is off', async () => {
    useFake({}, { get_my_portfolio_page: { data: 'unlisted' } });
    expect(await getMyPortfolioPage()).toBe('unlisted');
    useFake({}, { get_my_portfolio_page: { data: 'everyone' } });
    expect(await getMyPortfolioPage()).toBe('off');
    useFake({}, { get_my_portfolio_page: { data: null } });
    expect(await getMyPortfolioPage()).toBe('off');
  });

  it('setMyPortfolioPage updates the person’s own profile and says so when the database refuses', async () => {
    const f = useFake({ profiles: { data: null } });
    await setMyPortfolioPage('u1', 'public');
    expect(f.argsOf('profiles', 'update')).toEqual([[{ portfolio_page: 'public' }]]);
    useFake({ profiles: { data: null, error: boom } });
    await expect(setMyPortfolioPage('u1', 'public')).rejects.toThrow('nope');
  });
});
