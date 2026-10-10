// A shoot day, assembled: its scenes, where they are, the light there on that
// date, what in the plan fights the light, and how far the company moves.
// Pure — the stripboard, the locations view and the call sheet all read this.

import { eighthsOf } from '@/lib/studio/shoot-days';
import { distanceKm } from './coordinates';
import { formatInZone, isCoordinate, sunTimes } from './daylight';

export interface DayScene {
  id: string;
  scene_number: number;
  heading: string | null;
  time_of_day: string | null;
  est_duration: string | null;
  location_id: string | null;
  shoot_day_id: string | null;
}
export interface DayPlace { id: string; name: string; latitude: number | null; longitude: number | null; timezone: string | null }
export interface DayRecord { id: string; day_number: number; shoot_date: string | null }
/** Clock times as the call sheet stores them: "HH:MM" or "HH:MM:SS". */
export interface DayCalls { shooting_call: string | null; estimated_wrap: string | null }

export type LightNote =
  /** Why there's no light to show. */
  | { kind: 'no-date' }
  | { kind: 'no-place'; place: string }
  | { kind: 'polar'; which: 'day' | 'night' }
  /** Exterior day scenes, and wrap is after sunset. */
  | { kind: 'wrap-after-light'; scenes: number; lightEnds: string; wrap: string }
  /** The whole day is exterior day, and the shooting call is before sunrise. */
  | { kind: 'call-before-light'; scenes: number; lightStarts: string; call: string }
  /** Night exteriors, and wrap is before it's dark. */
  | { kind: 'night-needs-dark'; scenes: number; dark: string; wrap: string };

export interface DayLight {
  dawn: string;
  sunrise: string;
  goldenEnds: string;
  goldenStarts: string;
  sunset: string;
  dusk: string;
  /** The zone the times are in: the place's, or the viewer's if it has none. */
  zone: string;
  daylightMinutes: number;
}

export interface FilmDay {
  id: string;
  number: number;
  date: string | null;
  scenes: DayScene[];
  eighths: number;
  /** In shooting order, each once. */
  places: DayPlace[];
  /** The place the light is computed for: the first that day with coordinates. */
  lightAt: DayPlace | null;
  light: DayLight | null;
  notes: LightNote[];
  /** Company moves between consecutive places that both have coordinates (straight-line). */
  moves: { from: string; to: string; km: number }[];
}

const isExterior = (s: DayScene) => /^(EXT|I\/E|INT\/EXT|EXT\/INT)\b/.test((s.heading ?? '').trim().toUpperCase());
const timeOf = (s: DayScene) => `${s.time_of_day ?? ''} ${s.heading ?? ''}`.toUpperCase();
const isNight = (s: DayScene) => /\bNIGHT\b/.test(timeOf(s));
/** Daylight, plainly: not night, and not the edges of the day (which want the low sun anyway). */
const isDay = (s: DayScene) => !isNight(s) && !/\b(DUSK|EVENING|DAWN|SUNSET|SUNRISE|MAGIC HOUR)\b/.test(timeOf(s)) && /\bDAY\b|\bMORNING\b|\bAFTERNOON\b/.test(timeOf(s));

