// Schedule versions, pure: a snapshot of the stripboard (which scene is on which shoot day, and the day dates), the
// comparison of two of them, and what a restore has to change. The order inside a day is the scene number (the board sorts
// by it), so a scene's day is all the order there is to keep. Storage and writes are in schedule-versions-api.ts.

export interface SnapshotScene { id: string; scene_number: number; shoot_day: number }
export interface SnapshotDay { day: number; date: string | null }
export interface ScheduleSnapshot { scenes: SnapshotScene[]; days: SnapshotDay[] }

export interface SceneMove { id: string; scene_number: number; from: number; to: number }
export interface DateChange { day: number; from: string | null; to: string | null }
export interface ScheduleDiff {
  /** Scenes present on both sides that sit on a different day. */
  moved: SceneMove[];
  /** Scenes only on the `to` side (written since the version). */
  added: Array<{ id: string; scene_number: number; day: number }>;
  /** Scenes only on the `from` side (gone since the version). */
  removed: Array<{ id: string; scene_number: number; day: number }>;
  dates: DateChange[];
  same: boolean;
}

/** An unscheduled scene is on day 1, as the board draws it. */
const dayOf = (n: number | null | undefined) => (typeof n === 'number' && Number.isInteger(n) && n >= 1 ? n : 1);

export function takeSnapshot(
  scenes: Array<{ id: string; scene_number: number; shoot_day: number | null }>,
  days: Array<{ day_number: number; shoot_date: string | null }>,
): ScheduleSnapshot {
  return {
    scenes: scenes.map((s) => ({ id: s.id, scene_number: s.scene_number, shoot_day: dayOf(s.shoot_day) })).sort((a, b) => a.scene_number - b.scene_number),
    days: days.map((d) => ({ day: d.day_number, date: d.shoot_date ?? null })).sort((a, b) => a.day - b.day),
  };
}

/** A stored snapshot is jsonb: trust nothing about its shape. Null when it is not one. */
export function parseSnapshot(raw: unknown): ScheduleSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { scenes?: unknown; days?: unknown };
  if (!Array.isArray(o.scenes) || !Array.isArray(o.days)) return null;
  const scenes: SnapshotScene[] = [];
  for (const s of o.scenes) {
    const r = s as Partial<SnapshotScene> | null;
    if (!r || typeof r.id !== 'string' || typeof r.scene_number !== 'number' || typeof r.shoot_day !== 'number') return null;
    scenes.push({ id: r.id, scene_number: r.scene_number, shoot_day: dayOf(r.shoot_day) });
  }
  const days: SnapshotDay[] = [];
  for (const d of o.days) {
    const r = d as Partial<SnapshotDay> | null;
    if (!r || typeof r.day !== 'number' || (r.date != null && typeof r.date !== 'string')) return null;
    days.push({ day: r.day, date: r.date ?? null });
  }
  return { scenes, days };
}

/** What changes going from `from` to `to`. Compare a version with the live board with (version, live); a restore is (live, version). */
export function diffSchedules(from: ScheduleSnapshot, to: ScheduleSnapshot): ScheduleDiff {
  const was = new Map(from.scenes.map((s) => [s.id, s]));
  const now = new Map(to.scenes.map((s) => [s.id, s]));
  const moved: SceneMove[] = [];
  const added: ScheduleDiff['added'] = [];
  const removed: ScheduleDiff['removed'] = [];
  for (const s of to.scenes) {
    const w = was.get(s.id);
    if (!w) added.push({ id: s.id, scene_number: s.scene_number, day: s.shoot_day });
    else if (w.shoot_day !== s.shoot_day) moved.push({ id: s.id, scene_number: s.scene_number, from: w.shoot_day, to: s.shoot_day });
  }
  for (const s of from.scenes) if (!now.has(s.id)) removed.push({ id: s.id, scene_number: s.scene_number, day: s.shoot_day });

  const fromDates = new Map(from.days.map((d) => [d.day, d.date]));
  const toDates = new Map(to.days.map((d) => [d.day, d.date]));
  const dates: DateChange[] = [];
  for (const day of Array.from(new Set([...fromDates.keys(), ...toDates.keys()])).sort((a, b) => a - b)) {
    const a = fromDates.get(day) ?? null;
    const b = toDates.get(day) ?? null;
    if (a !== b) dates.push({ day, from: a, to: b });
  }
  moved.sort((a, b) => a.scene_number - b.scene_number);
  return { moved, added, removed, dates, same: !moved.length && !added.length && !removed.length && !dates.length };
}

/**
 * What restoring `version` onto the `live` board writes: each scene back on its version day, each dated day back to its
 * version date. A day that only exists live keeps its date, and a scene written since the version stays where it is.
 */
export function restorePlan(version: ScheduleSnapshot, live: ScheduleSnapshot): { moves: SceneMove[]; dates: DateChange[]; gone: number } {
  const d = diffSchedules(live, version);
  const dates = d.dates.filter((c) => version.days.some((v) => v.day === c.day));
  // `d.added` are scenes in the version that no longer exist live; they cannot be put back, only counted.
  return { moves: d.moved, dates, gone: d.added.length };
}

/** A one-line account of a diff for a toast or a heading: "3 scenes moved, 1 day date changed". */
export function describeDiff(d: ScheduleDiff): string {
  if (d.same) return 'No difference';
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const parts = [
    d.moved.length ? `${plural(d.moved.length, 'scene')} moved` : '',
    d.added.length ? `${plural(d.added.length, 'scene')} added` : '',
    d.removed.length ? `${plural(d.removed.length, 'scene')} removed` : '',
    d.dates.length ? `${plural(d.dates.length, 'day date')} changed` : '',
  ].filter(Boolean);
  return parts.join(', ');
}
