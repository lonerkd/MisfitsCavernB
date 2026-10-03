// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

// A Realtime channel that records its handlers so the test can push changes.
const handlers: Array<(payload: unknown) => void> = [];
vi.mock('@/lib/supabase/client', () => {
  const channel = () => {
    const ch = {
      on: (_kind: string, _filter: unknown, cb: (payload: unknown) => void) => { handlers.push(cb); return ch; },
      subscribe: () => ch,
    };
    return ch;
  };
  return { supabase: { channel, removeChannel: vi.fn() } };
});

import { useLiveRows } from './live';

// Unmount what each test rendered (no Vitest globals, so Testing Library can't do it itself).
afterEach(cleanup);

type Row = { id: string; scope: string; title: string; updated_at?: string };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

const opts = (scope: string | null, load: () => Promise<Row[]>) => ({
  scope, table: 'things', filter: `scope=eq.${scope}`, load, keyOf: (r: Partial<Row>) => r.id as string,
});

describe('useLiveRows', () => {
  it('is ready and empty with no scope', () => {
    const { result } = renderHook(() => useLiveRows(opts(null, async () => [])));
    expect(result.current.status).toBe('ready');
    expect(result.current.rows).toEqual([]);
  });

  it('loads the scope, then a new scope starts empty and loading', async () => {
    const answers: Record<string, ReturnType<typeof deferred<Row[]>>> = { a: deferred(), b: deferred() };
    const { result, rerender } = renderHook(({ s }) => useLiveRows(opts(s, () => answers[s].promise)), { initialProps: { s: 'a' } });
    expect(result.current.status).toBe('loading');
    await act(async () => { answers.a.resolve([{ id: '1', scope: 'a', title: 'A1' }]); });
    expect(result.current.rows.map((r) => r.title)).toEqual(['A1']);
    rerender({ s: 'b' });
    // Never a render showing scope a's rows under scope b.
    expect(result.current.status).toBe('loading');
    expect(result.current.rows).toEqual([]);
    await act(async () => { answers.b.resolve([{ id: '2', scope: 'b', title: 'B2' }]); });
    expect(result.current).toMatchObject({ status: 'ready' });
    expect(result.current.rows.map((r) => r.title)).toEqual(['B2']);
  });

  it('ignores a load for a scope that is no longer current', async () => {
    const answers: Record<string, ReturnType<typeof deferred<Row[]>>> = { a: deferred(), b: deferred() };
    const { result, rerender } = renderHook(({ s }) => useLiveRows(opts(s, () => answers[s].promise)), { initialProps: { s: 'a' } });
    rerender({ s: 'b' });
    await act(async () => { answers.b.resolve([{ id: '2', scope: 'b', title: 'B2' }]); });
    await act(async () => { answers.a.resolve([{ id: '1', scope: 'a', title: 'A1 (late)' }]); });
    expect(result.current.rows.map((r) => r.title)).toEqual(['B2']);
  });

  it('applies local writes and Realtime changes; newer updated_at wins', async () => {
    const { result } = renderHook(() => useLiveRows(opts('a', async () => [{ id: '1', scope: 'a', title: 'v1', updated_at: '2026-01-01' }])));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.upsertLocal({ id: '2', scope: 'a', title: 'new' }));
    act(() => result.current.upsertLocal({ id: '1', scope: 'a', title: 'v2', updated_at: '2026-02-01' }));
    act(() => result.current.upsertLocal({ id: '1', scope: 'a', title: 'stale', updated_at: '2025-12-01' }));
    expect(result.current.rows.map((r) => r.title).sort()).toEqual(['new', 'v2']);
    act(() => handlers.at(-1)!({ eventType: 'DELETE', old: { id: '2' } }));
    expect(result.current.rows.map((r) => r.title)).toEqual(['v2']);
    act(() => result.current.removeLocal('1'));
    expect(result.current.rows).toEqual([]);
  });

  it('a reload that started before a local write does not erase it', async () => {
    let answer = deferred<Row[]>();
    const { result } = renderHook(() => useLiveRows(opts('a', () => answer.promise)));
    await act(async () => { answer.resolve([]); });
    answer = deferred();
    let reload!: Promise<void>;
    act(() => { reload = result.current.reload(); });
    act(() => result.current.upsertLocal({ id: '9', scope: 'a', title: 'written here' }));
    await act(async () => { answer.resolve([]); await reload; });
    expect(result.current.rows.map((r) => r.title)).toEqual(['written here']);
  });

  it('reports a failed load as an error for that scope', async () => {
    const { result } = renderHook(() => useLiveRows(opts('a', async () => { throw new Error('offline'); })));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('offline');
  });
});
