import { describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

vi.mock('@/lib/supabase/client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));
vi.mock('@/lib/supabase/activity', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/supabase/audit', () => ({ logAuditAction: vi.fn() }));

import { requestCapability } from './capabilities';

describe('requestCapability', () => {
  it('asks the database to tell the owner, for this project and this permission', async () => {
    const fake = useFake({}, { request_capability: { data: null, error: null } });
    await requestCapability('p1', 'budget.read');
    expect(fake.calls.filter((c) => c.table === 'rpc:request_capability').map((c) => c.args[0])).toEqual([{ p_project: 'p1', p_capability: 'budget.read' }]);
  });

  it('passes the refusal on in words', async () => {
    useFake({}, { request_capability: { data: null, error: { message: 'You are not on this project' } } });
    await expect(requestCapability('p1', 'budget.read')).rejects.toThrow('You are not on this project');
  });
});
