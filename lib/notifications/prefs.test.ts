import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFICATION_PREFS, readPrefs, typeEnabled } from './prefs';
import { holdPush, inQuietHours } from './quiet';

describe('readPrefs', () => {
  it('merges a stored object over the defaults', () => {
    expect(readPrefs({ replies: false, product: true })).toEqual({ ...DEFAULT_NOTIFICATION_PREFS, replies: false, jobs: true, product: true, leak_check: true });
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
    const off = { ...DEFAULT_NOTIFICATION_PREFS, replies: false, jobs: false, product: false };
    for (const t of ['reply', 'comment', 'job', 'application', 'product']) expect(typeEnabled(t, off)).toBe(false);
    const on = { ...DEFAULT_NOTIFICATION_PREFS, replies: true, jobs: true, product: true };
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

describe('quiet hours', () => {
  const q = { on: true, start: '22:00', end: '07:00', tz: 'America/Toronto' };
  // 2026-11-22 is standard time in Toronto (UTC-5): 03:30Z is 22:30 there, 12:30Z is 07:30, 17:00Z is noon.
  const at = (iso: string) => new Date(iso);
  it('holds inside a window that crosses midnight, in the person’s own zone', () => {
    expect(inQuietHours(q, at('2026-11-22T03:30:00Z'))).toBe(true);   // 22:30 local
    expect(inQuietHours(q, at('2026-11-22T11:30:00Z'))).toBe(true);   // 06:30 local
    expect(inQuietHours(q, at('2026-11-22T12:30:00Z'))).toBe(false);  // 07:30 local
    expect(inQuietHours(q, at('2026-11-22T17:00:00Z'))).toBe(false);  // noon local
  });
  it('a same-day window works too, and the end is not inside it', () => {
    const lunch = { on: true, start: '12:00', end: '13:00', tz: 'UTC' };
    expect(inQuietHours(lunch, at('2026-11-22T12:00:00Z'))).toBe(true);
    expect(inQuietHours(lunch, at('2026-11-22T13:00:00Z'))).toBe(false);
  });
  it('is never on when off, or when the window or the zone is not valid', () => {
    const now = at('2026-11-22T03:30:00Z');
    expect(inQuietHours({ ...q, on: false }, now)).toBe(false);
    expect(inQuietHours({ ...q, start: '22:00', end: '22:00' }, now)).toBe(false);
    expect(inQuietHours({ ...q, start: '25:00' }, now)).toBe(false);
    expect(inQuietHours({ ...q, tz: 'Not/AZone' }, now)).toBe(false);
  });
  it('holds a normal push but never a call sheet', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, quiet: q };
    const night = at('2026-11-22T03:30:00Z');
    expect(holdPush('reply', prefs, night)).toBe(true);
    expect(holdPush('budget', prefs, night)).toBe(true);
    expect(holdPush('call_sheet', prefs, night)).toBe(false);
    expect(holdPush('reply', DEFAULT_NOTIFICATION_PREFS, night)).toBe(false);
  });
  it('reads a stored block, keeping the default for any part that is not valid', () => {
    expect(readPrefs({ quiet: { on: true, start: '21:30', end: '06:00', tz: 'Europe/Lisbon' } }).quiet).toEqual({ on: true, start: '21:30', end: '06:00', tz: 'Europe/Lisbon' });
    expect(readPrefs({ quiet: { on: 'yes', start: '9pm', end: 5, tz: 'nope' } }).quiet).toEqual({ on: false, start: '22:00', end: '07:00', tz: 'UTC' });
    expect(readPrefs({ replies: false }).quiet).toEqual(DEFAULT_NOTIFICATION_PREFS.quiet);
  });
});
