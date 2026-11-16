import { describe, expect, it, vi } from 'vitest';
import { bestOffset, clockOffset, fetchServerOffset, serverTime } from './serverClock';
import { seatedIds } from './mesh';

describe('server clock', () => {
  it('takes the midpoint of the round trip', () => {
    expect(clockOffset({ sentAt: 1000, serverNow: 5100, receivedAt: 1200 })).toBe(4000);
  });

  it('uses the sample with the shortest round trip', () => {
    const slow = { sentAt: 0, serverNow: 1000, receivedAt: 2000 }; // offset 0
    const fast = { sentAt: 100, serverNow: 5110, receivedAt: 120 }; // offset 5000
    expect(bestOffset([slow, fast])).toBe(5000);
    expect(bestOffset([])).toBe(0);
  });

  it('two skewed clients agree on the order once corrected', () => {
    // Real time: A joins at 10_000, B at 10_500. A's clock is 2 minutes fast, B's accurate.
    const aLocal = 10_000 + 120_000;
    const bLocal = 10_500;
    const aStamp = serverTime(-120_000, aLocal);
    const bStamp = serverTime(0, bLocal);
    expect(seatedIds({ a: [{ joinedAt: aStamp }], b: [{ joinedAt: bStamp }] })).toEqual(['a', 'b']);
    // Uncorrected, the fast clock would have lost its seat to the later joiner.
    expect(seatedIds({ a: [{ joinedAt: aLocal }], b: [{ joinedAt: bLocal }] })).toEqual(['b', 'a']);
  });

  it('measures against the server through fetch', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ now: Date.now() + 60_000 }))) as unknown as typeof fetch;
    const offset = await fetchServerOffset(fetchFn, 2);
    expect(offset).toBeGreaterThan(59_000);
    expect(offset).toBeLessThan(61_000);
  });

  it('falls back to the local clock when the server cannot be reached', async () => {
    const down = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await fetchServerOffset(down)).toBe(0);
    const bad = vi.fn(async () => new Response('no', { status: 500 })) as unknown as typeof fetch;
    expect(await fetchServerOffset(bad, 1)).toBe(0);
  });
});
