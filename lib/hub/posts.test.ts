import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));

import { sortPosts, forAudience, isPublished, checkPost, unreadCount, type HubPost, type HubPostInput } from './posts';

const p = (over: Partial<HubPost>): HubPost => ({
  id: 'x', kind: 'update', audience: 'everyone', title: 'T', body: '', cover_url: null, important: false, pinned: false,
  published_at: '2026-10-01T00:00:00Z', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', ...over,
});

describe('sortPosts', () => {
  it('pinned first, then newest', () => {
    const sorted = sortPosts([
      p({ id: 'old', published_at: '2026-01-01T00:00:00Z' }),
      p({ id: 'new', published_at: '2026-10-20T00:00:00Z' }),
      p({ id: 'pin', pinned: true, published_at: '2025-01-01T00:00:00Z' }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['pin', 'new', 'old']);
  });
});

describe('forAudience', () => {
  it('an audience page shows its posts and posts for everyone', () => {
    const posts = [p({ id: 'all' }), p({ id: 'dev', audience: 'developers' }), p({ id: 'inv', audience: 'investors' })];
    expect(forAudience(posts, 'developers').map((x) => x.id)).toEqual(['all', 'dev']);
    expect(forAudience(posts, 'everyone')).toHaveLength(3);
  });
});

describe('isPublished / unreadCount', () => {
  it('drafts and future posts are not published, so not unread', () => {
    const now = Date.parse('2026-10-25T00:00:00Z');
    const posts = [p({ id: 'a' }), p({ id: 'draft', published_at: null }), p({ id: 'later', published_at: '2027-01-01T00:00:00Z' }), p({ id: 'seen' })];
    expect(isPublished(posts[1], now)).toBe(false);
    expect(unreadCount(posts, new Set(['seen']), now)).toBe(1);
  });
});

describe('checkPost', () => {
  const base: HubPostInput = { kind: 'update', audience: 'everyone', title: ' Hello ', body: 'b', cover_url: '', important: false, pinned: false };
  it('trims the title and empties a blank cover', () => {
    expect(checkPost(base)).toEqual({ ok: true, value: { ...base, title: 'Hello', cover_url: null } });
  });
  it('refuses a missing title, an http cover and an unknown audience', () => {
    expect(checkPost({ ...base, title: '  ' }).ok).toBe(false);
    expect(checkPost({ ...base, cover_url: 'http://x.test/a.png' }).ok).toBe(false);
    expect(checkPost({ ...base, audience: 'aliens' as never }).ok).toBe(false);
  });
});
