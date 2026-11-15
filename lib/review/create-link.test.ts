import { describe, it, expect, vi, beforeEach } from 'vitest';

const insert = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: () => ({ insert: (row: unknown) => { insert(row); return { select: () => ({ single: async () => ({ data: { id: 'l1', token: 't', ...(row as object) }, error: null }) }) }; } }) },
}));

import { createLink } from './versions';

beforeEach(() => insert.mockClear());

describe('createLink', () => {
  it('makes a client link by default, and passes the audience it is given', async () => {
    await createLink('p1', ['v1'], '  Round 1 ');
    expect(insert).toHaveBeenLastCalledWith({ project_id: 'p1', version_ids: ['v1'], label: 'Round 1', layer: 'guest' });
    await createLink('p1', ['v1'], 'For the fund', 'investor');
    expect(insert).toHaveBeenLastCalledWith(expect.objectContaining({ layer: 'investor' }));
    await createLink('p1', ['v1'], 'Press', 'press');
    expect(insert).toHaveBeenLastCalledWith(expect.objectContaining({ layer: 'press' }));
  });
});
