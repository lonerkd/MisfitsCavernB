// Auto-schedule: pack a script's scenes into shoot days the way a 1st AD would
// start — keep each location together (fewer company moves), shoot day scenes
// before night scenes within a location, and cap each day's page count.

export interface SchedulableScene {
  id: string;
  scene_number: number;
  location: string | null;
  time_of_day: string | null;
  est_duration: string | null;
  shoot_day: number | null;
}

/** Pages are counted in eighths; 40/8 = 5 pages is a typical indie day. */
export const DEFAULT_DAY_CAPACITY_EIGHTHS = 40;

export function eighthsOf(estDuration: string | null | undefined): number {
  const m = String(estDuration ?? '').match(/(\d+)\s*\/\s*8/);
  return m ? Math.max(1, Number(m[1])) : 8;
}

const isNight = (tod: string | null) => /NIGHT|DUSK|EVENING/i.test(tod ?? '');

export interface ShootDayPlan {
  days: number;
  /** Only scenes whose day changes. */
  updates: Array<{ id: string; shoot_day: number }>;
}

export function packShootDays(scenes: SchedulableScene[], capacity = DEFAULT_DAY_CAPACITY_EIGHTHS): ShootDayPlan {
  const groups = new Map<string, SchedulableScene[]>();
  for (const s of scenes) {
    const key = (s.location ?? '').trim().toUpperCase();
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }
  // Biggest locations first; scenes with no location last; ties by first appearance.
  const ordered = Array.from(groups.entries()).sort((a, b) => {
    if (!a[0] !== !b[0]) return a[0] ? -1 : 1;
    return b[1].length - a[1].length || Math.min(...a[1].map((s) => s.scene_number)) - Math.min(...b[1].map((s) => s.scene_number));
  });

  let day = 0;
  let used = 0;
  const updates: ShootDayPlan['updates'] = [];
  for (const [, list] of ordered) {
    list.sort((a, b) => Number(isNight(a.time_of_day)) - Number(isNight(b.time_of_day)) || a.scene_number - b.scene_number);
    let first = true;
    for (const s of list) {
      const e = eighthsOf(s.est_duration);
      if (first || used + e > capacity) { day += 1; used = 0; first = false; }
      used += e;
      if ((s.shoot_day ?? 1) !== day) updates.push({ id: s.id, shoot_day: day });
    }
  }
  return { days: day, updates };
}
