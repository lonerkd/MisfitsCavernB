import { describe, expect, it } from 'vitest';
import { applyIslandPrefs, DEFAULT_ISLAND_PREFS, toIslandPrefs } from './prefs';
import { islandMode, type IslandSignals } from './mode';

const busy: IslandSignals = { caps: true, capsDismissed: false, typing: false, engaged: false, zone: true, live: true, activity: true };

describe('island state switches', () => {
  it('everything is on by default and junk stays on', () => {
    expect(toIslandPrefs(null)).toEqual(DEFAULT_ISLAND_PREFS);
    expect(toIslandPrefs({ live: 'no', caps: 0 })).toEqual(DEFAULT_ISLAND_PREFS);
    expect(toIslandPrefs({ live: false }).live).toBe(false);
  });
  it('a state that is off never becomes the island’s shape', () => {
    expect(islandMode(busy)).toBe('caps');
    expect(islandMode(applyIslandPrefs(busy, { ...DEFAULT_ISLAND_PREFS, caps: false }))).toBe('live');
    expect(islandMode(applyIslandPrefs(busy, { ...DEFAULT_ISLAND_PREFS, caps: false, live: false }))).toBe('context');
    expect(islandMode(applyIslandPrefs(busy, { live: false, caps: false, context: false, activity: true, typing: true }))).toBe('activity');
    expect(islandMode(applyIslandPrefs(busy, { live: false, caps: false, context: false, activity: false, typing: true }))).toBe('rest');
  });
  it('typing off keeps the island out of its dot', () => {
    const typing = { ...busy, typing: true, caps: false, live: false, zone: false, activity: false };
    expect(islandMode(typing)).toBe('dot');
    expect(islandMode(applyIslandPrefs(typing, { ...DEFAULT_ISLAND_PREFS, typing: false }))).toBe('rest');
  });
  it('never touches the person’s own opening of the island', () => {
    expect(islandMode(applyIslandPrefs({ ...busy, engaged: true }, { live: false, caps: false, context: false, activity: false, typing: false }))).toBe('open');
  });
});
