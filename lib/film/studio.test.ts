import { describe, expect, it } from 'vitest';
import { filmDays, placeLight } from './studio';

const HARBOR = { id: 'harbor', name: 'HARBOR', latitude: 51.0447, longitude: -114.0719, timezone: 'America/Phoenix' };
const CAVE = { id: 'cave', name: 'CAVE', latitude: null, longitude: null, timezone: null };

const scene = (n: number, location: string | null, shoot_day: number | null, extra: Record<string, unknown> = {}) => ({
  id: `s${n}`, scene_number: n, heading: `EXT. ${location ?? 'NOWHERE'} - DAY`, time_of_day: 'DAY', est_duration: '4/8',
  location, location_id: null as string | null, shoot_day, shoot_day_id: null as string | null, ...extra,
});

describe('filmDays', () => {
  it('follows the day number, so a scene just dragged shows on its new day before the link catches up', () => {
    const days = [{ id: 'd1', day_number: 1, shoot_date: '2026-06-21' }, { id: 'd2', day_number: 2, shoot_date: null }];
    const moved = scene(1, 'HARBOR', 2, { shoot_day_id: 'd1', location_id: 'harbor' });
    const out = filmDays({ scenes: [moved], days, places: [HARBOR], sheets: [], viewerZone: 'UTC' });
    expect(out.map((d) => d.scenes.length)).toEqual([0, 1]);
  });

  it('shows a day the schedule uses even before it has a row, with its call sheet’s date', () => {
    const out = filmDays({
      scenes: [scene(1, 'HARBOR', 3, { location_id: 'harbor' })], days: [], places: [HARBOR],
      sheets: [{ shoot_day: 3, shoot_date: '2026-06-21', shooting_call: '08:00:00', estimated_wrap: '17:00:00' }], viewerZone: 'UTC',
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ number: 3, date: '2026-06-21' });
    expect(out[0].light?.sunrise.startsWith('04:')).toBe(true);
  });

  it('prefers the day’s own date over its call sheet’s', () => {
    const out = filmDays({
      scenes: [scene(1, 'HARBOR', 1, { location_id: 'harbor' })], days: [{ id: 'd1', day_number: 1, shoot_date: '2026-12-21' }], places: [HARBOR],
      sheets: [{ shoot_day: 1, shoot_date: '2026-06-21', shooting_call: null, estimated_wrap: null }], viewerZone: 'UTC',
    });
    expect(out[0].date).toBe('2026-12-21');
  });

  it('finds a scene’s place by its link, else by the heading’s name', () => {
    const out = filmDays({
      scenes: [scene(1, ' harbor ', 1), scene(2, 'CAVE', 1, { location_id: 'cave' })], days: [{ id: 'd1', day_number: 1, shoot_date: '2026-06-21' }],
      places: [HARBOR, CAVE], sheets: [], viewerZone: 'UTC',
    });
    expect(out[0].places.map((p) => p.name)).toEqual(['HARBOR', 'CAVE']);
    expect(out[0].lightAt?.name).toBe('HARBOR');
  });

  it('a scene with no day counts as day 1, as the stripboard shows it', () => {
    const out = filmDays({ scenes: [scene(1, 'HARBOR', null)], days: [], places: [HARBOR], sheets: [], viewerZone: 'UTC' });
    expect(out.map((d) => [d.number, d.scenes.length])).toEqual([[1, 1]]);
  });

  it('passes the day’s calls through to the warnings', () => {
    const out = filmDays({
      scenes: [scene(1, 'HARBOR', 1, { location_id: 'harbor' })], days: [{ id: 'd1', day_number: 1, shoot_date: '2026-12-21' }], places: [HARBOR],
      sheets: [{ shoot_day: 1, shoot_date: '2026-12-21', shooting_call: '09:00:00', estimated_wrap: '18:00:00' }], viewerZone: 'UTC',
    });
    expect(out[0].notes.map((n) => n.kind)).toEqual(['wrap-after-light']);
  });
});

describe('placeLight', () => {
  it('gives a place’s light on a date, in its zone', () => {
    const l = placeLight(HARBOR, '2026-06-21', 'UTC')!;
    expect(l.zone).toBe('America/Phoenix');
    expect(l.sunrise.startsWith('04:')).toBe(true);
    expect(l.polar).toBeNull();
  });

  it('is nothing without coordinates or a date', () => {
    expect(placeLight(CAVE, '2026-06-21', 'UTC')).toBeNull();
    expect(placeLight(HARBOR, null, 'UTC')).toBeNull();
    expect(placeLight(null, '2026-06-21', 'UTC')).toBeNull();
  });

  it('says so under the midnight sun', () => {
    expect(placeLight({ ...HARBOR, latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo' }, '2026-06-21', 'UTC')?.polar).toBe('day');
  });
});
