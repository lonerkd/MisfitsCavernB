// A shoot day, assembled: its scenes, where they are, the light there on that
// date, what in the plan fights the light, and how far the company moves.
// Pure — the stripboard, the locations view and the call sheet all read this.

import { eighthsOf } from '@/lib/studio/shoot-days';
import { distanceKm } from './coordinates';
import { formatInZone, isCoordinate, sunTimes, type SunTimes } from './daylight';

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
  /** The day's shooting call and wrap as "HH:MM", when the call sheet has them. */
  shootFrom: string | null;
  wrapAt: string | null;
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
const clock = (t: string | null | undefined) => {
  const m = typeof t === 'string' ? /^(\d{2}):(\d{2})/.exec(t) : null;
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${m[1]}:${m[2]}` : null;
};

/**
 * The calendar day as "YYYY-MM-DD", or null when the value isn't a real date
 * (missing, malformed, or one that doesn't exist, like 2026-02-31). A timestamp
 * with the date leading is accepted, so the sun is never asked about "NaN".
 */
export function calendarDay(value: unknown): string | null {
  const m = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(value.trim()) : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const at = new Date(Date.UTC(y, mo - 1, d));
  const real = at.getUTCFullYear() === y && at.getUTCMonth() === mo - 1 && at.getUTCDate() === d;
  return real ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** The sun for a place and date, or null if it didn't come out as real instants. */
function usableSun(date: string, place: DayPlace): SunTimes | null {
  const sun = sunTimes(date, place.latitude as number, place.longitude as number);
  return Number.isFinite(sun.solarNoon.getTime()) && Number.isFinite(sun.daylightMinutes) ? sun : null;
}
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

    // An unreadable date is no date: nothing to compute the light from.
    const shootDate = calendarDay(day.shoot_date);
    const sun = shootDate && lightAt ? usableSun(shootDate, lightAt) : null;

    if (!shootDate) {
      if (dayScenes.length) notes.push({ kind: 'no-date' });
    } else if (!lightAt || !sun) {
      // The place the light was tried for, else the day's first.
      const named = lightAt ?? dayPlaces[0];
      if (named) notes.push({ kind: 'no-place', place: named.name });
    } else {
      const zone = lightAt.timezone || viewerZone;
      const at = (d: Date | null) => formatInZone(d && Number.isFinite(d.getTime()) ? d : null, zone);
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
        // The call sheet runs on one clock — the light place's. Each exterior is judged by the sun at
        // its own place (a scene with no coordinates by the light place's), shown on that clock, so a
        // day that crosses longitudes is warned by the scene the light fails first.
        const lightOf = (s: DayScene) => {
          const p = s.location_id ? placeOf.get(s.location_id) : undefined;
          const own = p && hasCoordinates(p) ? p : lightAt;
          if (own === lightAt) return light as DayLight & { polar?: boolean };
          const t = sunTimes(day.shoot_date as string, own.latitude as number, own.longitude as number);
          return { ...(light as DayLight), sunrise: at(t.sunrise), sunset: at(t.sunset), dusk: at(t.dusk), polar: !!t.polar };
        };
        const extDayScenes = dayScenes.filter((s) => isExterior(s) && isDay(s)).map(lightOf).filter((l) => !l.polar);
        const extNightScenes = dayScenes.filter((s) => isExterior(s) && isNight(s)).map(lightOf).filter((l) => !l.polar);
        const extDay = extDayScenes.length;
        const extNight = extNightScenes.length;
        if (wrapMinutes != null) {
          const late = extDayScenes.filter((l) => l.sunset && wrapMinutes > minutesOf(l.sunset));
          if (late.length) {
            const lightEnds = late.reduce((a, l) => (minutesOf(l.sunset) < minutesOf(a) ? l.sunset : a), late[0].sunset);
            notes.push({ kind: 'wrap-after-light', scenes: late.length, lightEnds, wrap: wrap as string });
          }
        }
        if (extDay && extDay === dayScenes.length && call != null) {
          const dark = extDayScenes.filter((l) => l.sunrise && minutesOf(call) < minutesOf(l.sunrise));
          if (dark.length) {
            const lightStarts = dark.reduce((a, l) => (minutesOf(l.sunrise) > minutesOf(a) ? l.sunrise : a), dark[0].sunrise);
            notes.push({ kind: 'call-before-light', scenes: extDay, lightStarts, call });
          }
        }
        if (wrapMinutes != null) {
          const early = extNightScenes.filter((l) => l.dusk && wrapMinutes < minutesOf(l.dusk));
          if (early.length) {
            const dark = early.reduce((a, l) => (minutesOf(l.dusk) > minutesOf(a) ? l.dusk : a), early[0].dusk);
            notes.push({ kind: 'night-needs-dark', scenes: early.length, dark, wrap: wrap as string });
          }
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
      id: day.id, number: day.day_number, date: shootDate,
      scenes: dayScenes, eighths: dayScenes.reduce((n, s) => n + eighthsOf(s.est_duration), 0),
      places: dayPlaces, lightAt, light, shootFrom: clock(callsByDay[day.id]?.shooting_call), wrapAt: clock(callsByDay[day.id]?.estimated_wrap), notes, moves,
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

/** The call sheet's light line; "" when there's none to give (no place, no date, or no sunrise that day). */
export function lightLine(light: DayLight | null | undefined): string {
  if (!light || !light.sunrise || !light.sunset) return '';
  return `Sunrise ${light.sunrise} · Magic hour ${light.goldenStarts} · Sunset ${light.sunset} (${light.zone})`;
}
