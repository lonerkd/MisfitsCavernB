import { describe, it, expect } from 'vitest';
import { islandMode, isDeck, isEditable, isTypingKey, type IslandSignals } from './mode';
import { CONTROL_KEYS, islandRoute } from './routes';
import { ISLAND_SCALE_MAX, ISLAND_SCALE_MIN, clampIslandScale, islandReserve } from './scale';

const idle: IslandSignals = { caps: false, capsDismissed: false, typing: false, engaged: false, zone: false, live: false };

describe('islandMode', () => {
  it('rests when nothing is going on', () => {
    expect(islandMode(idle)).toBe('rest');
  });

  it('opens for the pointer or focus, whatever else is happening', () => {
    expect(islandMode({ ...idle, engaged: true })).toBe('open');
    expect(islandMode({ ...idle, engaged: true, typing: true, caps: true, live: true, zone: true })).toBe('open');
  });

  it('shrinks to a dot while typing — Caps Lock in a script is for capitals', () => {
    expect(islandMode({ ...idle, typing: true })).toBe('dot');
    expect(islandMode({ ...idle, typing: true, caps: true })).toBe('dot');
    expect(islandMode({ ...idle, typing: true, zone: true, live: true })).toBe('dot');
  });

  it('holds the deck open under Caps Lock until it is put away', () => {
    expect(islandMode({ ...idle, caps: true })).toBe('caps');
    expect(islandMode({ ...idle, caps: true, zone: true, live: true })).toBe('caps');
    expect(islandMode({ ...idle, caps: true, capsDismissed: true })).toBe('rest');
  });

  it('shows a live event before a hovered zone', () => {
    expect(islandMode({ ...idle, live: true, zone: true })).toBe('live');
    expect(islandMode({ ...idle, zone: true })).toBe('context');
  });

  it('counts open and caps as the full deck', () => {
    expect((['dot', 'rest', 'live', 'context', 'open', 'caps'] as const).filter(isDeck)).toEqual(['open', 'caps']);
  });
});

describe('typing', () => {
  const field = { tagName: 'TEXTAREA' };
  const key = (o: Partial<Parameters<typeof isTypingKey>[0]>) => ({ key: 'a', ctrlKey: false, metaKey: false, altKey: false, target: field, ...o });

  it('is text going into a field', () => {
    expect(isTypingKey(key({}))).toBe(true);
    expect(isTypingKey(key({ key: 'Backspace' }))).toBe(true);
    expect(isTypingKey(key({ target: { tagName: 'DIV', isContentEditable: true } }))).toBe(true);
    expect(isTypingKey(key({ target: { tagName: 'INPUT', type: 'search' } }))).toBe(true);
  });

  it('is not a shortcut, a navigation key, or a key pressed on the page', () => {
    expect(isTypingKey(key({ ctrlKey: true, key: 'k' }))).toBe(false);
    expect(isTypingKey(key({ key: 'ArrowDown' }))).toBe(false);
    expect(isTypingKey(key({ key: 'CapsLock' }))).toBe(false);
    expect(isTypingKey(key({ target: { tagName: 'BODY' } }))).toBe(false);
    expect(isTypingKey(key({ target: { tagName: 'INPUT', type: 'checkbox' } }))).toBe(false);
    expect(isEditable(null)).toBe(false);
  });
});

describe('islandRoute', () => {
  it('names every part of the suite', () => {
    for (const path of ['/', '/today', '/projects', '/projects/abc', '/projects/abc/pitch', '/editor', '/studio', '/soundtrack', '/lounge', '/call/abc',
      '/portfolio', '/portfolio/manage', '/showcase', '/jobs', '/jobs/abc', '/crew', '/crew/abc', '/profile', '/settings', '/welcome', '/admin', '/admin/errors']) {
      const r = islandRoute(path, true);
      expect(r.title, path).not.toBe('');
      expect(r.links.length, path).toBeGreaterThan(0);
      expect(r.links.every((l) => l.href.startsWith('/') && l.href !== path), path).toBe(true);
      expect(new Set(r.links.map((l) => l.id)).size, path).toBe(r.links.length);
    }
  });

  it('offers a project’s tools only when a project is open', () => {
    expect(islandRoute('/today', false).links.map((l) => l.href)).toEqual(['/projects']);
    expect(islandRoute('/today', true).links.map((l) => l.href)).toEqual(['/projects', '/editor', '/studio', '/lounge']);
  });

  it('never offers more controls than the Caps layer has keys', () => {
    for (const path of ['/', '/today', '/projects/abc', '/admin']) expect(islandRoute(path, true).links.length).toBeLessThanOrEqual(CONTROL_KEYS.length);
  });

  it('falls back to the route’s own name', () => {
    expect(islandRoute('/some-new-page').title).toBe('some new page');
  });
});

describe('island size', () => {
  it('is 1 unless a usable size was saved', () => {
    for (const junk of [null, undefined, '', 'big', NaN]) expect(clampIslandScale(junk)).toBe(1);
    expect(clampIslandScale('1.15')).toBe(1.15);
    expect(clampIslandScale(0.9)).toBe(0.9);
  });

  it('stays within the slider’s range', () => {
    expect(clampIslandScale(0.1)).toBe(ISLAND_SCALE_MIN);
    expect(clampIslandScale('9')).toBe(ISLAND_SCALE_MAX);
  });

  it('asks pages for room in step with its size', () => {
    expect(islandReserve(1)).toBe(64);
    expect(islandReserve(ISLAND_SCALE_MIN)).toBeLessThan(64);
    expect(islandReserve(ISLAND_SCALE_MAX)).toBe(77);
    expect(islandReserve(50)).toBe(islandReserve(ISLAND_SCALE_MAX));
  });
});
