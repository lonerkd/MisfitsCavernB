// The coverage tracker on set (BACKLOG 3.18, graph step 6): from the shots got so far and the time left to the planned wrap, how many more
// shots the day can still get at its own pace, and which scenes the running order will not reach ("at risk"), so the 1st AD can decide what
// to protect, move or drop while there is still time. It forecasts only from what the day has done: with too little shot, it says so.
// Pure.

import type { DayClock } from './onset';

export interface CoverageShot { scene_id: string; status: string | null }
export interface CoverageScene { id: string; scene_number: number; status: string | null }

export interface CoverageInput {
  now: Date;
  clock: DayClock;
  /** Minutes until the planned wrap (null without a planned wrap, or once past it). */
  toWrapMinutes: number | null;
  /** The day's scenes in running order. */
  scenes: CoverageScene[];
  shots: CoverageShot[];
}

export type CoverageState = 'waiting' | 'forecasting-soon' | 'on-pace' | 'behind' | 'done' | 'past-wrap';

export interface Coverage {
  state: CoverageState;
  got: number;
  dropped: number;
  remaining: number;
  /** Shots got per hour of shooting so far (null until there is enough to say). */
  perHour: number | null;
  /** Shots the day can still get at that pace before the planned wrap. */
  canGet: number | null;
  /** Remaining shots the pace will not reach (0 when on pace). */
  short: number;
  /** Scene numbers whose remaining shots fit in what the pace can still get, in running order. */
  protect: number[];
  /** Scene numbers the running order will not reach at this pace. */
  atRisk: number[];
}

const MIN_SHOTS = 2;
const MIN_MINUTES = 30;

/** Minutes rolling so far, lunch taken out. */
export function shootingMinutes(clock: DayClock, now: Date): number {
  if (!clock.rolling) return 0;
  const start = new Date(clock.rolling).getTime();
  const end = clock.wrap ? new Date(clock.wrap).getTime() : now.getTime();
  let lunch = 0;
  if (clock.lunch) {
    const l = new Date(clock.lunch).getTime();
    const b = clock.back && new Date(clock.back).getTime() >= l ? new Date(clock.back).getTime() : end;
    lunch = Math.max(0, Math.min(b, end) - Math.max(l, start));
  }
  return Math.max(0, Math.round((end - start - lunch) / 60000));
}

export function coverage(i: CoverageInput): Coverage {
  const open = i.scenes.filter((sc) => sc.status !== 'wrapped');
  const byScene = new Map<string, CoverageShot[]>();
  for (const sh of i.shots) byScene.set(sh.scene_id, [...(byScene.get(sh.scene_id) ?? []), sh]);
  const dayShots = i.scenes.flatMap((sc) => byScene.get(sc.id) ?? []);
  const got = dayShots.filter((x) => x.status === 'shot').length;
  const dropped = dayShots.filter((x) => x.status === 'omitted').length;
  const remainingIn = (sc: CoverageScene) => (byScene.get(sc.id) ?? []).filter((x) => x.status !== 'shot' && x.status !== 'omitted').length;
  const remaining = open.reduce((n, sc) => n + remainingIn(sc), 0);
  const base = { got, dropped, remaining, perHour: null, canGet: null, short: 0, protect: [] as number[], atRisk: [] as number[] };

  if (remaining === 0 && got > 0) return { ...base, state: 'done' };
  const minutes = shootingMinutes(i.clock, i.now);
  if (!i.clock.rolling || remaining === 0) return { ...base, state: 'waiting' };
  if (i.toWrapMinutes == null) return { ...base, state: i.clock.wrap ? 'done' : 'past-wrap' };
  if (got < MIN_SHOTS || minutes < MIN_MINUTES) return { ...base, state: 'forecasting-soon' };

  const perHour = got / (minutes / 60);
  const canGet = Math.floor(perHour * (i.toWrapMinutes / 60));
  const protect: number[] = [];
  const atRisk: number[] = [];
  let used = 0;
  for (const sc of open) {
    const need = remainingIn(sc);
    if (need === 0) continue;
    used += need;
    (used <= canGet ? protect : atRisk).push(sc.scene_number);
  }
  const short = Math.max(0, remaining - canGet);
  return { ...base, state: short > 0 ? 'behind' : 'on-pace', perHour: Math.round(perHour * 10) / 10, canGet, short, protect, atRisk };
}
