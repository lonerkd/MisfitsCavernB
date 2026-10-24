import { describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));

import { fetchPlatformStats, getPlatformStats, withRetry } from './stats';

const row = { creators: '3', projects: 2, scripts: 5, jobs: 1, media: 7 };

describe('fetchPlatformStats', () => {
  it('maps the counts row', async () => {
    useFake({}, { get_platform_stats: { data: [row] } });
    expect(await fetchPlatformStats()).toEqual({ users: 3, projects: 2, scripts: 5, jobs: 1, media: 7 });
  });

  it('throws on an RPC error and on an empty answer', async () => {
    useFake({}, { get_platform_stats: { error: { message: 'down' } } });
    await expect(fetchPlatformStats()).rejects.toThrow('down');
    useFake({}, { get_platform_stats: { data: [] } });
    await expect(fetchPlatformStats()).rejects.toThrow('no row');
  });
});

describe('getPlatformStats', () => {
  it('falls back to zeros instead of rejecting', async () => {
    useFake({}, { get_platform_stats: { error: { message: 'down' } } });
    expect(await getPlatformStats()).toEqual({ users: 0, projects: 0, scripts: 0, jobs: 0, media: 0 });
  });
});

describe('withRetry', () => {
  it('returns the first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    expect(await withRetry(fn, 2, 0)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('recovers from transient failures within the retry budget', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('a')).mockRejectedValueOnce(new Error('b')).mockResolvedValue('ok');
    expect(await withRetry(fn, 2, 0)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('rejects with the last error after 1 + 2 attempts', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('a')).mockRejectedValueOnce(new Error('b')).mockRejectedValueOnce(new Error('c'));
    await expect(withRetry(fn, 2, 0)).rejects.toThrow('c');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
