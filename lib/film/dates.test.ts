import { describe, expect, it } from 'vitest';
import { dateOfDayMap } from './dates';

describe('a day’s date', () => {
  it('is the day’s own date, even with no call sheet', () => {
    expect(dateOfDayMap([{ day_number: 2, shoot_date: '2026-12-01' }], [])).toEqual(new Map([[2, '2026-12-01']]));
  });
  it('falls back to the call sheet when the day has none', () => {
    expect(dateOfDayMap([{ day_number: 1, shoot_date: null }], [{ shoot_day: 1, shoot_date: '2026-12-02' }])).toEqual(new Map([[1, '2026-12-02']]));
  });
  it('prefers the day when both say something', () => {
    expect(dateOfDayMap([{ day_number: 1, shoot_date: '2026-12-03' }], [{ shoot_day: 1, shoot_date: '2026-12-02' }]).get(1)).toBe('2026-12-03');
  });
  it('leaves undated days out', () => {
    expect(dateOfDayMap([{ day_number: 1, shoot_date: null }], [{ shoot_day: 1, shoot_date: null }]).size).toBe(0);
  });
});
