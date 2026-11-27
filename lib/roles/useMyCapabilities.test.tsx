// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

const rpc = vi.fn();
vi.mock('@/lib/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a), from: vi.fn() } }));
vi.mock('@/lib/os/viewAs', () => ({
  useViewAs: () => 'owner',
  useViewAsRole: () => ({ tier: 'crew', craft: null }),
}));

import { useMyCapabilities } from './capabilities';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('useMyCapabilities', () => {
  it('answers what the database says, with no error', async () => {
    rpc.mockResolvedValue({ data: ['budget.read'], error: null });
    const { result } = renderHook(() => useMyCapabilities('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.can('budget.read')).toBe(true);
    expect(result.current.can('budget.write')).toBe(false);
  });

  it('a failed read is an error, not an empty set dressed as a refusal', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'offline' } });
    const { result } = renderHook(() => useMyCapabilities('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.can('budget.read')).toBe(false);
  });
});