const hasCoordinates = (p: DayPlace) => isCoordinate(p.latitude, p.longitude);
const clock = (t: string | null | undefined) => (t && /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : null);
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export function buildDays(
  days: DayRecord[],
  scenes: DayScene[],
  places: DayPlace[],
  callsByDay: Record<string, DayCalls | undefined>,
  viewerZone: string,
): FilmDay[] {
  const placeOf = new Map(places.map((p) => [p.id, p]));
  return [...days].sort((a, b) => a.day_number - b.day_number).map((day) => {
    const dayScenes = scenes.filter((s) => s.shoot_day_id === day.id).sort((a, b) => a.scene_number - b.scene_number);
    const dayPlaces: DayPlace[] = [];
    for (const s of dayScenes) {
      const p = s.location_id ? placeOf.get(s.location_id) : undefined;
      if (p && !dayPlaces.includes(p)) dayPlaces.push(p);
    }
    const located = dayPlaces.filter(hasCoordinates);
    const lightAt = located[0] ?? null;
    const notes: LightNote[] = [];
    let light: DayLight | null = null;

    if (!day.shoot_date) {
      if (dayScenes.length) notes.push({ kind: 'no-date' });
    } else if (!lightAt) {
      if (dayPlaces.length) notes.push({ kind: 'no-place', place: dayPlaces[0].name });
    } else {
      const zone = lightAt.timezone || viewerZone;
      const sun = sunTimes(day.shoot_date, lightAt.latitude as number, lightAt.longitude as number);
      const at = (d: Date | null) => formatInZone(d, zone);
      light = {
        dawn: at(sun.dawn), sunrise: at(sun.sunrise), goldenEnds: at(sun.goldenEnds),
        goldenStarts: at(sun.goldenStarts), sunset: at(sun.sunset), dusk: at(sun.dusk),
        zone, daylightMinutes: sun.daylightMinutes,
      };
      if (sun.polar) {
        notes.push({ kind: 'polar', which: sun.polar });
      } else {
        const calls = callsByDay[day.id];
        const call = clock(calls?.shooting_call);
        const wrap = clock(calls?.estimated_wrap);
        // A wrap earlier on the clock than the call is after midnight.
        const wrapMinutes = wrap == null ? null : minutesOf(wrap) + (call != null && minutesOf(wrap) < minutesOf(call) ? 1440 : 0);
        const extDay = dayScenes.filter((s) => isExterior(s) && isDay(s)).length;
        const extNight = dayScenes.filter((s) => isExterior(s) && isNight(s)).length;
        if (extDay && wrapMinutes != null && light.sunset && wrapMinutes > minutesOf(light.sunset)) {
          notes.push({ kind: 'wrap-after-light', scenes: extDay, lightEnds: light.sunset, wrap: wrap as string });
        }
        if (extDay && extDay === dayScenes.length && call != null && light.sunrise && minutesOf(call) < minutesOf(light.sunrise)) {
          notes.push({ kind: 'call-before-light', scenes: extDay, lightStarts: light.sunrise, call });
        }
        if (extNight && wrapMinutes != null && light.dusk && wrapMinutes < minutesOf(light.dusk)) {
          notes.push({ kind: 'night-needs-dark', scenes: extNight, dark: light.dusk, wrap: wrap as string });
        }
      }
    }

    const moves: FilmDay['moves'] = [];
    for (let i = 1; i < located.length; i += 1) {
      const a = located[i - 1], b = located[i];
      moves.push({
        from: a.name, to: b.name,
        km: Math.round(distanceKm({ latitude: a.latitude as number, longitude: a.longitude as number }, { latitude: b.latitude as number, longitude: b.longitude as number })),
      });
    }

    return {
      id: day.id, number: day.day_number, date: day.shoot_date,
      scenes: dayScenes, eighths: dayScenes.reduce((n, s) => n + eighthsOf(s.est_duration), 0),
      places: dayPlaces, lightAt, light, notes, moves,
    };
  });
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One plain sentence, for the screen and the printed call sheet. */
export function lightNoteText(n: LightNote): string {
  switch (n.kind) {
    case 'no-date': return 'Set a date to see the light.';
    case 'no-place': return `Add where ${n.place} is to see the light.`;
    case 'polar': return n.which === 'day' ? 'The sun doesn’t set here on this date.' : 'The sun doesn’t rise here on this date.';
    case 'wrap-after-light': return `${count(n.scenes, 'exterior day scene', 'exterior day scenes')}, but the light ends at ${n.lightEnds} and wrap is ${n.wrap}.`;
    case 'call-before-light': return `Every scene is an exterior in daylight, but the call is ${n.call} and the sun rises at ${n.lightStarts}.`;
    case 'night-needs-dark': return `${count(n.scenes, 'night exterior', 'night exteriors')}, but it isn’t dark until ${n.dark} and wrap is ${n.wrap}.`;
  }
}
