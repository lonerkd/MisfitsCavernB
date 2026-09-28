import { describe, it, expect } from 'vitest';
import { DEFAULT_LAYOUT, SPLIT_KEY, companionOf, isSplitMessage, layoutFromSearch, layoutToSearch, safePanePath, surfaceOf } from './core';

describe('safePanePath', () => {
  it('keeps this site’s pages', () => {
    expect(safePanePath('/editor', '/x')).toBe('/editor');
    expect(safePanePath('%2Fstudio%3Ftab%3Dscenes', '/x')).toBe('/studio?tab=scenes');
  });
  it('refuses other sites, protocol tricks, frames within frames and junk', () => {
    for (const bad of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/split', '/split?a=/editor', 'editor', '%E0%A4%A', '/edit\u0000or', '']) {
      expect(safePanePath(bad, '/x')).toBe('/x');
    }
    expect(safePanePath(null, '/x')).toBe('/x');
    expect(safePanePath('/splitting-hairs', '/x')).toBe('/splitting-hairs');
  });
});

describe('layout in the URL', () => {
  it('round-trips', () => {
    const l = { a: '/studio?tab=production&view=readiness', b: '/editor', orientation: 'column' as const, ratio: 0.35, linked: false };
    expect(layoutFromSearch(layoutToSearch(l))).toEqual(l);
  });
  it('falls back field by field and clamps the ratio', () => {
    expect(layoutFromSearch('?a=https://evil.test&r=5')).toEqual({ ...DEFAULT_LAYOUT, ratio: 0.8 });
    expect(layoutFromSearch('')).toEqual(DEFAULT_LAYOUT);
    expect(layoutFromSearch('?r=abc').ratio).toBe(0.5);
  });
});

describe('messages', () => {
  it('accepts only well-formed split messages', () => {
    expect(isSplitMessage({ [SPLIT_KEY]: true, type: 'scene', scriptId: 's', sceneId: null })).toBe(true);
    expect(isSplitMessage({ [SPLIT_KEY]: true, type: 'open-scene', scriptId: 's', sceneId: 'x' })).toBe(true);
    expect(isSplitMessage({ [SPLIT_KEY]: true, type: 'navigated', href: '/editor', title: '' })).toBe(true);
    expect(isSplitMessage({ type: 'scene', scriptId: 's', sceneId: null })).toBe(false);
    expect(isSplitMessage({ [SPLIT_KEY]: true, type: 'open-scene', scriptId: 's' })).toBe(false);
    expect(isSplitMessage({ [SPLIT_KEY]: true, type: 'open-scene', scriptId: 's', sceneId: 'x', noteId: 'n' })).toBe(true);
    expect(isSplitMessage({ [SPLIT_KEY]: true, type: 'open-scene', scriptId: 's', sceneId: 'x', noteId: 5 })).toBe(false);
    expect(isSplitMessage({ [SPLIT_KEY]: true, type: 'eval', code: '1' })).toBe(false);
    expect(isSplitMessage('scene')).toBe(false);
  });
});

describe('surfaces', () => {
  it('names the surface a page is on', () => {
    expect(surfaceOf('/editor?script=1')?.id).toBe('script');
    expect(surfaceOf('/studio?tab=production&view=readiness')?.id).toBe('readiness');
    expect(surfaceOf('/studio?tab=production')?.id).toBe('story');
    expect(surfaceOf('/studio?tab=scenes')?.id).toBe('scenes');
    expect(surfaceOf('/projects/abc')?.id).toBe('projects');
    expect(surfaceOf('/settings')).toBeNull();
  });
  it('opens the natural companion beside a page', () => {
    expect(companionOf('/editor')).toBe('/studio?tab=scenes');
    expect(companionOf('/studio?tab=library')).toBe('/editor');
    expect(companionOf('/settings')).toBe('/editor');
  });
});
