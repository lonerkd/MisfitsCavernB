import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('resolves with the value and clears its timer', async () => {
    await expect(withTimeout(Promise.resolve(7), 1000)).resolves.toBe(7);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('passes a rejection through and clears its timer', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects with the message when the promise hangs', async () => {
    const p = withTimeout(new Promise<never>(() => {}), 1000, 'Too slow.');
    const check = expect(p).rejects.toThrow('Too slow.');
    await vi.advanceTimersByTimeAsync(1000);
    await check;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not reject before the time is up', async () => {
    let settled = false;
    void withTimeout(new Promise<never>(() => {}), 1000).catch(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
  });
});
