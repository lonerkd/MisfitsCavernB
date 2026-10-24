import { describe, it, expect, vi, beforeEach } from 'vitest';

const remove = vi.fn();
const exists = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: { storage: { from: () => ({ remove, exists }) } },
}));

import { removeFiles } from './deletion';

describe('removeFiles', () => {
  beforeEach(() => {
    remove.mockReset();
    exists.mockReset();
  });

  it('accepts files the API reports as removed without further checks', async () => {
    remove.mockResolvedValue({ data: [{ name: 'a' }, { name: 'b' }], error: null });
    await removeFiles('media', ['a', 'b']);
    expect(exists).not.toHaveBeenCalled();
  });

  it('accepts an unreported file that is already gone', async () => {
    remove.mockResolvedValue({ data: [{ name: 'a' }], error: null });
    exists.mockResolvedValue({ data: false, error: null });
    await removeFiles('media', ['a', 'b']);
    expect(exists).toHaveBeenCalledWith('b');
  });

  it('throws when an unreported file still exists', async () => {
    remove.mockResolvedValue({ data: [], error: null });
    exists.mockResolvedValue({ data: true, error: null });
    await expect(removeFiles('media', ['a'])).rejects.toThrow(/Couldn't remove all your files/);
  });

  it('throws when existence cannot be confirmed', async () => {
    remove.mockResolvedValue({ data: [], error: null });
    exists.mockResolvedValue({ data: false, error: { message: 'boom' } });
    await expect(removeFiles('media', ['a'])).rejects.toThrow(/confirm/);
  });
});
