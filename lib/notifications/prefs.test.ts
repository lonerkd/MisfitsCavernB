import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFICATION_PREFS, readPrefs, typeEnabled } from './prefs';

describe('readPrefs', () => {
  it('merges a stored object over the defaults', () => {
    expect(readPrefs({ replies: false, product: true })).toEqual({ replies: false, jobs: true, product: true, leak_check: true });
  });

  it('returns the defaults for null, undefined and non-objects', () => {
    for (const v of [null, undefined, 'x', 5, true]) expect(readPrefs(v)).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('returns a copy, never the shared defaults', () => {
    expect(readPrefs(null)).not.toBe(DEFAULT_NOTIFICATION_PREFS);
  });

  it('ignores non-boolean values and keeps the default', () => {
    const bad = readPrefs({ replies: 'false', jobs: 0, product: 'yes', leak_check: null });
    expect(bad).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('drops unknown keys and ignores arrays', () => {
    expect(readPrefs({ extra: true })).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(readPrefs([false, false])).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });
});

describe('typeEnabled', () => {
  it('defaults unknown types to enabled', () => {
    expect(typeEnabled('something-new')).toBe(true);
    expect(typeEnabled('something-new', { ...DEFAULT_NOTIFICATION_PREFS, replies: false })).toBe(true);
  });

  it('maps aliases to their preference', () => {
    const off = { replies: false, jobs: false, product: false, leak_check: true };
    for (const t of ['reply', 'comment', 'job', 'application', 'product']) expect(typeEnabled(t, off)).toBe(false);
    const on = { replies: true, jobs: true, product: true, leak_check: true };
    for (const t of ['reply', 'comment', 'job', 'application', 'product']) expect(typeEnabled(t, on)).toBe(true);
  });

  it('uses the defaults when no prefs are given (product is off)', () => {
    expect(typeEnabled('reply')).toBe(true);
    expect(typeEnabled('product')).toBe(false);
  });

  it('a malformed stored value cannot switch a type on or off', () => {
    // Malformed product value must not enable product (default off).
    expect(typeEnabled('product', readPrefs({ product: 'true' }))).toBe(false);
    expect(typeEnabled('product', readPrefs({ product: 1 }))).toBe(false);
    // Malformed replies value keeps the default (on), not a silent off.
    expect(typeEnabled('reply', readPrefs({ replies: 'false' }))).toBe(true);
  });
});
