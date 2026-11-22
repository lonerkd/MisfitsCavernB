import { describe, it, expect } from 'vitest';
import { planBack } from './back';

const O = 'https://cavern.test';
const at = (...paths: string[]) => paths.map((p) => `${O}${p}`);

describe('planBack', () => {
  it('returns to the previous page', () => {
    expect(planBack({ currentPath: '/lounge/1', entries: at('/studio/1', '/lounge/1'), index: 1, origin: O, previousPath: null }))
      .toEqual({ kind: 'history', steps: 1, path: '/studio/1' });
  });
  it('steps over query-only changes of the current page', () => {
    expect(planBack({ currentPath: '/studio/1', entries: at('/projects', '/studio/1', '/studio/1?tab=a', '/studio/1?tab=b'), index: 3, origin: O, previousPath: null }))
      .toEqual({ kind: 'history', steps: 3, path: '/projects' });
  });
  it('counts a query-only entry of the previous page as that page', () => {
    expect(planBack({ currentPath: '/lounge/1', entries: at('/studio/1', '/studio/1?tab=b', '/lounge/1'), index: 2, origin: O, previousPath: null }))
      .toEqual({ kind: 'history', steps: 1, path: '/studio/1' });
  });
  it('falls back to the parent on a fresh load', () => {
    expect(planBack({ currentPath: '/studio/1', entries: at('/studio/1'), index: 0, origin: O, previousPath: null })).toEqual({ kind: 'parent' });
  });
  it('falls back to the parent when the earlier entry is another site or the sign-in page', () => {
    expect(planBack({ currentPath: '/studio/1', entries: ['https://elsewhere.test/x', `${O}/studio/1`], index: 1, origin: O, previousPath: null })).toEqual({ kind: 'parent' });
    expect(planBack({ currentPath: '/projects', entries: at('/auth', '/projects'), index: 1, origin: O, previousPath: null })).toEqual({ kind: 'parent' });
  });
  it('uses the last pathname seen where the browser has no history entries', () => {
    expect(planBack({ currentPath: '/lounge/1', entries: null, index: -1, origin: O, previousPath: '/studio/1' })).toEqual({ kind: 'history', steps: 1, path: '/studio/1' });
    expect(planBack({ currentPath: '/lounge/1', entries: null, index: -1, origin: O, previousPath: null })).toEqual({ kind: 'parent' });
  });
});
