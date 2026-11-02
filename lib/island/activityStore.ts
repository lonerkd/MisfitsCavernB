// The activity store, with no React in it so any module (an upload helper, a data layer) can register work on the
// island without pulling client-only hooks into a server bundle. The hooks that read it live in `activities.ts`.
export type ActivityKind = 'call' | 'recording' | 'upload' | 'sync' | 'timer' | 'music' | 'notice';
export type ActivityTone = 'info' | 'warn' | 'error' | 'busy';

export interface ActivityControl {
  id: string;
  label: string;
  run: () => void;
}

export interface Activity {
  /** One per piece of work: registering the same id again replaces it. */
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  tone?: ActivityTone;
  /** Higher shows first. Defaults by kind. */
  priority?: number;
  /** 0 to 1 when the work can say how far along it is. */
  progress?: number;
  controls?: ActivityControl[];
}

/** What matters most when several run at once: the person's voice and data before the clock and the music. */
export const KIND_PRIORITY: Record<ActivityKind, number> = {
  call: 90, recording: 80, upload: 60, sync: 50, timer: 40, music: 30, notice: 20,
};

export const priorityOf = (a: Pick<Activity, 'kind' | 'priority'>): number => a.priority ?? KIND_PRIORITY[a.kind];

/** Most important first; ties by id so the order never flickers. */
export function rankActivities(list: readonly Activity[]): Activity[] {
  return [...list].sort((x, y) => priorityOf(y) - priorityOf(x) || x.id.localeCompare(y.id));
}

/** Progress is a fraction; anything else is dropped rather than drawn wrong. */
const cleanProgress = (p: unknown): number | undefined => (typeof p === 'number' && Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : undefined);

export function createActivityStore() {
  const byId = new Map<string, Activity>();
  const listeners = new Set<() => void>();
  let snapshot: readonly Activity[] = [];

  const publish = () => {
    snapshot = rankActivities([...byId.values()]);
    listeners.forEach((l) => l());
  };

  return {
    /** Add the activity, or replace the one with this id. */
    set(activity: Activity) {
      byId.set(activity.id, { ...activity, progress: cleanProgress(activity.progress) });
      publish();
    },
    clear(id: string) {
      if (byId.delete(id)) publish();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** Ranked, and the same array until something changes (what useSyncExternalStore needs). */
    getSnapshot: (): readonly Activity[] => snapshot,
  };
}

/** The island's one store. */
export const activityStore = createActivityStore();


/** What changes how an activity looks or what its buttons are (not what they do: the latest `run` is always the one called). */
export const activitySignature = (a: Activity): string => JSON.stringify([
  a.id, a.kind, a.title, a.detail ?? null, a.tone ?? null, a.priority ?? null, a.progress ?? null,
  (a.controls ?? []).map((c) => [c.id, c.label]),
]);

