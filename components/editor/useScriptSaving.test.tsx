// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { StoredScript } from '@/lib/scriptos/storage';

const { saveScript } = vi.hoisted(() => ({ saveScript: vi.fn() }));
vi.mock('@/lib/scriptos/storage', () => ({ saveScript }));

import { useScriptSaving } from './useScriptSaving';

const script = { id: 's1', title: 'Test Script', content: 'x' } as StoredScript;

function setup(content = 'hello') {
  const toast = vi.fn();
  const toastRef = { current: toast };
  const setCurrentScript = vi.fn();
  const utils = renderHook(
    (props: { content: string }) => useScriptSaving({ currentScript: script, content: props.content, setCurrentScript, toast, toastRef }),
    { initialProps: { content } },
  );
  return { ...utils, toast, setCurrentScript };
}

beforeEach(() => { vi.useFakeTimers(); saveScript.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe('useScriptSaving', () => {
  it('autosaves the current content after the debounce', async () => {
    saveScript.mockResolvedValue({ ...script, content: 'hello', syncPending: false });
    const { result } = setup();
    expect(saveScript).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(saveScript).toHaveBeenCalledWith({ id: 's1', title: 'Test Script', content: 'hello' });
    expect(result.current.saving).toBe(false);
    expect(result.current.syncPending).toBe(false);
  });

  it('marks the save as on-device only and warns once until a save lands', async () => {
    saveScript.mockResolvedValue({ ...script, syncPending: true });
    const { result, rerender, toast } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.syncPending).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('saved on this device'), 'error');

    rerender({ content: 'hello again' });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(toast).toHaveBeenCalledTimes(1);

    saveScript.mockResolvedValue({ ...script, syncPending: false });
    rerender({ content: 'third draft' });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.syncPending).toBe(false);
  });

  it('Save now stores the saved script and toasts success', async () => {
    const saved = { ...script, content: 'hello' };
    saveScript.mockResolvedValue(saved);
    const { result, setCurrentScript, toast } = setup();
    await act(async () => { await result.current.handleSave(); });
    expect(setCurrentScript).toHaveBeenCalledWith(saved);
    expect(toast).toHaveBeenCalledWith('Screenplay saved to cloud.', 'success');
    expect(result.current.saving).toBe(false);
  });

  it('Save now with nothing saved says the writer looks signed out', async () => {
    saveScript.mockResolvedValue(null);
    const { result, toast } = setup();
    await act(async () => { await result.current.handleSave(); });
    expect(toast).toHaveBeenCalledWith('Could not save — you appear to be signed out.', 'error');
  });
});
