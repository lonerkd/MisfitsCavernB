import { describe, it, expect } from 'vitest';
import { DEFAULT_LAYOUT, SPLIT_KEY, companionOf, isSplitMessage, layoutFromSearch, layoutToSearch, safePanePath, SURFACES, surfaceOf } from './core';

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

const ok = { [SPLIT_KEY]: true };
const base = 'http://split.invalid';

describe('isSplitMessage — edge cases', () => {
  it('rejects anything that is not a plain object, with a boolean answer', () => {
    for (const v of [undefined, null, 0, 1, '', 'scene', true, false, NaN, [], [ok], () => ok, Symbol('x')]) {
      expect(isSplitMessage(v)).toBe(false);
    }
    expect(isSplitMessage(Object.create(null))).toBe(false);
  });
  it('needs a truthy mcSplit marker', () => {
    for (const marker of [undefined, null, false, 0, '']) {
      expect(isSplitMessage({ [SPLIT_KEY]: marker, type: 'scene', scriptId: 's', sceneId: null })).toBe(false);
    }
  });
  it('rejects a missing type, a non-string type and unknown types', () => {
    expect(isSplitMessage({ ...ok })).toBe(false);
    for (const type of [null, 1, {}, [], ['scene'], 'Scene', ' scene', 'toString', '__proto__', '']) {
      expect(isSplitMessage({ ...ok, type, scriptId: 's', sceneId: 'x', href: '/a', title: '' })).toBe(false);
    }
  });
  it('navigated: needs a non-empty string href below 2000 chars and a string title', () => {
    const nav = (href: unknown, title: unknown) => isSplitMessage({ ...ok, type: 'navigated', href, title });
    expect(nav('/editor', 'Script')).toBe(true);
    expect(nav('a'.repeat(1999), '')).toBe(true);
    expect(nav('a'.repeat(2000), '')).toBe(false);
    for (const href of ['', undefined, null, 5, {}, ['/a']]) expect(nav(href, '')).toBe(false);
    for (const title of [undefined, null, 5, {}]) expect(nav('/editor', title)).toBe(false);
  });
  it('scene: sceneId is a non-empty string or null, never undefined', () => {
    const scene = (scriptId: unknown, sceneId?: unknown) => isSplitMessage({ ...ok, type: 'scene', scriptId, ...(sceneId === undefined ? {} : { sceneId }) });
    expect(scene('s', null)).toBe(true);
    expect(scene('s', 'x')).toBe(true);
    expect(scene('s')).toBe(false);
    expect(scene('s', '')).toBe(false);
    expect(scene('s', 3)).toBe(false);
    expect(scene('', null)).toBe(false);
    expect(scene(7, null)).toBe(false);
  });
  it('open-scene: noteId is optional but, if present, a non-empty string', () => {
    const open = (extra: Record<string, unknown>) => isSplitMessage({ ...ok, type: 'open-scene', scriptId: 's', sceneId: 'x', ...extra });
    expect(open({})).toBe(true);
    expect(open({ noteId: 'n' })).toBe(true);
    expect(open({ extra: 'ignored' })).toBe(true);
    for (const noteId of ['', null, 0, {}, 'n'.repeat(2000)]) expect(open({ noteId })).toBe(false);
    expect(open({ sceneId: null })).toBe(false);
    expect(open({ scriptId: undefined })).toBe(false);
  });
});

describe('surfaceOf — edge cases', () => {
  it('returns null (not a throw) for empty, relative, wrong-case and near-miss paths', () => {
    for (const href of ['', '?', '?tab=scenes', 'editor', '/editorial', '/Editor', '/studio', '/studio?tab', '/studio?tab=nope', '/studio?tab=production&view=nope', '/']) {
      expect(surfaceOf(href), href).toBeNull();
    }
  });
  it('matches sub-paths and ignores extra or malformed query params', () => {
    expect(surfaceOf('/editor/')?.id).toBe('script');
    expect(surfaceOf('/editor/anything/deep')?.id).toBe('script');
    expect(surfaceOf('/studio?tab=scenes&x=1')?.id).toBe('scenes');
    expect(surfaceOf('/studio?tab=%zz')).toBeNull();
    expect(surfaceOf('/editor?a?b')?.id).toBe('script');
  });
  it('prefers the most specific surface; a bare production tab is the Story board', () => {
    expect(surfaceOf('/studio?tab=production&view=onset')?.id).toBe('onset');
    expect(surfaceOf('/studio?tab=production&view=story')?.id).toBe('story');
    expect(surfaceOf('/studio?tab=production&view=')?.id).toBe('story');
  });
  it('returns a listed surface or null', () => {
    for (const href of ['/jobs', '/jobs/9', '/lounge', '/soundtrack?x', '/projects', '/nope']) {
      const s = surfaceOf(href);
      expect(s === null || SURFACES.includes(s)).toBe(true);
    }
  });
});

