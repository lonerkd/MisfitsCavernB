// The stripboard, pure: each shoot day as a column of strips, with what a
// 1st AD checks at a glance — pages against the day's length, how many
// locations (company moves), who's called — and the Day-out-of-Days grid.

import { eighthsOf } from './shoot-days';

export interface StripScene {
  id: string;
  scene_number: number;
  heading?: string | null;
  title?: string | null;
  location: string | null;
  time_of_day: string | null;
  est_duration: string | null;
  cast_list: string | null;
  shoot_day: number | null;
  status?: string | null;
}

/** The industry strip colours: white INT day, yellow EXT day, blue INT night, green EXT night. */
export type StripKind = 'int-day' | 'ext-day' | 'int-night' | 'ext-night';

export function stripKind(s: Pick<StripScene, 'heading' | 'title' | 'location' | 'time_of_day'>): StripKind {
  const head = `${s.heading ?? s.title ?? ''}`.toUpperCase();
  const ext = /^\s*(\d+[A-Z]?\s+)?(EXT|E\/I|EXT\.?\/INT)/.test(head) || (/\bEXT\b/.test(head) && !/\bINT\b/.test(head));
  const night = /NIGHT|DUSK|EVENING|DARK/i.test(s.time_of_day ?? '') || /\b(NIGHT|DUSK|EVENING)\b/.test(head);
  return `${ext ? 'ext' : 'int'}-${night ? 'night' : 'day'}` as StripKind;
}

export const STRIP_LABEL: Record<StripKind, string> = {
  'int-day': 'INT · DAY', 'ext-day': 'EXT · DAY', 'int-night': 'INT · NIGHT', 'ext-night': 'EXT · NIGHT',
};

export function castOf(s: Pick<StripScene, 'cast_list'>): string[] {
  return (s.cast_list ?? '').split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
}

const locationKey = (s: StripScene) => (s.location ?? '').trim().toUpperCase();

export interface BoardDay {
  day: number;
  scenes: StripScene[];
  eighths: number;
  /** Distinct locations, in shooting order. More than one means a company move. */
  locations: string[];
  cast: string[];
  over: boolean;
}

/**
 * Days 1…last, including empty ones (a gap is a real day off the board until
 * something moves into it), each with its strips in scene order.
 */
export function buildBoard(scenes: StripScene[], capacityEighths: number): BoardDay[] {
  const last = scenes.reduce((m, s) => Math.max(m, s.shoot_day ?? 1), 0);
  return Array.from({ length: last }, (_, i) => {
    const day = i + 1;
    const list = scenes.filter((s) => (s.shoot_day ?? 1) === day).sort((a, b) => a.scene_number - b.scene_number);
    const eighths = list.reduce((n, s) => n + eighthsOf(s.est_duration), 0);
    const locations = Array.from(new Set(list.map(locationKey).filter(Boolean)));
    const cast = Array.from(new Set(list.flatMap(castOf))).sort();
    return { day, scenes: list, eighths, locations, cast, over: eighths > capacityEighths };
  });
}

/** Eighths as a page count the way a schedule writes it: 1 3/8, 7/8, 2. */
export function pages(eighths: number): string {
  const whole = Math.floor(eighths / 8);
  const rest = eighths % 8;
  if (!rest) return String(whole);
  return whole ? `${whole} ${rest}/8` : `${rest}/8`;
}

export type DoodCode = 'S' | 'W' | 'H' | 'F' | 'SF' | '';

/**
 * Day out of days: for each cast member, per day — Start, Work, Hold (between
 * work days, still on the payroll), Finish, SF (start and finish the same day).
 */
export function dayOutOfDays(board: BoardDay[]): Array<{ name: string; cells: DoodCode[]; worked: number }> {
  const names = Array.from(new Set(board.flatMap((d) => d.cast))).sort();
  return names
    .map((name) => {
      const on = board.map((d) => d.cast.includes(name));
      const first = on.indexOf(true);
      const last = on.lastIndexOf(true);
      const cells = on.map((w, i): DoodCode => {
        if (!w) return i > first && i < last ? 'H' : '';
        if (i === first && i === last) return 'SF';
        if (i === first) return 'S';
        if (i === last) return 'F';
        return 'W';
      });
      return { name, cells, worked: on.filter(Boolean).length };
    })
    .sort((a, b) => b.worked - a.worked || a.name.localeCompare(b.name));
}
