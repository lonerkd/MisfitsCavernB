// Live activities: things that run for a while and that the island should hold while they do — a sprint on
// the clock, a queue waiting for the network, later a call, a recording, an upload. The code that owns the
// work registers an activity and clears it; the island never reaches into the features (the same way
// `emit()` works for brief events). Which one shows is a pure ranking, like `islandMode()`.
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { activityStore, activitySignature } from './activityStore';
import type { Activity } from './activityStore';

export * from './activityStore';

const NONE: readonly Activity[] = [];

/** The running activities, most important first. */
export function useActivities(): readonly Activity[] {
  return useSyncExternalStore(activityStore.subscribe, activityStore.getSnapshot, () => NONE);
}

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
