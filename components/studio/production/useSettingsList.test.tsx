// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const toast = vi.fn();
const confirm = vi.fn();
const upsert = vi.fn();
const del = vi.fn();
let rows: Array<Record<string, unknown>> = [];
let onChange: () => void = () => {};

vi.mock('../StudioContext', () => ({ useStudio: () => ({ project: { id: 'p1', settings: null } }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => confirm }));
vi.mock('@/lib/supabase/productionRecords', () => ({
  listRecords: async () => rows,
  upsertRecords: (...a: unknown[]) => upsert(...a),
  deleteRecords: (...a: unknown[]) => del(...a),
  subscribeToRecords: (_p: string, _k: string, cb: () => void) => { onChange = cb; return () => {}; },
}));
import { useSettingsList } from './useSettingsList';

const permit = (id: string) => ({ id, location: `L${id}`, permitType: 'film', issuedBy: 'city', expiry: '', status: 'pending' as const });
const load = async () => {
  const hook = renderHook(() => useSettingsList('permits'));
  await waitFor(() => expect(hook.result.current.items.length).toBe(rows.length));
  return hook;
};

beforeEach(() => { rows = [permit('a'), permit('b')]; upsert.mockResolvedValue(undefined); del.mockResolvedValue(undefined); confirm.mockResolvedValue(true); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('useSettingsList', () => {
  it('reads the project’s records of its kind; none is an empty list, not an error', async () => {
    expect((await load()).result.current.items.map((i) => i.id)).toEqual(['a', 'b']);
    rows = [];
    expect((await load()).result.current.items).toEqual([]);
  });

  it('saving writes only the new record, and says true', async () => {
    const { result } = await load();
    let ok = false;
    await act(async () => { ok = await result.current.save([...result.current.items, permit('c')]); });
    expect(ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith('p1', 'permits', [permit('c')]);
    expect(del).toHaveBeenCalledWith('p1', 'permits', []);
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('changing one record writes that one only', async () => {
    const { result } = await load();
    await act(async () => { await result.current.save(result.current.items.map((i) => (i.id === 'b' ? { ...i, status: 'approved' as const } : i))); });
    expect(upsert).toHaveBeenCalledWith('p1', 'permits', [{ ...permit('b'), status: 'approved' }]);
  });

  it('a refused save tells the person and says false', async () => {
    upsert.mockRejectedValue(new Error('new row violates row-level security policy'));
    const { result } = await load();
    let ok = true;
    await act(async () => { ok = await result.current.save([permit('z')]); });
    expect(ok).toBe(false);
    expect(toast).toHaveBeenCalledWith('new row violates row-level security policy', 'error');
  });

  it('a failure with no message still says something', async () => {
    upsert.mockRejectedValue('boom');
    const { result } = await load();
    await act(async () => { await result.current.save([permit('z')]); });
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/could not save/i), 'error');
  });

  it('remove asks first; "no" deletes nothing, "yes" removes only that record', async () => {
    const { result } = await load();
    confirm.mockResolvedValueOnce(false);
    await act(async () => { await result.current.remove('a', 'this permit'); });
    expect(del).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('this permit'), danger: true }));
    await act(async () => { await result.current.remove('a'); });
    expect(del).toHaveBeenCalledWith('p1', 'permits', ['a']);
  });

  it('a change by someone else refreshes the list', async () => {
    const { result } = await load();
    rows = [permit('a'), permit('b'), permit('c')];
    await act(async () => { onChange(); });
    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b', 'c']));
  });

  it('a second save while the first is still going is ignored, and the person is told', async () => {
    let release: () => void = () => {};
    upsert.mockReturnValue(new Promise<void>((r) => { release = r; }));
    const { result } = await load();
    let first: Promise<boolean> = Promise.resolve(false);
    let second = true;
    await act(async () => {
      first = result.current.save([permit('x')]);
      second = await result.current.save([permit('y')]);
    });
    expect(second).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/still saving/i), 'info');
    await act(async () => { release(); await first; });
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
