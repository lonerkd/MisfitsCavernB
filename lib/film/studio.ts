// The Studio's rows, read as film days. The Studio still schedules by day
// number and names places by the heading's text, so this matches on those
// first — a scene just dragged to another day shows there at once — and uses
// the links (shoot_day_id, location_id) to find the rows behind them.

import { buildDays, type DayCalls, type DayLight, type DayPlace, type DayRecord, type FilmDay } from './days';
import { formatInZone, isCoordinate, sunTimes } from './daylight';

export interface StudioScene {
  id: string;
  scene_number: number;
  heading: string | null;
  time_of_day: string | null;
  est_duration: string | null;
  location: string | null;
  location_id?: string | null;
  shoot_day: number | null;
  shoot_day_id?: string | null;
}
export interface StudioSheet extends DayCalls { shoot_day: number; shoot_date: string | null }

const key = (name: string | null | undefined) => (name ?? '').trim().toUpperCase();

export function filmDays({ scenes, days, places, sheets, viewerZone }: {
  scenes: StudioScene[]; days: DayRecord[]; places: DayPlace[]; sheets: StudioSheet[]; viewerZone: string;
}): FilmDay[] {
  const sheetOf = new Map(sheets.map((c) => [c.shoot_day, c]));
  const rowOf = new Map(days.map((d) => [d.day_number, d]));
  const numbers = new Set<number>([...days.map((d) => d.day_number), ...scenes.map((s) => s.shoot_day ?? 1)]);
  // A day the schedule uses but nobody has saved yet still shows, under a stand-in id.
  const records: DayRecord[] = Array.from(numbers).map((n) => {
    const row = rowOf.get(n);
    return { id: row?.id ?? `day:${n}`, day_number: n, shoot_date: row?.shoot_date ?? sheetOf.get(n)?.shoot_date ?? null };
  });
  const idOf = new Map(records.map((r) => [r.day_number, r.id]));
  const byId = new Map(places.map((p) => [p.id, p]));
  const byName = new Map(places.map((p) => [key(p.name), p]));

  const dayScenes = scenes.map((s) => ({
    id: s.id, scene_number: s.scene_number, heading: s.heading, time_of_day: s.time_of_day, est_duration: s.est_duration,
    location_id: (s.location_id && byId.has(s.location_id) ? s.location_id : byName.get(key(s.location))?.id) ?? null,
    shoot_day_id: idOf.get(s.shoot_day ?? 1) ?? null,
  }));
  const calls: Record<string, DayCalls | undefined> = {};
  for (const r of records) calls[r.id] = sheetOf.get(r.day_number);
  return buildDays(records, dayScenes, places, calls, viewerZone);
}

/** A place's light on a date ("" times under the midnight sun or in polar night); null without coordinates or a date. */
export function placeLight(
  place: Pick<DayPlace, 'latitude' | 'longitude' | 'timezone'> | null | undefined, date: string | null | undefined, viewerZone: string,
): (DayLight & { polar: 'day' | 'night' | null }) | null {
  if (!place || !date || !isCoordinate(place.latitude, place.longitude)) return null;
  const zone = place.timezone || viewerZone;
  const sun = sunTimes(date, place.latitude as number, place.longitude as number);
  const at = (d: Date | null) => formatInZone(d, zone);
  return {
    dawn: at(sun.dawn), sunrise: at(sun.sunrise), goldenEnds: at(sun.goldenEnds), goldenStarts: at(sun.goldenStarts),
    sunset: at(sun.sunset), dusk: at(sun.dusk), zone, daylightMinutes: sun.daylightMinutes, polar: sun.polar,
  };
}

/** The device's own zone, for places that haven't been given one. */
export const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
