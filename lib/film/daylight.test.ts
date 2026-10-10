import { describe, expect, it } from 'vitest';
import { formatInZone, isCoordinate, sunTimes } from './daylight';

const CALGARY = [51.0447, -114.0719] as const;
const TROMSO = [69.6492, 18.9553] as const;
// Arizona's clock never changes, so these don't depend on which year's time zone rules a machine has.
const STEADY = 'America/Phoenix';

const mins = (d: Date | null, tz: string) => {
  const [h, m] = formatInZone(d, tz).split(':').map(Number);
  return h * 60 + m;
};
const near = (actual: number, hhmm: string, tol = 4) => {
  const [h, m] = hhmm.split(':').map(Number);
  expect(Math.abs(actual - (h * 60 + m)), `${Math.floor(actual / 60)}:${String(actual % 60).padStart(2, '0')} vs ${hhmm}`).toBeLessThanOrEqual(tol);
};

describe('sunTimes', () => {
  it('Calgary, midsummer', () => {
    const t = sunTimes('2026-06-21', ...CALGARY);
    near(mins(t.sunrise, STEADY), '04:21');
    near(mins(t.sunset, STEADY), '20:54');
    expect(t.polar).toBeNull();
    expect(t.daylightMinutes).toBeGreaterThan(985);
    expect(t.daylightMinutes).toBeLessThan(1000);
  });

  it('Calgary, midwinter', () => {
    const t = sunTimes('2026-12-21', ...CALGARY);
    near(mins(t.sunrise, STEADY), '08:37');
    near(mins(t.sunset, STEADY), '16:32');
  });

  it('the equator at the equinox is about twelve hours', () => {
    const t = sunTimes('2026-03-20', -0.1807, -78.4678);
    expect(Math.abs(t.daylightMinutes - 727)).toBeLessThanOrEqual(4);
  });

  it('orders the day: dawn, sunrise, golden ends, noon, golden starts, sunset, dusk', () => {
    const t = sunTimes('2026-09-15', ...CALGARY);
    const order = [t.dawn, t.sunrise, t.goldenEnds, t.solarNoon, t.goldenStarts, t.sunset, t.dusk].map((d) => d!.getTime());
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(7);
  });

  it('Tromsø: midnight sun and polar night', () => {
    expect(sunTimes('2026-06-21', ...TROMSO)).toMatchObject({ polar: 'day', sunrise: null, sunset: null, daylightMinutes: 1440 });
    expect(sunTimes('2026-12-21', ...TROMSO)).toMatchObject({ polar: 'night', sunrise: null, sunset: null, daylightMinutes: 0 });
  });

  it('the southern hemisphere has long days in December', () => {
    expect(sunTimes('2026-12-21', -33.8688, 151.2093).daylightMinutes).toBeGreaterThan(850);
  });

  it('the day asked for is the calendar day at the place, east or west', () => {
    // Sydney's sunrise on its 21 December is on 20 December in UTC.
    const t = sunTimes('2026-12-21', -33.8688, 151.2093);
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(t.sunrise!)).toBe('2026-12-21');
    const c = sunTimes('2026-06-21', ...CALGARY);
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: STEADY }).format(c.sunset!)).toBe('2026-06-21');
  });
});

describe('formatInZone', () => {
  it('formats in the place’s zone, and nothing for null', () => {
    expect(formatInZone(new Date('2026-06-21T11:21:00Z'), STEADY)).toBe('04:21');
    expect(formatInZone(null, STEADY)).toBe('');
  });

  it('falls back to UTC for a zone it doesn’t know', () => {
    expect(formatInZone(new Date('2026-06-21T11:21:00Z'), 'Not/AZone')).toBe('11:21');
  });
});

describe('isCoordinate', () => {
  it('refuses nonsense', () => {
    for (const [a, b] of [[91, 0], [0, 181], [NaN, 0], ['51', '-114'], [null, null], [undefined, 3]] as [unknown, unknown][]) {
      expect(isCoordinate(a, b)).toBe(false);
    }
    expect(isCoordinate(51.04, -114.07)).toBe(true);
    expect(isCoordinate(0, 0)).toBe(true);
  });
});
