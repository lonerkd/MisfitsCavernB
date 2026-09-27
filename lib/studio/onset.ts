// On set: the shoot day as the crew live it. Which day it is (today's call
// sheet, else the next one), the day's clock from the stamps the crew tap
// (call, rolling, lunch, back in, wrap — the latest stamp of each wins), time
// on set against the planned wrap, and how much of the day's work is done.

export type ClockKind = 'call' | 'rolling' | 'lunch' | 'back' | 'wrap';

export const CLOCK: Array<{ kind: ClockKind; label: string }> = [
  { kind: 'call', label: 'Crew call' },
  { kind: 'rolling', label: 'Rolling' },
  { kind: 'lunch', label: 'Lunch' },
  { kind: 'back', label: 'Back in' },
  { kind: 'wrap', label: 'Wrap' },
];

export interface DaySheet { id: string; shoot_day: number; shoot_date: string | null }
export type DayWhen = 'today' | 'next' | 'last' | 'undated';

/** The day to show: today's, else the next dated one, else the last one shot, else the first. */
export function pickDay<T extends DaySheet>(sheets: T[], today: string): { sheet: T; when: DayWhen } | null {
  if (!sheets.length) return null;
  const dated = sheets.filter((s) => s.shoot_date).sort((a, b) => a.shoot_date!.localeCompare(b.shoot_date!) || a.shoot_day - b.shoot_day);
  const now = dated.find((s) => s.shoot_date === today);
  if (now) return { sheet: now, when: 'today' };
  const next = dated.find((s) => s.shoot_date! > today);
  if (next) return { sheet: next, when: 'next' };
  if (dated.length) return { sheet: dated[dated.length - 1], when: 'last' };
  return { sheet: [...sheets].sort((a, b) => a.shoot_day - b.shoot_day)[0], when: 'undated' };
}

export type DayClock = Record<ClockKind, string | null>;

/** The latest stamp of each kind (ISO times). */
export function dayClock(rows: Array<{ kind: string; at: string }>): DayClock {
  const clock: DayClock = { call: null, rolling: null, lunch: null, back: null, wrap: null };
  for (const r of rows) {
    if (!(r.kind in clock)) continue;
    const k = r.kind as ClockKind;
    if (!clock[k] || r.at > clock[k]!) clock[k] = r.at;
  }
  return clock;
}

export type DayPhase = 'before' | 'prep' | 'shooting' | 'lunch' | 'wrapped';

export interface DayStatus {
  phase: DayPhase;
  /** Minutes from crew call to wrap (or now), lunch excluded. */
  onSetMinutes: number;
  /** Minutes past the planned wrap (0 when not over). */
  overtimeMinutes: number;
  /** Minutes until the planned wrap (null without one, or once past it). */
  toWrapMinutes: number | null;
}

const minutes = (a: number, b: number) => Math.max(0, Math.round((b - a) / 60000));

/** Where the day is, from its clock; `plannedWrap` is the call sheet's estimated wrap as a local time on the day. */
export function dayStatus(clock: DayClock, now: Date, plannedWrap: Date | null): DayStatus {
  const t = (iso: string | null) => (iso ? new Date(iso).getTime() : null);
  const call = t(clock.call);
  const wrap = t(clock.wrap);
  const lunch = t(clock.lunch);
  const back = t(clock.back);
  const end = wrap ?? now.getTime();
  const onLunch = lunch != null && (back == null || back < lunch) && wrap == null;
  const lunchMinutes = lunch != null ? minutes(lunch, onLunch ? end : back ?? lunch) : 0;

  let phase: DayPhase = 'before';
  if (wrap != null && (call == null || wrap >= call)) phase = 'wrapped';
  else if (onLunch) phase = 'lunch';
  else if (clock.rolling) phase = 'shooting';
  else if (call != null) phase = 'prep';

  const over = plannedWrap ? minutes(plannedWrap.getTime(), end) : 0;
  return {
    phase,
    onSetMinutes: call != null ? Math.max(0, minutes(call, end) - lunchMinutes) : 0,
    overtimeMinutes: over,
    toWrapMinutes: plannedWrap && !over && phase !== 'wrapped' ? minutes(end, plannedWrap.getTime()) : null,
  };
}

/** "2026-10-03" + "19:30:00" → that local time. */
export function localDateTime(date: string | null, time: string | null): Date | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "3/8 pg" → 3. */
export function eighthsOf(est: string | null | undefined): number {
  const m = /(\d+)\s*\/\s*8/.exec(est ?? '');
  return m ? Number(m[1]) : 0;
}

export interface DayProgress {
  scenes: number; scenesDone: number;
  eighths: number; eighthsDone: number;
  shots: number; shotsDone: number; shotsOmitted: number;
}

/** The day's work: scenes wrapped (and their page count), shots shot or dropped. */
export function dayProgress(
  scenes: Array<{ id: string; est_duration: string | null; status: string }>,
  shots: Array<{ scene_id: string; status: string | null }>,
): DayProgress {
  const ids = new Set(scenes.map((s) => s.id));
  const done = (st: string) => st === 'wrapped' || st === 'shot';
  const dayShots = shots.filter((s) => ids.has(s.scene_id));
  return {
    scenes: scenes.length,
    scenesDone: scenes.filter((s) => done(s.status)).length,
    eighths: scenes.reduce((n, s) => n + eighthsOf(s.est_duration), 0),
    eighthsDone: scenes.filter((s) => done(s.status)).reduce((n, s) => n + eighthsOf(s.est_duration), 0),
    shots: dayShots.length,
    shotsDone: dayShots.filter((s) => s.status === 'shot').length,
    shotsOmitted: dayShots.filter((s) => s.status === 'omitted').length,
  };
}

/** 135 → "2h 15m"; 40 → "40m". */
export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${String(r).padStart(2, '0')}m` : `${r}m`;
}
