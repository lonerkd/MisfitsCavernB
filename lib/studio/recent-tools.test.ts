import { describe, expect, it, vi } from 'vitest';
import { RECENT_KEY, RECENT_MAX, pushRecent, readRecent, recentServerSnapshot, recentSnapshot, recordRecent, subscribeRecent, writeRecent } from './recent-tools';

const mem = (init?: string) => {
  let v = init ?? null;
  return { getItem: () => v, setItem: (_k: string, x: string) => { v = x; } };
};

describe('recent production tools', () => {
  it('puts the newest first and does not repeat', () => {
    expect(pushRecent(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
    expect(pushRecent([], 'x')).toEqual(['x']);
  });
  it('keeps only the last six', () => {
    let l: string[] = [];
    for (const id of 'abcdefgh') l = pushRecent(l, id);
    expect(l).toHaveLength(RECENT_MAX);
    expect(l[0]).toBe('h');
    expect(l).not.toContain('a');
  });
  it('reads back what was written, dropping ids that are no longer tools', () => {
    const m = mem();
    writeRecent(['a', 'gone', 'b'], m);
    expect(readRecent(['a', 'b'], m)).toEqual(['a', 'b']);
  });
  it('survives garbage and a storage that throws', () => {
    expect(readRecent(['a'], mem('not json'))).toEqual([]);
    expect(readRecent(['a'], mem('{"a":1}'))).toEqual([]);
    const boom = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    expect(readRecent(['a'], boom)).toEqual([]);
    expect(() => writeRecent(['a'], boom)).not.toThrow();
  });
  it('records an opened tool, notifies subscribers and keeps a stable snapshot', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } } });
    const valid = ['a', 'b', 'c'];
    const heard = vi.fn();
    const off = subscribeRecent(heard);
    expect(recentServerSnapshot()).toEqual([]);
    recordRecent('a', valid);
    recordRecent('b', valid);
    recordRecent('b', valid); // same tool again: no change, no notice
    expect(heard).toHaveBeenCalledTimes(2);
    const snap = recentSnapshot(valid);
    expect(snap).toEqual(['b', 'a']);
    expect(recentSnapshot(valid)).toBe(snap);
    expect(JSON.parse(data.get(RECENT_KEY)!)).toEqual(['b', 'a']);
    off();
    vi.unstubAllGlobals();
  });
  it('uses a stable key', () => {
    expect(RECENT_KEY).toMatch(/recent/i);
  });
});
