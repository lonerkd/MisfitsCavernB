import { describe, it, expect, vi, beforeEach } from 'vitest';

// The delete chain: from('links').delete().eq('id', …).select('id') → { data, error }.
let result: { data: Array<{ id: string }> | null; error: { message: string } | null };
vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: () => ({ delete: () => ({ eq: () => ({ select: async () => result }) }) }) },
}));

import { detach } from './links';

beforeEach(() => { result = { data: [], error: null }; });

describe('detach', () => {
  it('succeeds when a row was deleted', async () => {
    result = { data: [{ id: 'l1' }], error: null };
    expect(await detach('l1')).toBeNull();
  });

  it('says so when row-level security deleted nothing (not yours to remove)', async () => {
    result = { data: [], error: null };
    expect(await detach('l1')).toMatch(/Only the person who attached it/);
    result = { data: null, error: null };
    expect(await detach('l1')).toMatch(/Only the person who attached it/);
  });

  it('passes a database error through', async () => {
    result = { data: null, error: { message: 'boom' } };
    expect(await detach('l1')).toBe('boom');
  });
});
