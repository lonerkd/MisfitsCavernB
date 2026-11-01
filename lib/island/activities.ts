// Live activities: things that run for a while and that the island should hold while they do — a sprint on
// the clock, a queue waiting for the network, later a call, a recording, an upload. The code that owns the
// work registers an activity and clears it; the island never reaches into the features (the same way
// `emit()` works for brief events). Which one shows is a pure ranking, like `islandMode()`.
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';

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

const NONE: readonly Activity[] = [];

/** The running activities, most important first. */
export function useActivities(): readonly Activity[] {
  return useSyncExternalStore(activityStore.subscribe, activityStore.getSnapshot, () => NONE);
}

/** What changes how an activity looks or what its buttons are (not what they do: the latest `run` is always the one called). */
export const activitySignature = (a: Activity): string => JSON.stringify([
  a.id, a.kind, a.title, a.detail ?? null, a.tone ?? null, a.priority ?? null, a.progress ?? null,
  (a.controls ?? []).map((c) => [c.id, c.label]),
]);

/**
 * Hold an activity on the island for as long as `activity` is non-null (clears itself when it turns null,
 * its id changes, or the component goes away). Buttons call the latest `run`, so the owner can pass fresh
 * closures every render without the island re-registering.
 */
export function useActivity(activity: Activity | null): void {
  const latest = useRef(activity);
  useLayoutEffect(() => { latest.current = activity; });
  const id = activity?.id ?? null;
  const signature = activity ? activitySignature(activity) : null;

  useEffect(() => {
    const current = latest.current;
    if (!current || signature === null) return;
    activityStore.set({
      ...current,
      controls: current.controls?.map((c) => ({ ...c, run: () => latest.current?.controls?.find((x) => x.id === c.id)?.run() })),
    });
  }, [signature]);

  useEffect(() => {
    if (id === null) return;
    return () => activityStore.clear(id);
  }, [id]);
}
