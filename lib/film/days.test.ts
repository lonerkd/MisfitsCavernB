import { describe, expect, it } from 'vitest';
import { buildDays, lightLine, lightNoteText, type DayPlace, type DayRecord, type DayScene } from './days';

const HARBOR: DayPlace = { id: 'harbor', name: 'HARBOR', latitude: 51.0447, longitude: -114.0719, timezone: 'America/Edmonton' };
const WAREHOUSE: DayPlace = { id: 'warehouse', name: 'WAREHOUSE', latitude: null, longitude: null, timezone: null };
const BANFF: DayPlace = { id: 'banff', name: 'BANFF', latitude: 51.1784, longitude: -115.5708, timezone: 'America/Edmonton' };
const TROMSO: DayPlace = { id: 'tromso', name: 'FJORD', latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo' };
const PLACES = [HARBOR, WAREHOUSE, BANFF, TROMSO];

const day = (n: number, date: string | null): DayRecord => ({ id: `d${n}`, day_number: n, shoot_date: date });
let seq = 0;
function scene(dayId: string | null, heading: string, place: DayPlace | null, extra: Partial<DayScene> = {}): DayScene {
  seq += 1;
  const tod = heading.split(' - ').pop() ?? null;
  return { id: `s${seq}`, scene_number: seq, heading, time_of_day: tod, est_duration: '4/8', location_id: place?.id ?? null, shoot_day_id: dayId, ...extra };
}
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

describe('buildDays', () => {
  it('orders days by number and scenes by number, and counts pages', () => {
    const b = scene('d2', 'INT. WAREHOUSE - DAY', WAREHOUSE, { scene_number: 9 });
    const a = scene('d2', 'INT. WAREHOUSE - DAY', WAREHOUSE, { scene_number: 3, est_duration: '1 2/8' });
    const first = scene('d1', 'INT. WAREHOUSE - DAY', WAREHOUSE);
    const days = buildDays([day(2, null), day(1, null)], [b, a, first], PLACES, {}, 'UTC');
    expect(days.map((d) => d.number)).toEqual([1, 2]);
    expect(days[1].scenes.map((s) => s.scene_number)).toEqual([3, 9]);
    expect(days[1].eighths).toBe(6); // 2/8 + 4/8
  });

  it('gives the light for the first place with coordinates, in that place’s time', () => {
    const [d] = buildDays([day(1, '2026-06-21')],
      [scene('d1', 'INT. WAREHOUSE - DAY', WAREHOUSE), scene('d1', 'EXT. HARBOR - DAY', HARBOR), scene('d1', 'EXT. BANFF - DAY', BANFF)], PLACES, {}, 'Europe/London');
    expect(d.lightAt?.name).toBe('HARBOR');
    expect(d.light?.zone).toBe('America/Edmonton');
    expect(Math.abs(minutes(d.light!.sunrise) - minutes('05:21'))).toBeLessThanOrEqual(4);
    expect(Math.abs(minutes(d.light!.sunset) - minutes('21:54'))).toBeLessThanOrEqual(4);
    expect(d.light!.goldenStarts < d.light!.sunset).toBe(true);
    expect(d.notes).toEqual([]);
  });

  it('says why there is no light: no date', () => {
    const [d] = buildDays([day(1, null)], [scene('d1', 'EXT. HARBOR - DAY', HARBOR)], PLACES, {}, 'UTC');
    expect(d.light).toBeNull();
    expect(d.notes).toEqual([{ kind: 'no-date' }]);
  });

  it('says why there is no light: nowhere that day has coordinates', () => {
    const [d] = buildDays([day(1, '2026-06-21')], [scene('d1', 'EXT. WAREHOUSE - DAY', WAREHOUSE)], PLACES, {}, 'UTC');
    expect(d.light).toBeNull();
    expect(d.lightAt).toBeNull();
    expect(d.notes).toEqual([{ kind: 'no-place', place: 'WAREHOUSE' }]);
    expect(JSON.stringify(d)).not.toMatch(/NaN|Invalid/);
  });

  it('a day with nothing scheduled has no note about places', () => {
    const [d] = buildDays([day(1, '2026-06-21')], [], PLACES, {}, 'UTC');
    expect(d.scenes).toEqual([]);
    expect(d.notes).toEqual([]);
  });

  it('warns when exterior day scenes are planned past sunset', () => {
    const [d] = buildDays([day(1, '2026-12-21')],
      [scene('d1', 'EXT. HARBOR - DAY', HARBOR), scene('d1', 'EXT. HARBOR - DAY', HARBOR), scene('d1', 'INT. HARBOR - DAY', HARBOR)],
      PLACES, { d1: { shooting_call: '09:00:00', estimated_wrap: '18:00:00' } }, 'UTC');
    expect(d.notes).toHaveLength(1);
    expect(d.notes[0]).toMatchObject({ kind: 'wrap-after-light', scenes: 2, wrap: '18:00' });
    const note = d.notes[0] as { lightEnds: string };
    expect(Math.abs(minutes(note.lightEnds) - minutes('16:32'))).toBeLessThanOrEqual(4);
  });

  it('does not warn for interiors, or when wrap is before sunset, or with no wrap set', () => {
    const interiors = buildDays([day(1, '2026-12-21')], [scene('d1', 'INT. HARBOR - DAY', HARBOR)], PLACES, { d1: { shooting_call: '09:00', estimated_wrap: '22:00' } }, 'UTC');
    const early = buildDays([day(1, '2026-12-21')], [scene('d1', 'EXT. HARBOR - DAY', HARBOR)], PLACES, { d1: { shooting_call: '09:00', estimated_wrap: '15:30' } }, 'UTC');
    const unset = buildDays([day(1, '2026-12-21')], [scene('d1', 'EXT. HARBOR - DAY', HARBOR)], PLACES, {}, 'UTC');
    expect([interiors[0].notes, early[0].notes, unset[0].notes]).toEqual([[], [], []]);
  });

  it('warns when night exteriors wrap before dark', () => {
    const [d] = buildDays([day(1, '2026-06-21')], [scene('d1', 'EXT. HARBOR - NIGHT', HARBOR)], PLACES, { d1: { shooting_call: '12:00', estimated_wrap: '19:00' } }, 'UTC');
    expect(d.notes).toHaveLength(1);
    expect(d.notes[0]).toMatchObject({ kind: 'night-needs-dark', scenes: 1, wrap: '19:00' });
  });

  it('a wrap after midnight counts as late, not early', () => {
    const [d] = buildDays([day(1, '2026-06-21')], [scene('d1', 'EXT. HARBOR - NIGHT', HARBOR)], PLACES, { d1: { shooting_call: '16:00', estimated_wrap: '02:00' } }, 'UTC');
    expect(d.notes).toEqual([]);
  });

  it('warns when the call is before sunrise and the whole day is exterior day', () => {
    const calls = { d1: { shooting_call: '07:00', estimated_wrap: '15:00' } };
    const [all] = buildDays([day(1, '2026-12-21')], [scene('d1', 'EXT. HARBOR - DAY', HARBOR)], PLACES, calls, 'UTC');
    expect(all.notes).toHaveLength(1);
    expect(all.notes[0]).toMatchObject({ kind: 'call-before-light', scenes: 1, call: '07:00' });
    const [mixed] = buildDays([day(1, '2026-12-21')], [scene('d1', 'EXT. HARBOR - DAY', HARBOR), scene('d1', 'INT. HARBOR - DAY', HARBOR)], PLACES, calls, 'UTC');
    expect(mixed.notes).toEqual([]);
  });

  it('uses the viewer’s zone when the place has none', () => {
    const noZone = { ...HARBOR, timezone: null };
    const [d] = buildDays([day(1, '2026-06-21')], [scene('d1', 'EXT. HARBOR - DAY', noZone)], [noZone], {}, 'America/Vancouver');
    expect(d.light?.zone).toBe('America/Vancouver');
    expect(Math.abs(minutes(d.light!.sunrise) - minutes('04:21'))).toBeLessThanOrEqual(4);
  });

  it('reports the midnight sun in words, with no times and no light warnings', () => {
    const [d] = buildDays([day(1, '2026-06-21')], [scene('d1', 'EXT. FJORD - NIGHT', TROMSO)], PLACES, { d1: { shooting_call: '10:00', estimated_wrap: '19:00' } }, 'UTC');
    expect(d.notes).toEqual([{ kind: 'polar', which: 'day' }]);
    expect(d.light).toMatchObject({ sunrise: '', sunset: '', daylightMinutes: 1440 });
  });

  it('measures company moves between places that have coordinates', () => {
    const [d] = buildDays([day(1, '2026-06-21')],
      [scene('d1', 'EXT. HARBOR - DAY', HARBOR), scene('d1', 'EXT. HARBOR - DAY', HARBOR), scene('d1', 'INT. WAREHOUSE - DAY', WAREHOUSE), scene('d1', 'EXT. BANFF - DAY', BANFF)], PLACES, {}, 'UTC');
    expect(d.places.map((p) => p.name)).toEqual(['HARBOR', 'WAREHOUSE', 'BANFF']);
    expect(d.moves).toHaveLength(1);
    expect(d.moves[0]).toMatchObject({ from: 'HARBOR', to: 'BANFF' });
    expect(Math.abs(d.moves[0].km - 105)).toBeLessThanOrEqual(2);
  });

  it('leaves out scenes with no day; a day with no scenes still appears', () => {
    const days = buildDays([day(1, null), day(2, null)], [scene(null, 'INT. WAREHOUSE - DAY', WAREHOUSE), scene('d2', 'INT. WAREHOUSE - DAY', WAREHOUSE)], PLACES, {}, 'UTC');
    expect(days.map((d) => d.scenes.length)).toEqual([0, 1]);
  });
});

describe('lightNoteText', () => {
  it('reads as a sentence', () => {
    expect(lightNoteText({ kind: 'no-date' })).toBe('Set a date to see the light.');
    expect(lightNoteText({ kind: 'no-place', place: 'HARBOR' })).toBe('Add where HARBOR is to see the light.');
    expect(lightNoteText({ kind: 'polar', which: 'day' })).toBe('The sun doesn’t set here on this date.');
    expect(lightNoteText({ kind: 'polar', which: 'night' })).toBe('The sun doesn’t rise here on this date.');
    expect(lightNoteText({ kind: 'wrap-after-light', scenes: 2, lightEnds: '16:32', wrap: '18:00' }))
      .toBe('2 exterior day scenes, but the light ends at 16:32 and wrap is 18:00.');
    expect(lightNoteText({ kind: 'wrap-after-light', scenes: 1, lightEnds: '16:32', wrap: '18:00' }))
      .toBe('1 exterior day scene, but the light ends at 16:32 and wrap is 18:00.');
    expect(lightNoteText({ kind: 'call-before-light', scenes: 1, lightStarts: '08:37', call: '07:00' }))
      .toBe('Every scene is an exterior in daylight, but the call is 07:00 and the sun rises at 08:37.');
    expect(lightNoteText({ kind: 'night-needs-dark', scenes: 3, dark: '22:40', wrap: '19:00' }))
      .toBe('3 night exteriors, but it isn’t dark until 22:40 and wrap is 19:00.');
  });
});

describe('lightLine', () => {
  const light = { dawn: '08:00', sunrise: '08:37', goldenEnds: '09:40', goldenStarts: '15:44', sunset: '16:32', dusk: '17:09', zone: 'America/Edmonton', daylightMinutes: 475 };

  it('is the call sheet’s line: sunrise, magic hour, sunset, and whose clock', () => {
    expect(lightLine(light)).toBe('Sunrise 08:37 · Magic hour 15:44 · Sunset 16:32 (America/Edmonton)');
  });

  it('is nothing when there is no light to give, or no sunrise that day', () => {
    expect(lightLine(null)).toBe('');
    expect(lightLine({ ...light, sunrise: '', sunset: '', goldenStarts: '' })).toBe('');
  });
});
