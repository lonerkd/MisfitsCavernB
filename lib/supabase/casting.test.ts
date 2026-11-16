import { describe, expect, it, vi, beforeEach } from 'vitest';

const calls = vi.hoisted(() => ({ upserts: [] as { row: Record<string, unknown>; opts: unknown }[] }));
vi.mock('./client', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: (row: Record<string, unknown>, opts: unknown) => {
        calls.upserts.push({ row, opts });
        return { select: () => ({ single: () => Promise.resolve({ data: { id: 'c1' }, error: null }) }) };
      },
      insert: () => Promise.resolve({ error: table === 'casting_history' ? null : null }),
    }),
  },
}));

import { setCasting } from './casting';

describe('setCasting', () => {
  beforeEach(() => { calls.upserts = []; });

  it('saves on the table\'s real key, project and character name', async () => {
    await setCasting('p1', '3f2c1a9e-1b2c-4d5e-8f90-1a2b3c4d5e6f', 'Maya', 'u2', 'u1');
    expect(calls.upserts[0].opts).toEqual({ onConflict: 'project_id,character_name' });
    expect(calls.upserts[0].row).toMatchObject({ character_id: '3f2c1a9e-1b2c-4d5e-8f90-1a2b3c4d5e6f', character_name: 'MAYA' });
  });

  it('leaves character_id to the database when the editor only knows the name', async () => {
    await setCasting('p1', 'Maya', 'Maya', 'u2', 'u1');
    expect(calls.upserts[0].row).not.toHaveProperty('character_id');
    expect(calls.upserts[0].row).toMatchObject({ project_id: 'p1', character_name: 'MAYA', crew_user_id: 'u2' });
  });
});
