// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const toast = vi.fn();
const confirm = vi.fn();
const patch = vi.fn();
let settings: Record<string, unknown> | null = null;

vi.mock('../StudioContext', () => ({ useStudio: () => ({ project: { id: 'p1', settings } }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => confirm }));
vi.mock('@/lib/supabase/progress', () => ({ patchProjectSettings: (...a: unknown[]) => patch(...a) }));
import { useSettingsList } from './useSettingsList';

const permit = (id: string) => ({ id, location: `L${id}`, permitType: 'film', issuedBy: 'city', expiry: '', status: 'pending' as const });

beforeEach(() => { settings = { permits: [permit('a'), permit('b')] }; patch.mockResolvedValue({}); confirm.mockResolvedValue(true); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('useSettingsList', () => {
  it('reads the list by its key, and an empty project has an empty list (not an error)', () => {
    expect(renderHook(() => useSettingsList('permits')).result.current.items.map((i) => i.id)).toEqual(['a', 'b']);
    settings = null;
    expect(renderHook(() => useSettingsList('permits')).result.current.items).toEqual([]);
  });

  it('saves the whole list under its key and says true', async () => {
    const { result } = renderHook(() => useSettingsList('permits'));
    let ok = false;
    await act(async () => { ok = await result.current.save([...result.current.items, permit('c')]); });
    expect(ok).toBe(true);
    expect(patch).toHaveBeenCalledWith('p1', { permits: [permit('a'), permit('b'), permit('c')] });
    expect(toast).not.toHaveBeenCalled();
  });

  it('a refused save (a crew member is not the owner) tells the person and says false', async () => {
    patch.mockRejectedValue(new Error('Only the project owner can change this'));
    const { result } = renderHook(() => useSettingsList('permits'));
    let ok = true;
    await act(async () => { ok = await result.current.save([]); });
    expect(ok).toBe(false);
    expect(toast).toHaveBeenCalledWith('Only the project owner can change this', 'error');
  });

  it('a failure with no message still says something', async () => {
    patch.mockRejectedValue('boom');
    const { result } = renderHook(() => useSettingsList('permits'));
    await act(async () => { await result.current.save([]); });
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/could not save/i), 'error');
  });

  it('remove asks first; "no" saves nothing, "yes" removes only that record', async () => {
    const { result } = renderHook(() => useSettingsList('permits'));
    confirm.mockResolvedValueOnce(false);
    await act(async () => { await result.current.remove('a', 'this permit'); });
    expect(patch).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('this permit'), danger: true }));

    await act(async () => { await result.current.remove('a'); });
    expect(patch).toHaveBeenCalledWith('p1', { permits: [permit('b')] });
  });

  it('a second save while the first is still going is ignored (no double add)', async () => {
    let release: (v: unknown) => void = () => {};
    patch.mockReturnValue(new Promise((r) => { release = r; }));
    const { result } = renderHook(() => useSettingsList('permits'));
    let first: Promise<boolean> = Promise.resolve(false);
    let second = true;
    await act(async () => {
      first = result.current.save([permit('x')]);
      second = await result.current.save([permit('y')]);
    });
    expect(second).toBe(false);
    await act(async () => { release({}); await first; });
    expect(patch).toHaveBeenCalledTimes(1);
  });
});
