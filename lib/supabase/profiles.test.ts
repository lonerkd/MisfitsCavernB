import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

const calls: { op: string; table: string; payload?: unknown; id?: string }[] = [];
let existing: { id: string; discord_username: string | null } | null = null;

vi.mock('./client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: existing, error: null }) }) }),
      insert: async (payload: unknown) => { calls.push({ op: 'insert', table, payload }); return { error: null }; },
      update: (payload: unknown) => ({
        eq: async (_col: string, id: string) => { calls.push({ op: 'update', table, payload, id }); return { error: null }; },
      }),
    }),
  },
}));
vi.mock('./activity', () => ({ logActivity: vi.fn() }));

import { buildProfileFields, ensureProfile } from './profiles';

function session(over: Record<string, unknown> = {}): Session {
  return { user: { id: 'u1', email: 'maya.k@example.com', user_metadata: {}, identities: [], ...over } } as unknown as Session;
}

const discord = {
  provider: 'discord',
  identity_data: { id: 'd9', username: 'mayak', global_name: 'Maya K', avatar_url: 'https://cdn.test/a.png' },
};

describe('buildProfileFields', () => {
  it('prefers the Discord display name and avatar', () => {
    const f = buildProfileFields(session({ identities: [discord] }));
    expect(f).toMatchObject({ id: 'u1', username: 'Maya K', avatar_url: 'https://cdn.test/a.png', discord_id: 'd9', discord_username: 'mayak' });
  });

  it('falls back to the email name, then "user"', () => {
    expect(buildProfileFields(session()).username).toBe('maya.k');
    expect(buildProfileFields(session({ email: undefined })).username).toBe('user');
  });

  it('starts the profile open, with no Discord details for an email account', () => {
    const f = buildProfileFields(session());
    expect(f).toMatchObject({ status: 'OPEN', discord_id: null, avatar_url: null });
  });
});

describe('ensureProfile', () => {
  beforeEach(() => { calls.length = 0; existing = null; });

  it('creates the profile on first sign-in', async () => {
    await ensureProfile(session());
    expect(calls).toEqual([expect.objectContaining({ op: 'insert', table: 'profiles' })]);
  });

  it('adds Discord details to a profile that lacks them', async () => {
    existing = { id: 'u1', discord_username: null };
    await ensureProfile(session({ identities: [discord] }));
    expect(calls).toEqual([expect.objectContaining({ op: 'update', id: 'u1', payload: expect.objectContaining({ discord_username: 'mayak' }) })]);
  });

  it('leaves a complete profile alone', async () => {
    existing = { id: 'u1', discord_username: 'mayak' };
    await ensureProfile(session({ identities: [discord] }));
    expect(calls).toEqual([]);
  });
});
