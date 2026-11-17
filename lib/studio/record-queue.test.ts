import { describe, expect, it, vi } from 'vitest';
import { enqueue, flushQueue, isNetworkFailure, pendingCount, readQueue } from './record-queue';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

describe('record queue', () => {
  it('keeps writes and removals, and the newest change to a record wins', () => {
    const s = mem();
    enqueue('p', 'permits', [{ id: 'a', v: 1 }], [], 1, s);
    enqueue('p', 'permits', [{ id: 'a', v: 2 }, { id: 'b', v: 1 }], [], 2, s);
    enqueue('p', 'permits', [], ['b'], 3, s);
    const q = readQueue(s);
    expect(q.map((c) => [c.id, c.record?.v ?? null])).toEqual([['a', 2], ['b', null]]);
    expect(pendingCount('p', 'permits', s)).toBe(2);
    expect(pendingCount('other', undefined, s)).toBe(0);
  });
  it('a storage that refuses says so, and junk in storage reads as empty', () => {
    expect(enqueue('p', 'k', [{ id: 'a' }], [], 1, { getItem: () => null, setItem: () => { throw new Error('full'); } })).toBe(false);
    expect(readQueue({ getItem: () => '{oops', setItem: () => {} })).toEqual([]);
  });
  it('tells a dropped connection from a refusal', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'), true)).toBe(true);
    expect(isNetworkFailure({ message: 'anything' }, false)).toBe(true);
    expect(isNetworkFailure({ code: '42501', message: 'row-level security' }, true)).toBe(false);
    expect(isNetworkFailure(new Error('Network request failed'), true)).toBe(true);
    expect(isNetworkFailure(new Error('invalid input'), true)).toBe(false);
  });
  it('flushes oldest first, stops at a dropped connection, drops a refusal', async () => {
    const s = mem();
    enqueue('p', 'k', [{ id: 'a' }], [], 1, s);
    enqueue('p', 'k', [{ id: 'b' }], [], 2, s);
    enqueue('p', 'k', [], ['c'], 3, s);
    enqueue('p', 'k', [{ id: 'd' }], [], 4, s);
    const upsert = vi.fn(async (_p: string, _k: string, recs: Array<Record<string, unknown>>) => {
      if (recs[0].id === 'b') throw { code: '42501', message: 'row-level security' };
      if (recs[0].id === 'd') throw new TypeError('Failed to fetch');
    });
    const remove = vi.fn(async () => {});
    const r = await flushQueue({ upsert, remove }, s, true);
    expect(r.sent).toBe(2);
    expect(r.refused.map((x) => x.change.id)).toEqual(['b']);
    expect(r.kept).toBe(1);
    expect(readQueue(s).map((c) => c.id)).toEqual(['d']);
    expect(remove).toHaveBeenCalledWith('p', 'k', ['c']);
  });
});
