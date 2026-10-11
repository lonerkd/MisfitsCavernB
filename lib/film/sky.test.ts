import { describe, expect, it } from 'vitest';
import { lightNoteBrief, minutesPast, sky } from './sky';

const W = 390;
const light = { sunrise: '08:38', sunset: '16:32', goldenStarts: '15:32' };

describe('sky', () => {
  it('puts sunrise and sunset on the horizon, the sun between them', () => {
    const g = sky({ ...light, shootFrom: '09:00', wrapAt: '15:00' }, { width: W })!;
    expect(g.sunrise.y).toBe(g.horizon);
    expect(g.sunset.y).toBe(g.horizon);
    expect(g.sunrise.x).toBeLessThan(g.sunset.x);
    expect(g.sun.x).toBeGreaterThan(g.sunrise.x);
    expect(g.sun.x).toBeLessThan(g.sunset.x);
    expect(g.sun.y).toBeLessThan(g.horizon);
    expect(g.peak.y).toBeLessThan(g.sun.y);
  });

  it('places the sun at magic hour, a bit past the middle of the day', () => {
    const g = sky({ ...light, shootFrom: null, wrapAt: null }, { width: W })!;
    const mid = (g.sunrise.x + g.sunset.x) / 2;
    expect(g.sun.x).toBeGreaterThan(mid);
  });

  it('lays a working window on the arc, and nothing past the light when wrap is before sunset', () => {
    const g = sky({ ...light, shootFrom: '09:00', wrapAt: '15:00' }, { width: W })!;
    expect(g.work).not.toBeNull();
    expect(g.late).toBeNull();
    expect(g.lateMinutes).toBe(0);
    expect(g.work!.startsWith('M')).toBe(true);
  });

  it('a wrap after sunset runs past the horizon mark, in proportion to how late it is', () => {
    const g = sky({ ...light, shootFrom: '09:00', wrapAt: '17:00' }, { width: W })!;
    expect(g.lateMinutes).toBe(28);
    expect(g.late!.from).toBe(g.sunset.x);
    // 28 of the day's 474 minutes, across the sun's span
    expect(g.late!.to - g.late!.from).toBeCloseTo((28 / 474) * (g.sunset.x - g.sunrise.x), 1);
    expect(sky({ ...light, shootFrom: '09:00', wrapAt: '18:00' }, { width: W })!.lateMinutes).toBe(88);
  });

  it('never draws past the edge of the sky', () => {
    const g = sky({ ...light, shootFrom: '09:00', wrapAt: '23:30' }, { width: W })!;
    expect(g.late!.to).toBeLessThanOrEqual(W - 8);
    expect(g.lateMinutes).toBe(23 * 60 + 30 - (16 * 60 + 32));
  });

  it('a call before sunrise runs back past the left mark', () => {
    const g = sky({ ...light, shootFrom: '07:00', wrapAt: '15:00' }, { width: W })!;
    expect(g.early).not.toBeNull();
    expect(g.early!.from).toBe(g.sunrise.x);
    expect(g.early!.to).toBeLessThan(g.sunrise.x);
    expect(g.earlyMinutes).toBe(98);
  });

  it('a wrap after midnight counts as late, not early', () => {
    const g = sky({ ...light, shootFrom: '16:00', wrapAt: '02:00' }, { width: W })!;
    expect(g.lateMinutes).toBe(24 * 60 + 2 * 60 - (16 * 60 + 32));
  });

  it('has nothing to draw without a light, or with a sunset before the sunrise', () => {
    expect(sky(null, { width: W })).toBeNull();
    expect(sky({ sunrise: '', sunset: '', goldenStarts: '', shootFrom: null, wrapAt: null }, { width: W })).toBeNull();
    expect(sky({ sunrise: '17:00', sunset: '09:00', goldenStarts: '16:00', shootFrom: null, wrapAt: null }, { width: W })).toBeNull();
  });

  it('climbs as high as it is told to, so a small sky can keep clear of its title', () => {
    const tall = sky({ ...light, shootFrom: null, wrapAt: null }, { width: W, height: 150 })!;
    const low = sky({ ...light, shootFrom: null, wrapAt: null }, { width: W, height: 150, climb: 0.3 })!;
    expect(low.peak.y).toBeGreaterThan(tall.peak.y);
    expect(low.horizon).toBe(tall.horizon);
  });

  it('ignores times it can’t read', () => {
    const g = sky({ ...light, shootFrom: 'soon', wrapAt: '--:--' }, { width: W })!;
    expect(g.work).toBeNull();
    expect(g.late).toBeNull();
  });
});

describe('minutesPast', () => {
  it('is how long after sunset the day runs', () => {
    expect(minutesPast('16:32', '18:00')).toBe(88);
    expect(minutesPast('16:32', '15:00')).toBe(0);
    expect(minutesPast('16:32', '01:30')).toBe(24 * 60 + 90 - (16 * 60 + 32));
  });
});

describe('lightNoteBrief', () => {
  it('says it in a few words', () => {
    expect(lightNoteBrief({ kind: 'wrap-after-light', scenes: 2, lightEnds: '16:32', wrap: '18:00' })).toBe('1 h 28 past sunset · 2 exteriors');
    expect(lightNoteBrief({ kind: 'wrap-after-light', scenes: 1, lightEnds: '16:32', wrap: '16:50' })).toBe('18 min past sunset · 1 exterior');
    expect(lightNoteBrief({ kind: 'call-before-light', scenes: 3, lightStarts: '08:37', call: '07:00' })).toBe('Call 1 h 37 before sunrise');
    expect(lightNoteBrief({ kind: 'night-needs-dark', scenes: 2, dark: '22:49', wrap: '20:00' })).toBe('Wrap 2 h 49 before dark · 2 night exteriors');
    expect(lightNoteBrief({ kind: 'polar', which: 'day' })).toBe('Sun doesn’t set');
    expect(lightNoteBrief({ kind: 'polar', which: 'night' })).toBe('Sun doesn’t rise');
    expect(lightNoteBrief({ kind: 'no-date' })).toBe('Set a date for the light');
    expect(lightNoteBrief({ kind: 'no-place', place: 'HARBOR' })).toBe('Add where Harbor is');
  });
});
