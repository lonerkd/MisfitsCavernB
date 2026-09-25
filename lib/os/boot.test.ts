import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// A controllable stand-in for the Supabase client: each test decides how the
// auth server and the profiles table behave (slow, failing, or healthy).
const { auth, profileLookup } = vi.hoisted(() => ({
  auth: { getUser: vi.fn(), getSession: vi.fn() },
  profileLookup: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth,
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: profileLookup }) }) };
      }
      // projects: an empty list keeps loadProjects() trivial.
      return { select: () => ({ order: async () => ({ data: [], error: null }) }) };
    },
  },
}));
vi.mock('@/lib/supabase/audit', () => ({ logAuditAction: vi.fn() }));
vi.mock('./sync', () => ({
  syncActiveProject: vi.fn(),
  syncProjectList: vi.fn(),
  teardownSync: vi.fn(),
}));
vi.mock('./queries', () => ({ fetchProjectDetails: vi.fn() }));

import { osHydrateSession } from './boot';
import { osState } from './store';

const USER = { id: 'user-1', email: 'sam@example.com' };
const session = { data: { session: { user: USER } }, error: null };
const networkError = { data: { user: null }, error: new Error('Failed to fetch') };

beforeEach(() => {
  auth.getUser.mockReset();
  auth.getSession.mockReset();
  profileLookup.mockReset();
  osState().setSession({ status: 'resolving', userId: null, user: null, email: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('osHydrateSession — a signed-in user is never demoted to anon', () => {
  it('stays authed when the profile row cannot be read (network failure)', async () => {
    auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    profileLookup.mockResolvedValue({ data: null, error: new Error('Failed to fetch') });

    await expect(osHydrateSession()).resolves.toBe(true);

    const s = osState().session;
    expect(s.status).toBe('authed');
    expect(s.userId).toBe(USER.id);
    expect(s.user?.username).toBe('sam');
    expect(profileLookup).toHaveBeenCalledTimes(3);
  });

  it('retries a transient profile failure and uses the real profile', async () => {
    auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    profileLookup
      .mockResolvedValueOnce({ data: null, error: new Error('Failed to fetch') })
      .mockResolvedValueOnce({ data: { id: USER.id, username: 'samwise', email: USER.email }, error: null });

    await osHydrateSession();

    expect(osState().session.status).toBe('authed');
    expect(osState().session.user?.username).toBe('samwise');
    expect(profileLookup).toHaveBeenCalledTimes(2);
  });

  it('falls back to the local session when the auth server errors', async () => {
    auth.getUser.mockResolvedValue(networkError);
    auth.getSession.mockResolvedValue(session);
    profileLookup.mockResolvedValue({ data: { id: USER.id, username: 'sam' }, error: null });

    await osHydrateSession();

    expect(osState().session.status).toBe('authed');
    expect(osState().session.userId).toBe(USER.id);
  });

  it('does not wait forever on a hanging auth server', async () => {
    vi.useFakeTimers();
    auth.getUser.mockReturnValue(new Promise(() => {})); // never settles
    auth.getSession.mockResolvedValue(session);
    profileLookup.mockResolvedValue({ data: { id: USER.id, username: 'sam' }, error: null });

    const hydrated = osHydrateSession();
    await vi.advanceTimersByTimeAsync(8000);

    await expect(hydrated).resolves.toBe(true);
    expect(osState().session.status).toBe('authed');
  });

  it('reports no user when there is genuinely no session', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(osHydrateSession()).resolves.toBe(false);
    expect(profileLookup).not.toHaveBeenCalled();
  });
});
