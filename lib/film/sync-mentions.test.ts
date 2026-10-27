import { describe, it, expect, vi, beforeEach } from 'vitest';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const SRC = '99999999-9999-4999-8999-999999999999';

type Err = { message: string; code?: string } | null;
let existing: Array<{ id: string; to_entity: string }>;
let selectError: Err;
let insertError: Err;
let deleteError: Err;
const inserted: unknown[][] = [];
let upsertOptions: unknown;
const deletedIds: string[][] = [];

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: async () => ({ data: selectError ? null : existing, error: selectError }) }) }),
      upsert: async (rows: unknown[], opts: unknown) => { inserted.push(rows); upsertOptions = opts; return { error: insertError }; },
      delete: () => ({ in: async (_col: string, ids: string[]) => { deletedIds.push(ids); return { error: deleteError }; } }),
    }),
  },
}));

import { syncMentions } from './links';
import { token } from './mentions';

beforeEach(() => { existing = []; selectError = insertError = deleteError = null; inserted.length = 0; deletedIds.length = 0; });

describe('syncMentions', () => {
  it('adds a link for each new mention, once', async () => {
    const text = `See ${token(A, 'Kitchen')} and ${token(B, 'Roof')} and ${token(A, 'Kitchen')}`;
    expect(await syncMentions('p', SRC, text)).toBeNull();
    expect(inserted).toEqual([[
      { project_id: 'p', from_entity: SRC, to_entity: A, kind: 'mentions' },
      { project_id: 'p', from_entity: SRC, to_entity: B, kind: 'mentions' },
    ]]);
    expect(deletedIds).toEqual([]);
    // existing links are skipped without failing the new ones
    expect(upsertOptions).toEqual({ onConflict: 'from_entity,to_entity,kind', ignoreDuplicates: true });
  });

  it('keeps links that are still written and removes the rest', async () => {
    existing = [{ id: 'l1', to_entity: A }, { id: 'l2', to_entity: B }];
    expect(await syncMentions('p', SRC, `Only ${token(B, 'Roof')} now`)).toBeNull();
    expect(inserted).toEqual([]);
    expect(deletedIds).toEqual([['l1']]);
  });

  it('does nothing when nothing changed, and never mentions itself', async () => {
    existing = [{ id: 'l1', to_entity: C }];
    expect(await syncMentions('p', SRC, `${token(C, 'Van')} ${token(SRC, 'Me')}`)).toBeNull();
    expect(inserted).toEqual([]);
    expect(deletedIds).toEqual([]);
  });

  it('returns the database error instead of throwing', async () => {
    selectError = { message: 'down' };
    expect(await syncMentions('p', SRC, token(A, 'Kitchen'))).toBe('down');
    selectError = null;
    insertError = { message: 'nope' };
    expect(await syncMentions('p', SRC, token(A, 'Kitchen'))).toBe('nope');
    insertError = null; existing = [{ id: 'l1', to_entity: A }]; deleteError = { message: 'rls' };
    expect(await syncMentions('p', SRC, 'nothing')).toBe('rls');
  });
});
