// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useLoad } from './useLoad';

// Unmount what each test rendered (no Vitest globals, so Testing Library can't do it itself).
afterEach(cleanup);

/** A promise to resolve by hand. */
function deferred<T>() {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('useLoad', () => {
  it('is loading until the answer for the key arrives', async () => {
    const d = deferred<string>();
    const { result } = renderHook(() => useLoad('a', () => d.promise));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
    await act(async () => { d.resolve('A'); });
    expect(result.current).toMatchObject({ loading: false, data: 'A', error: undefined });
  });

  it('loads nothing for a null key', () => {
    let calls = 0;
    const { result } = renderHook(() => useLoad(null, async () => { calls++; return 1; }));
    expect(calls).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('drops an answer for a key that is no longer current', async () => {
    const answers: Record<string, ReturnType<typeof deferred<string>>> = { a: deferred(), b: deferred() };
    const { result, rerender } = renderHook(({ k }) => useLoad(k, () => answers[k].promise), { initialProps: { k: 'a' } });
    rerender({ k: 'b' });
    await act(async () => { answers.b.resolve('B'); });
    await act(async () => { answers.a.resolve('A (late)'); });
    expect(result.current.data).toBe('B');
    expect(result.current.loading).toBe(false);
  });

  it('keeps the last answer while a new key loads, and reports loading', async () => {
    const answers: Record<string, ReturnType<typeof deferred<string>>> = { a: deferred(), b: deferred() };
    const { result, rerender } = renderHook(({ k }) => useLoad(k, () => answers[k].promise), { initialProps: { k: 'a' } });
    await act(async () => { answers.a.resolve('A'); });
    rerender({ k: 'b' });
    expect(result.current).toMatchObject({ loading: true, data: 'A' });
    await act(async () => { answers.b.resolve('B'); });
    expect(result.current).toMatchObject({ loading: false, data: 'B' });
  });

  it('reload() loads again for the same key', async () => {
    let n = 0;
    const { result } = renderHook(() => useLoad('a', async () => ++n));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe(2));
    expect(result.current.loading).toBe(false);
  });

  it('reports an error for the current key and keeps the previous data', async () => {
    const answers = { a: deferred<string>(), b: deferred<string>() };
    const { result, rerender } = renderHook(({ k }: { k: 'a' | 'b' }) => useLoad(k, () => answers[k].promise), { initialProps: { k: 'a' as 'a' | 'b' } });
    await act(async () => { answers.a.resolve('A'); });
    rerender({ k: 'b' });
    const boom = new Error('offline');
    await act(async () => { answers.b.reject(boom); });
    expect(result.current).toMatchObject({ loading: false, data: 'A', error: boom });
  });
});
