// A day's light as a drawing (design-language.md, "Sky"): the sun's path from
// sunrise to sunset, the sun at magic hour, and the working day laid along it.
// Hours past sunset (or before sunrise) run out along the horizon, where the
// interface draws them as the limit. Pure geometry — the component only paints.

import type { LightNote } from './days';

export interface SkyInput {
  /** "HH:MM" clock times at the place. */
  sunrise: string;
  sunset: string;
  goldenStarts: string;
  /** The shooting call and the wrap; null when not set. */
  shootFrom: string | null;
  wrapAt: string | null;
}
export interface Point { x: number; y: number }
export interface Sky {
  width: number;
  height: number;
  horizon: number;
  sunrise: Point;
  sunset: Point;
  peak: Point;
  /** The sun, at magic hour. */
  sun: Point;
  /** SVG path of the whole arc. */
  arc: string;
  /** SVG path of the working day along the arc (inside the light). */
  work: string | null;
  /** The working day past sunset, along the horizon. */
  late: { from: number; to: number; y: number } | null;
  /** The working day before sunrise. */
  early: { from: number; to: number; y: number } | null;
  lateMinutes: number;
  earlyMinutes: number;
}

const CLOCK = /^(\d{1,2}):(\d{2})/;
const minutes = (t: string | null | undefined): number | null => {
  const m = t ? CLOCK.exec(t) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Minutes the day runs past `sunset`; a wrap earlier on the clock than the sunset is after midnight only when it is before the call. */
export function minutesPast(sunset: string, at: string): number {
  const s = minutes(sunset), a = minutes(at);
  if (s == null || a == null) return 0;
  if (a >= s) return a - s;
  // Earlier on the clock than the sunset: the next day if it is in the small hours, otherwise it simply ends before the light does.
  return a < 6 * 60 ? 24 * 60 + a - s : 0;
}

export function sky(input: SkyInput | null | undefined, opts: { width: number; height?: number; /** How high the sun climbs, as a share of the height (default 0.47). */ climb?: number }): Sky | null {
  if (!input) return null;
  const rise = minutes(input.sunrise), set = minutes(input.sunset);
  if (rise == null || set == null || set <= rise) return null;
  const { width } = opts;
  const height = opts.height ?? 236;
  const horizon = height - 40;
  const lift = Math.round(height * (opts.climb ?? 0.47));
  const x0 = 44, x1 = width - 44;
  const span = set - rise;
  const unit = (x1 - x0) / span; // pixels a minute

  const at = (u: number): Point => {
    const k = Math.min(1, Math.max(0, u));
    const cx = (x0 + x1) / 2, cy = horizon - 2 * lift;
    return {
      x: (1 - k) ** 2 * x0 + 2 * (1 - k) * k * cx + k ** 2 * x1,
      y: (1 - k) ** 2 * horizon + 2 * (1 - k) * k * cy + k ** 2 * horizon,
    };
  };
  const round = (n: number) => Math.round(n * 10) / 10;
  const along = (a: number, b: number): string => {
    const steps = 28;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const p = at(a + ((b - a) * i) / steps);
      return `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`;
    }).join(' ');
  };

  const from = minutes(input.shootFrom), wrap = minutes(input.wrapAt);
  const wrapMin = wrap != null && from != null && wrap < from ? wrap + 24 * 60 : wrap;
  const inside = (m: number) => (m - rise) / span;

  let work: string | null = null;
  if (from != null && wrapMin != null) {
    const a = Math.min(Math.max(from, rise), set), b = Math.min(Math.max(wrapMin, rise), set);
    if (b > a) work = along(inside(a), inside(b));
  }

  const edge = 8;
  const lateMinutes = wrapMin != null && wrapMin > set ? wrapMin - set : 0;
  const earlyMinutes = from != null && from < rise ? rise - from : 0;
  const sunsetPt = at(1), sunrisePt = at(0);
  const late = lateMinutes ? { from: sunsetPt.x, to: Math.min(width - edge, sunsetPt.x + lateMinutes * unit), y: horizon + 14 } : null;
  const early = earlyMinutes ? { from: sunrisePt.x, to: Math.max(edge, sunrisePt.x - earlyMinutes * unit), y: horizon + 14 } : null;

  const magic = minutes(input.goldenStarts);
  const sun = at(magic != null && magic > rise && magic < set ? inside(magic) : 0.5);

  return {
    width, height, horizon,
    sunrise: { x: sunrisePt.x, y: horizon },
    sunset: { x: sunsetPt.x, y: horizon },
    peak: at(0.5), sun,
    arc: along(0, 1),
    work, late, early, lateMinutes, earlyMinutes,
  };
}

const hm = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, '0')}` : `${n} min`);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const titled = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** The few-word form of a light note, for a stamp, a tag or a line under a sky. lightNoteText is the sentence. */
export function lightNoteBrief(n: LightNote): string {
  switch (n.kind) {
    case 'no-date': return 'Set a date for the light';
    case 'no-place': return `Add where ${titled(n.place)} is`;
    case 'polar': return n.which === 'day' ? 'Sun doesn’t set' : 'Sun doesn’t rise';
    case 'wrap-after-light': return `${hm(minutesPast(n.lightEnds, n.wrap))} past sunset · ${plural(n.scenes, 'exterior')}`;
    case 'call-before-light': {
      const c = minutes(n.call), s = minutes(n.lightStarts);
      return `Call ${hm(c != null && s != null && s > c ? s - c : 0)} before sunrise`;
    }
    case 'night-needs-dark': {
      const w = minutes(n.wrap), d = minutes(n.dark);
      return `Wrap ${hm(w != null && d != null && d > w ? d - w : 0)} before dark · ${plural(n.scenes, 'night exterior')}`;
    }
  }
}
