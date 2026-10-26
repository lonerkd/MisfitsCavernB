import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));

import { bannerIncident, isOpen, sortIncidents } from './status';
import type { HubPost } from './posts';

const now = Date.parse('2026-10-26T12:00:00Z');
const post = (id: string, over: Partial<HubPost>): HubPost => ({
  id, kind: 'incident', audience: 'everyone', title: id, body: '', cover_url: null, important: false, pinned: false,
  published_at: '2026-10-26T10:00:00Z', severity: 'minor', resolved_at: null,
  created_at: '2026-10-26T10:00:00Z', updated_at: '2026-10-26T10:00:00Z', ...over,
});

describe('status', () => {
  it('an incident is open while published and unresolved', () => {
    expect(isOpen(post('a', {}), now)).toBe(true);
    expect(isOpen(post('b', { resolved_at: '2026-10-26T11:00:00Z' }), now)).toBe(false);
    expect(isOpen(post('c', { published_at: null }), now)).toBe(false);
    expect(isOpen(post('d', { published_at: '2026-10-27T00:00:00Z' }), now)).toBe(false);
    expect(isOpen(post('e', { kind: 'update', severity: null }), now)).toBe(false);
  });

  it('sorts open (most severe first) before resolved (newest first), and drops other kinds', () => {
    const list = [
      post('resolved-old', { resolved_at: 'x', published_at: '2026-10-20T00:00:00Z' }),
      post('minor', {}),
      post('update', { kind: 'update', severity: null }),
      post('critical', { severity: 'critical', published_at: '2026-10-25T00:00:00Z' }),
      post('resolved-new', { resolved_at: 'x', published_at: '2026-10-24T00:00:00Z' }),
    ];
    expect(sortIncidents(list, now).map((p) => p.id)).toEqual(['critical', 'minor', 'resolved-new', 'resolved-old']);
  });

  it('the banner shows the most severe open incident, or nothing', () => {
    expect(bannerIncident([post('m', { severity: 'major' }), post('c', { severity: 'critical' })], now)?.id).toBe('c');
    expect(bannerIncident([post('r', { resolved_at: 'x' })], now)).toBeNull();
  });
});
