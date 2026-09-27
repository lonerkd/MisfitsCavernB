// Is a scene ready to shoot? Read from the project's own data — who's cast,
// what the breakdown says is still needed, the shot list, the schedule and
// the references — never ticked by hand. Pure, so the board, tests and any
// future report compute it the same way.

import { castOf } from './stripboard';

export type CheckId = 'cast' | 'elements' | 'shots' | 'date' | 'refs';
export type CheckState = 'done' | 'todo' | 'none';

export interface ReadinessCheck {
  id: CheckId;
  label: string;
  state: CheckState;
  /** What's missing, in a few words ("Cast MAYA, DEV"). Empty when done. */
  detail: string;
  /** References help but don't block a shoot day. */
  optional?: boolean;
}

export type SceneState = 'wrapped' | 'shot' | 'ready' | 'blocked';

export interface SceneReadiness {
  sceneId: string;
  state: SceneState;
  checks: ReadinessCheck[];
  /** Required checks done / required checks that apply. */
  done: number;
  total: number;
  /** The first thing to fix, for the summary line. */
  blocker: ReadinessCheck | null;
}

export interface ReadinessScene {
  id: string;
  status: string | null;
  cast_list: string | null;
  shoot_day: number | null;
}

export interface ReadinessInput {
  /** Character names (upper case) that have someone cast. */
  cast: Set<string>;
  /** Breakdown element statuses tagged in each scene. */
  elementsByScene: Map<string, Array<{ name: string; status: 'needed' | 'sourcing' | 'ready' }>>;
  shotsByScene: Map<string, number>;
  refsByScene: Map<string, number>;
  /** Shoot day → date from its call sheet. */
  dateOfDay: Map<number, string>;
}

const list = (names: string[], max = 3) =>
  names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} +${names.length - max}`;

export function sceneReadiness(scene: ReadinessScene, input: ReadinessInput): SceneReadiness {
  const characters = castOf(scene);
  const uncast = characters.filter((c) => !input.cast.has(c));
  const elements = input.elementsByScene.get(scene.id) ?? [];
  const pending = elements.filter((e) => e.status !== 'ready');
  const shots = input.shotsByScene.get(scene.id) ?? 0;
  const refs = input.refsByScene.get(scene.id) ?? 0;
  const day = scene.shoot_day ?? null;
  const date = day != null ? input.dateOfDay.get(day) : undefined;

  const checks: ReadinessCheck[] = [
    characters.length === 0
      ? { id: 'cast', label: 'Cast', state: 'none', detail: '' }
      : { id: 'cast', label: 'Cast', state: uncast.length ? 'todo' : 'done', detail: uncast.length ? `Cast ${list(uncast)}` : '' },
    elements.length === 0
      ? { id: 'elements', label: 'Breakdown', state: 'todo', detail: 'Not broken down' }
      : {
          id: 'elements', label: 'Breakdown', state: pending.length ? 'todo' : 'done',
          detail: pending.length ? `${pending.length} of ${elements.length} not ready: ${list(pending.map((e) => e.name))}` : '',
        },
    { id: 'shots', label: 'Shots', state: shots > 0 ? 'done' : 'todo', detail: shots > 0 ? '' : 'No shots planned' },
    {
      id: 'date', label: 'Date', state: date ? 'done' : 'todo',
      detail: date ? '' : day != null ? `Day ${day} has no date` : 'Not scheduled',
    },
    { id: 'refs', label: 'References', state: refs > 0 ? 'done' : 'todo', detail: refs > 0 ? '' : 'No references', optional: true },
  ];

  const required = checks.filter((c) => !c.optional && c.state !== 'none');
  const done = required.filter((c) => c.state === 'done').length;
  const blocker = required.find((c) => c.state === 'todo') ?? null;
  const state: SceneState = scene.status === 'wrapped' ? 'wrapped' : scene.status === 'shot' ? 'shot' : blocker ? 'blocked' : 'ready';
  return { sceneId: scene.id, state, checks, done, total: required.length, blocker };
}

export interface ReadinessDay {
  day: number;
  date: string | null;
  scenes: SceneReadiness[];
  ready: number;
  blocked: number;
}

/** Scenes grouped by shoot day (in day order), then the unscheduled. */
export function readinessByDay(scenes: ReadinessScene[], input: ReadinessInput): ReadinessDay[] {
  const byDay = new Map<number, SceneReadiness[]>();
  for (const sc of scenes) {
    const day = sc.shoot_day ?? 0;
    const r = sceneReadiness(sc, input);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(r); else byDay.set(day, [r]);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => (a[0] || Infinity) - (b[0] || Infinity))
    .map(([day, rs]) => ({
      day,
      date: input.dateOfDay.get(day) ?? null,
      scenes: rs,
      ready: rs.filter((r) => r.state === 'ready').length,
      blocked: rs.filter((r) => r.state === 'blocked').length,
    }));
}

/**
 * The shoot day to prepare for: the first dated day from today with scenes
 * still to shoot, else the first undated day with scenes still to shoot.
 */
export function nextShootDay(days: ReadinessDay[], today: string): ReadinessDay | null {
  const open = days.filter((d) => d.day > 0 && d.scenes.some((r) => r.state === 'ready' || r.state === 'blocked'));
  return open.filter((d) => d.date && d.date >= today).sort((a, b) => a.date!.localeCompare(b.date!))[0]
    ?? open.find((d) => !d.date)
    ?? null;
}
