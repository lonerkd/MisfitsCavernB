import { afterEach, describe, expect, it } from 'vitest';
import { cached, clearCache } from './ttlCache';

afterEach(() => clearCache());

describe('cached', () => {
  it('reuses a success inside the ttl and loads again after it', async () => {
    let t = 0, calls = 0;
    const load = async () => ++calls;
    expect(await cached('k', 100, load, () => t)).toBe(1);
    t = 99;
    expect(await cached('k', 100, load, () => t)).toBe(1);
    t = 100;
    expect(await cached('k', 100, load, () => t)).toBe(2);
  });

  it('keeps keys apart', async () => {
    expect(await cached('a', 100, async () => 'A')).toBe('A');
    expect(await cached('b', 100, async () => 'B')).toBe('B');
  });

  it('shares one request between concurrent callers', async () => {
    let calls = 0;
    const load = async () => { calls++; return 'x'; };
    const [a, b] = await Promise.all([cached('k', 100, load), cached('k', 100, load)]);
    expect([a, b, calls]).toEqual(['x', 'x', 1]);
  });

  it('does not keep a failure: it rejects every sharer, then the next call retries', async () => {
    let calls = 0;
    const failing = async () => { calls++; throw new Error('rpc down'); };
    const first = cached('k', 100, failing);
    const second = cached('k', 100, failing);
    await expect(first).rejects.toThrow('rpc down');
    await expect(second).rejects.toThrow('rpc down');
    expect(calls).toBe(1);

    expect(await cached('k', 100, async () => 'ok')).toBe('ok');
    expect(await cached('k', 100, async () => 'again')).toBe('ok');
  });

  it('does not let a failure evict a good answer for another key', async () => {
    await cached('good', 100, async () => 'g');
    await expect(cached('bad', 100, async () => { throw new Error('no'); })).rejects.toThrow('no');
    expect(await cached('good', 100, async () => 'new')).toBe('g');
  });

  it('clearCache forgets one key or all', async () => {
    await cached('a', 100, async () => 1);
    await cached('b', 100, async () => 2);
    clearCache('a');
    expect(await cached('a', 100, async () => 3)).toBe(3);
    expect(await cached('b', 100, async () => 4)).toBe(2);
    clearCache();
    expect(await cached('b', 100, async () => 5)).toBe(5);
  });
});
