import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

const { logActivity } = vi.hoisted(() => ({ logActivity: vi.fn() }));
vi.mock('@/lib/os', () => ({ awaitOSUser: async () => ({ id: 'user-1' }) }));
vi.mock('@/lib/supabase/client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));
vi.mock('@/lib/supabase/activity', () => ({ logActivity }));

import { createRevisionDB } from './revisions';

beforeEach(() => vi.clearAllMocks());

describe('script revision activity', () => {
  it('records a locked revision for its project without logging script contents', async () => {
    useFake({
      script_revisions: {
        data: { id: 'revision-1', color_index: 0, label: 'White Revision', snapshot: 'private screenplay', created_at: '2026-10-27T00:00:00Z' },
        error: null,
      },
    });

    await createRevisionDB('script-1', 'private screenplay', 0, undefined, 'project-1');

    expect(logActivity).toHaveBeenCalledWith('locked a script revision', 'script', 'script-1', { project_id: 'project-1' });
    expect(JSON.stringify(logActivity.mock.calls)).not.toContain('private screenplay');
  });

  it('does not add project activity for a personal script', async () => {
    useFake({
      script_revisions: {
        data: { id: 'revision-1', color_index: 0, label: 'White Revision', snapshot: 'private screenplay', created_at: '2026-10-27T00:00:00Z' },
        error: null,
      },
    });

    await createRevisionDB('script-1', 'private screenplay', 0);

    expect(logActivity).not.toHaveBeenCalled();
  });
});
