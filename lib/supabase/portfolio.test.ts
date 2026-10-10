import { describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));

import {
  addPortfolioMedia, findPitchBoard, getPitchMaterial, getPortfolioBlocks, getPortfolioProjects, getPublicPortfolio, reorderPortfolioBlocks,
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

describe('getPublicPortfolio', () => {
  it('is null when the link leads nowhere', async () => {
    useFake({ portfolio_projects: { data: null } });
    expect(await getPublicPortfolio('bad')).toBeNull();
  });
});
