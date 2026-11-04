import { describe, it, expect } from 'vitest';
import { shortcuts, matchesShortcut, looksLikeKeys } from './shortcuts';
import { CHORDS } from './chords';

const find = (q: string, mac = false) => shortcuts(mac).filter((s) => matchesShortcut(q, s));

describe('shortcuts', () => {
  it('lists every chord in the table, so nothing bound goes unlisted', () => {
    const keys = shortcuts(false).map((s) => s.desc);
    for (const c of CHORDS) expect(keys).toContain(c.label);
  });

  it('finds a shortcut by its key, on either kind of machine', () => {
    expect(find('ctrl z').map((s) => s.desc.slice(0, 4))).toContain('Undo');
    expect(find('cmd z', true).map((s) => s.desc.slice(0, 4))).toContain('Undo');
    expect(find('⌘z', true).map((s) => s.desc.slice(0, 4))).toContain('Undo');
    expect(find('cmd k').some((s) => s.desc.startsWith('Search everything'))).toBe(true);
  });

  it('finds one by its name, from the start of a word', () => {
    expect(find('und').some((s) => s.desc.startsWith('Undo'))).toBe(true);
    expect(find('split').length).toBeGreaterThan(0);
  });

  it('a single character only matches a whole word: z is not Zoom', () => {
    expect(find('z').every((s) => /\bz\b/i.test(`${s.keys} ${s.aliases ?? ''}`) || /\bz\b/i.test(s.desc))).toBe(true);
  });

  it('finds the Caps Lock keys, including the fixed slot of an action', () => {
    expect(find('caps q').some((s) => s.keys === 'Caps Lock Q' && /Create/.test(s.desc))).toBe(true);
    expect(find('create').some((s) => s.keys === 'Caps Lock Q')).toBe(true);
  });

  it('an empty query matches everything and nonsense matches nothing', () => {
    expect(find('').length).toBe(shortcuts(false).length);
    expect(find('qwertyuiop')).toEqual([]);
  });

  it('a query of only symbols matches nothing, but an empty one matches everything', () => {
    expect(find('+')).toEqual([]);
    expect(find('…')).toEqual([]);
    expect(find('   ').length).toBe(shortcuts(false).length);
  });

  it('lists the keys that are bound but were missing: the plot board and the projects page', () => {
    expect(find('reorder').some((s) => s.group === 'Plot board' && /Alt/.test(s.keys))).toBe(true);
    expect(find('phase').some((s) => s.group === 'Projects')).toBe(true);
    // The island's app keys are not given as a fixed range.
    expect(shortcuts(false).some((s) => s.keys.startsWith('1 –'))).toBe(false);
  });

  it('knows a query written like a key press', () => {
    for (const q of ['ctrl z', 'cmd k', '⌘k', 'caps q', 'alt 1']) expect(looksLikeKeys(q)).toBe(true);
    for (const q of ['undo', 'projects', 'create']) expect(looksLikeKeys(q)).toBe(false);
  });
});
