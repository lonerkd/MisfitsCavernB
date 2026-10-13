// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { effectiveOwner, setViewAs, useViewAs } from './viewAs';

beforeEach(() => act(() => { setViewAs('p1', 'owner'); setViewAs('p2', 'owner'); }));

describe('view as', () => {
  it('is the real view until the owner chooses another', () => {
    const { result } = renderHook(() => useViewAs('p1'));
    expect(result.current).toBe('owner');
    act(() => setViewAs('p1', 'crew'));
    expect(result.current).toBe('crew');
    act(() => setViewAs('p1', 'outsider'));
    expect(result.current).toBe('outsider');
    act(() => setViewAs('p1', 'owner'));
    expect(result.current).toBe('owner');
  });

  it('is per project', () => {
    const a = renderHook(() => useViewAs('p1'));
    const b = renderHook(() => useViewAs('p2'));
    act(() => setViewAs('p1', 'crew'));
    expect(a.result.current).toBe('crew');
    expect(b.result.current).toBe('owner');
  });

  it('survives a reload of the tab (session storage), and has no mode without a project', () => {
    act(() => setViewAs('p1', 'crew'));
    expect(JSON.parse(sessionStorage.getItem('mc_view_as')!)).toEqual({ p1: 'crew' });
    expect(renderHook(() => useViewAs(null)).result.current).toBe('owner');
  });

  it('only a real owner in the owner view has owner controls', () => {
    expect(effectiveOwner(true, 'owner')).toBe(true);
    expect(effectiveOwner(true, 'crew')).toBe(false);
    expect(effectiveOwner(true, 'outsider')).toBe(false);
    expect(effectiveOwner(false, 'owner')).toBe(false);
  });
});