describe('safePanePath — resolved-path hostility', () => {
  const hostile = [
    '/a/../split', '/./split', '/../split', '/%2e%2e/split', '/%252e%252e/split', '/a/..\\split', '/editor/../split?x=1',
    '/split/', '/split#h', '/\\evil.test', '//evil.test/x', 'https://evil.test', 'javascript:alert(1)', 'data:text/html,x', 'vbscript:x',
    ' //evil.test', '/\u0000', '/a\nb', '%E0%A4%A',
  ];
  it('falls back for every one', () => {
    for (const bad of hostile) expect(safePanePath(bad, '/x'), JSON.stringify(bad)).toBe('/x');
  });
  it('lets traversal that stays on this site through (the browser keeps it on this origin)', () => {
    expect(safePanePath('/editor/../studio', '/x')).toBe('/editor/../studio');
    expect(safePanePath('/splitting-hairs/../jobs', '/x')).toBe('/splitting-hairs/../jobs');
  });
  it('whatever it returns is same-origin and not the split itself', () => {
    for (const raw of [...hostile, '/editor', '/a/b/../c', '/%2e/editor', '/x?y=/split', '/x#/split']) {
      const u = new URL(safePanePath(raw, '/fallback'), base);
      expect(u.origin).toBe(base);
      expect(u.pathname.startsWith('/split'), raw).toBe(false);
    }
  });
});

describe('layoutFromSearch — edge cases', () => {
  const custom = { a: '/lounge', b: '/jobs', orientation: 'column' as const, ratio: 0.3, linked: false };
  const enc = encodeURIComponent;

  it('returns the fallback for empty or paramless input, and never mutates it', () => {
    const copy = { ...custom };
    for (const s of ['', '?', '?unknown=1', '#a=/x', '&&&', '?=']) expect(layoutFromSearch(s, custom), s).toEqual(custom);
    expect(custom).toEqual(copy);
  });
  it('accepts a search string with or without the leading ?', () => {
    expect(layoutFromSearch('a=/jobs&b=/lounge').a).toBe('/jobs');
    expect(layoutFromSearch('?a=/jobs&b=/lounge').b).toBe('/lounge');
  });
  it('uses the first of a repeated param', () => {
    expect(layoutFromSearch('?a=/jobs&a=/lounge').a).toBe('/jobs');
  });
  it('orientation: only exact "row" / "column"; anything else keeps the fallback', () => {
    expect(layoutFromSearch('?o=row', custom).orientation).toBe('row');
    expect(layoutFromSearch('?o=column').orientation).toBe('column');
    for (const o of ['', 'COLUMN', 'Row', 'diagonal', 'column ', '1', 'null']) {
      expect(layoutFromSearch(`?o=${enc(o)}`, custom).orientation, o).toBe('column');
      expect(layoutFromSearch(`?o=${enc(o)}`).orientation, o).toBe(DEFAULT_LAYOUT.orientation);
    }
  });
  it('ratio: always a finite number in 0.2–0.8', () => {
    const cases: Array<[string, number]> = [['0.5', 0.5], ['0.35', 0.35], ['5', 0.8], ['-1', 0.2], ['0', 0.2], ['1e9', 0.8], ['-Infinity', 0.5], ['Infinity', 0.5], ['NaN', 0.5], ['abc', 0.5], ['0.5abc', 0.5], ['0x', 0.5]];
    for (const [r, want] of cases) expect(layoutFromSearch(`?r=${enc(r)}`, custom).ratio, r).toBe(want);
    for (const r of ['', ' ', '1,5', '--1']) {
      const got = layoutFromSearch(`?r=${enc(r)}`, custom).ratio;
      expect(Number.isFinite(got) && got >= 0.2 && got <= 0.8, JSON.stringify(r)).toBe(true);
    }
    expect(layoutFromSearch('', custom).ratio).toBe(0.3);
  });
  it('link: only "0" turns it off; absent keeps the fallback', () => {
    expect(layoutFromSearch('?link=0', { ...custom, linked: true }).linked).toBe(false);
    expect(layoutFromSearch('?link=1', custom).linked).toBe(true);
    expect(layoutFromSearch('?link=', custom).linked).toBe(true);
    expect(layoutFromSearch('?link=false', custom).linked).toBe(true);
    expect(layoutFromSearch('', custom).linked).toBe(false);
  });
  it('a malformed escape in one pane falls back for that pane only', () => {
    expect(layoutFromSearch('?a=%E0%A4%A&b=/lounge', custom)).toEqual({ ...custom, a: '/lounge', b: '/lounge' });
    expect(layoutFromSearch('?a=/jobs&b=%E0%A4%A', custom)).toEqual({ ...custom, a: '/jobs', b: '/jobs' });
  });
  it('every hostile pane value falls back on either pane, including traversal into /split', () => {
    const bad = ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', 'data:text/html,x', '/split', '/split?a=/editor', '/a/../split', '/../split', '/%2e%2e/split', '/%252e%252e/split', '/a/..\\split', '/\u0000', ''];
    for (const v of bad) {
      const got = layoutFromSearch(`?a=${enc(v)}&b=${enc(v)}`, custom);
      expect(got.a, JSON.stringify(v)).toBe('/lounge');
      expect(got.b, JSON.stringify(v)).toBe('/jobs');
    }
  });
  it('a nested split in a pane cannot smuggle itself in', () => {
    expect(layoutFromSearch(`?a=/editor&b=${enc('/split?a=/editor&b=/split')}`, custom)).toMatchObject({ a: '/editor', b: '/jobs' });
  });
  it('round-trips valid paths that carry their own query', () => {
    const l = { a: '/studio?tab=production&view=onset&x=1', b: '/jobs?q=1', orientation: 'row' as const, ratio: 0.8, linked: true };
    expect(layoutFromSearch(layoutToSearch(l), custom)).toEqual(l);
  });
});
